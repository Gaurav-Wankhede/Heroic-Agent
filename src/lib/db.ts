import mongoose, { ConnectOptions } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Fallback data for when database is not available
export const fallbackTestimonials = [
  {
    _id: '1',
    name: 'John Doe',
    role: 'Data Scientist',
    content: 'Amazing tool for data science tasks! The AI assistance is incredibly helpful.',
    rating: 5,
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/johndoe',
      github: 'https://github.com/johndoe'
    },
    timestamp: new Date().toISOString()
  },
  {
    _id: '2',
    name: 'Jane Smith',
    role: 'ML Engineer',
    content: 'The machine learning features are outstanding. Great for model development!',
    rating: 5,
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/janesmith',
      github: 'https://github.com/janesmith'
    },
    timestamp: new Date().toISOString()
  }
];

interface MongooseCache {
  promise?: Promise<typeof mongoose>;
  conn?: typeof mongoose;
  isConnected?: boolean;
}

const cached: MongooseCache = {};

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const uri: string = MONGODB_URI;

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  try {
    if (cached.conn && cached.isConnected) {
      return cached.conn;
    }

    const opts: ConnectOptions = {
      bufferCommands: true,
      serverSelectionTimeoutMS: 5000, // Reduced to 5s
      socketTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 5,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 5000,
      family: 4
    };

    if (!cached.promise) {
      const connectionPromise = mongoose.connect(uri, opts);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 8000); // 8s timeout
      });

      cached.promise = Promise.race([connectionPromise, timeoutPromise]) as Promise<typeof mongoose>;
    }

    try {
      cached.conn = await cached.promise;
      cached.isConnected = true;

      mongoose.connection.on('connected', () => {
        cached.isConnected = true;
      });

      mongoose.connection.on('error', () => {
        cached.isConnected = false;
        cached.promise = undefined;
      });

      mongoose.connection.on('disconnected', () => {
        cached.isConnected = false;
        cached.promise = undefined;
      });

      return cached.conn;
    } catch (error) {
      cached.promise = undefined;
      throw error;
    }
  } catch (error) {
    cached.isConnected = false;
    return null;
  }
}

export default connectToDatabase; 