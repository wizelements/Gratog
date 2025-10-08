import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'taste_of_gratitude';

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getAdminUsers() {
  const { db } = await connectToDatabase();
  return db.collection('admin_users');
}

export async function getInventory() {
  const { db } = await connectToDatabase();
  return db.collection('inventory');
}

export async function getOrders() {
  const { db } = await connectToDatabase();
  return db.collection('orders');
}

export async function getAnalytics() {
  const { db } = await connectToDatabase();
  return db.collection('analytics');
}
