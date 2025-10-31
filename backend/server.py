from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from dotenv import load_dotenv
import asyncio
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'ciphercast')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class MessageEnvelope(BaseModel):
    recipientDeviceId: str
    senderEphemeralPubKey: str  # base64
    wrappedCk: str  # base64
    wrappedCkIv: str = ""  # base64 IV for wrapped CK
    wrapAlg: str = "X25519+HKDF+AESGCM"

class MessageCreate(BaseModel):
    senderDeviceId: str
    kind: str = "sealed"
    ciphertext: str  # base64
    nonce: str  # base64
    envelopes: List[MessageEnvelope]

class DeviceRegister(BaseModel):
    userId: str
    deviceId: str
    handleHash: str
    identityPubKey: str  # base64

class Device(BaseModel):
    id: str = Field(alias="_id")
    identityPubKey: str

    class Config:
        populate_by_name = True

class ResolveResponse(BaseModel):
    userId: str
    devices: List[Device]

# Validation helper
def is_valid_b64(s: str, max_len: int = 200000) -> bool:
    if not isinstance(s, str) or len(s) == 0 or len(s) > max_len:
        return False
    # Basic base64 validation
    try:
        base64.b64decode(s, validate=True)
        return True
    except:
        return False

# KDS Routes
@api_router.post("/kds/registerDevice")
async def register_device(body: DeviceRegister):
    if not is_valid_b64(body.identityPubKey, 200):
        raise HTTPException(status_code=400, detail="invalid_identity_pubkey")
    
    # Upsert user
    await db.users.update_one(
        {"_id": body.userId},
        {
            "$setOnInsert": {
                "_id": body.userId,
                "handleHash": body.handleHash,
                "createdAt": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # Upsert device
    await db.devices.update_one(
        {"_id": body.deviceId},
        {
            "$setOnInsert": {
                "_id": body.deviceId,
                "userId": body.userId,
                "identityPubKey": body.identityPubKey,
                "status": "active",
                "createdAt": datetime.utcnow()
            },
            "$set": {
                "lastSeenAt": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    logging.info(f"kds: register device {body.deviceId}")
    return {"ok": True}

@api_router.get("/kds/resolve")
async def resolve_devices(handleHash: str):
    if not handleHash:
        raise HTTPException(status_code=400, detail="missing_handle_hash")
    
    user = await db.users.find_one({"handleHash": handleHash})
    if not user:
        return {"devices": []}
    
    devices_cursor = db.devices.find(
        {"userId": user["_id"], "status": "active"},
        {"_id": 1, "identityPubKey": 1}
    )
    devices = await devices_cursor.to_list(length=100)
    
    return {
        "userId": user["_id"],
        "devices": devices
    }

# Message Routes
@api_router.post("/message")
async def post_message(body: MessageCreate):
    # Validate
    if not body.senderDeviceId or body.kind != "sealed":
        raise HTTPException(status_code=400, detail="invalid_message_payload")
    
    if not is_valid_b64(body.ciphertext) or not is_valid_b64(body.nonce):
        raise HTTPException(status_code=400, detail="invalid_ciphertext")
    
    if not body.envelopes or len(body.envelopes) == 0:
        raise HTTPException(status_code=400, detail="no_envelopes")
    
    for env in body.envelopes:
        if not is_valid_b64(env.senderEphemeralPubKey) or not is_valid_b64(env.wrappedCk):
            raise HTTPException(status_code=400, detail="invalid_envelope")
    
    # Store message
    msg_id = str(uuid.uuid4())
    doc = {
        "_id": msg_id,
        "senderDeviceId": body.senderDeviceId,
        "kind": body.kind,
        "ciphertext": body.ciphertext,
        "nonce": body.nonce,
        "envelopes": [env.dict() for env in body.envelopes],
        "createdAt": datetime.utcnow()
    }
    
    await db.messages.insert_one(doc)
    
    # Broadcast to WebSocket clients
    await manager.broadcast({"type": "new_message", "id": msg_id})
    
    logging.info(f"message: posted {msg_id}")
    return {"id": msg_id}

# Feed Route
@api_router.get("/feed")
async def get_feed(cursor: Optional[str] = None):
    query = {}
    if cursor:
        try:
            cursor_date = datetime.fromisoformat(cursor)
            query["createdAt"] = {"$lt": cursor_date}
        except:
            pass
    
    messages_cursor = db.messages.find(
        query,
        {"_id": 1, "senderDeviceId": 1, "kind": 1, "ciphertext": 1, "nonce": 1, "envelopes": 1, "createdAt": 1}
    ).sort("createdAt", -1).limit(50)
    
    items = await messages_cursor.to_list(length=50)
    
    next_cursor = None
    if items:
        next_cursor = items[-1]["createdAt"].isoformat()
    
    return {
        "items": items,
        "nextCursor": next_cursor
    }

# WebSocket Route
@app.websocket("/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json({"type": "hello", "ts": datetime.utcnow().isoformat()})
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            # Echo or handle client messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Include the router in the main app
app.include_router(api_router)

# Create indexes on startup
@app.on_event("startup")
async def create_indexes():
    await db.users.create_index("handleHash", unique=True)
    await db.devices.create_index("userId")
    await db.devices.create_index("identityPubKey", unique=True)
    await db.messages.create_index([("createdAt", -1)])
    logging.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
