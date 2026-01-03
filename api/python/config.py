"""Configuration for Taste of Gratitude API"""
import os
from dotenv import load_dotenv
from square.client import Client

load_dotenv()

SQUARE_ENVIRONMENT = os.getenv("SQUARE_ENVIRONMENT", "sandbox")
SQUARE_ACCESS_TOKEN = os.getenv("SQUARE_ACCESS_TOKEN", "")
SQUARE_APPLICATION_ID = os.getenv("SQUARE_APPLICATION_ID", "")
SQUARE_LOCATION_ID = os.getenv("SQUARE_LOCATION_ID", "")

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

def get_square_client() -> Client:
    """Initialize and return Square client"""
    return Client(
        access_token=SQUARE_ACCESS_TOKEN,
        environment=SQUARE_ENVIRONMENT,
    )

square_client = get_square_client()
