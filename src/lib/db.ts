import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

interface MongooseCache {
  isConnected?: boolean;
}

const cached: MongooseCache = {};

export async function connectToDatabase() {
  if (cached.isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });

    cached.isConnected = !!db.connections[0].readyState;
  } catch (e) {
    throw e;
  }
}

export default connectToDatabase; 