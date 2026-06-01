import mongoose, { Connection } from 'mongoose';

// Cache the connection to prevent multiple connections during hot reloads
let _cachedConnection: Connection | null = null;

interface MongoConnection {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

declare global {
  var mongoose: MongoConnection | undefined;
}

const cached: MongoConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectToDatabase(): Promise<{ db: any; client: any }> {
  if (cached.conn) {
    // Return the native MongoClient (not the mongoose Connection wrapper) so
    // callers can use `client.startSession()` / transactions correctly. The
    // mongoose Connection's startSession returns a Promise in mongoose 8+,
    // which breaks `withTransaction` / `endSession` in lib/transactions.ts.
    return { db: cached.conn.db, client: cached.conn.getClient() };
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined');
    }

    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
    return { db: cached.conn.db, client: cached.conn.getClient() };
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}
