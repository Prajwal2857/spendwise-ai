import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/spendwise";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer: unknown | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null, memoryServer: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function startMemoryServer() {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const memServer = await MongoMemoryServer.create();
  const uri = memServer.getUri();
  console.log(`✅ In-memory MongoDB started at: ${uri}`);
  return { uri, memServer };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  // Try real MongoDB first
  try {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 3000,
    });
    cached.conn = await cached.promise;
    console.log("✅ Connected to MongoDB");
    return cached.conn;
  } catch {
    console.log("⚠️ MongoDB not available, starting in-memory server...");
  }

  // Fall back to in-memory MongoDB
  try {
    const { uri, memServer } = await startMemoryServer();
    cached.memoryServer = memServer;
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
    cached.conn = await cached.promise;
    console.log("✅ Using in-memory MongoDB");
    return cached.conn;
  } catch (e) {
    console.error("❌ Failed to start in-memory MongoDB:", e);
    throw e;
  }
}
