import mongoose, { Connection } from 'mongoose';
import { assertPreviewDatabaseIsolation } from './preview-db-isolation';
import { assertMongoCheckoutProvider } from './database/checkout-provider-guard';

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
  assertMongoCheckoutProvider();
  // Guard BEFORE returning a cached connection: a Preview may never use the
  // Production database, even after a worker has established a connection.
  const isolatedPreviewDb = assertPreviewDatabaseIsolation();

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
      // Select the isolated test DB without changing the MongoDB credential
      // URI, its authentication source, or any Production configuration.
      ...(isolatedPreviewDb ? { dbName: isolatedPreviewDb } : {}),
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
