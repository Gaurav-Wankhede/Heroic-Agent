import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

interface MongooseCache {
  isConnected?: boolean;
  conn?: typeof mongoose;
}

const cached: MongooseCache = {};

export async function connectToDatabase() {
  if (cached.isConnected) {
    return cached.conn;
  }

  try {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds timeout
      connectTimeoutMS: 10000, // 10 seconds timeout
      maxPoolSize: 10,
      minPoolSize: 5,
    };

    const db = await mongoose.connect(MONGODB_URI, opts);
    cached.isConnected = !!db.connections[0].readyState;
    cached.conn = mongoose;

    // Add connection error handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cached.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
      cached.isConnected = false;
    });

    return cached.conn;
  } catch (e) {
    cached.isConnected = false;
    console.error('MongoDB connection error:', e);
    throw new Error('Unable to connect to database');
  }
}

export default connectToDatabase; 