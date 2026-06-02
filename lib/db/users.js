import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db();
  cachedDb = db;
  return db;
}

let indexesCreated = false;

async function ensureIndexesOnce() {
  if (indexesCreated) return;
  const db = await connectToDatabase();
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true, background: true });
    await db.collection('users').createIndex({ id: 1 }, { unique: true, background: true });
    indexesCreated = true;
  } catch (e) {
    // Indexes may already exist, that's fine
    indexesCreated = true;
  }
}

/**
 * Create new user
 */
export async function createUser({ name, email, passwordHash, phone = null, avatar = null }) {
  await ensureIndexesOnce();
  const db = await connectToDatabase();
  const usersCollection = db.collection('users');

  // Check if email already exists
  const existingUser = await usersCollection.findOne({ email });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const user = {
    id: uuidv4(),
    name,
    email,
    passwordHash,
    phone,
    avatar,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await usersCollection.insertOne(user);

  // Remove passwordHash from returned object
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email) {
  await ensureIndexesOnce();
  const db = await connectToDatabase();
  const usersCollection = db.collection('users');
  return usersCollection.findOne({ email });
}

/**
 * Find user by ID
 */
export async function findUserById(userId) {
  await ensureIndexesOnce();
  const db = await connectToDatabase();
  const usersCollection = db.collection('users');
  const user = await usersCollection.findOne({ id: userId });
  
  if (user) {
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  return null;
}

/**
 * Update user profile
 */
export async function updateUser(userId, updates) {
  const db = await connectToDatabase();
  const usersCollection = db.collection('users');

  const allowedUpdates = ['name', 'phone', 'avatar'];
  const filteredUpdates = {};
  
  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  filteredUpdates.updatedAt = new Date();

  await usersCollection.updateOne(
    { id: userId },
    { $set: filteredUpdates }
  );

  return findUserById(userId);
}

/**
 * Initialize rewards for new user
 */
export async function initializeUserRewards(userId) {
  const db = await connectToDatabase();
  const rewardsCollection = db.collection('rewards');

  const reward = {
    id: uuidv4(),
    userId,
    points: 0,
    lifetimePoints: 0,
    history: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await rewardsCollection.insertOne(reward);
  return reward;
}

/**
 * Initialize challenge for new user
 */
export async function initializeUserChallenge(userId) {
  const db = await connectToDatabase();
  const challengesCollection = db.collection('challenges');

  const challenge = {
    id: uuidv4(),
    userId,
    streakDays: 0,
    lastCheckIn: null,
    totalCheckIns: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await challengesCollection.insertOne(challenge);
  return challenge;
}
