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

// Ensure MONGODB_URI is defined
const uri: string = MONGODB_URI;

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  try {
    if (cached.conn && cached.isConnected) {
      console.log('Using cached database connection');
      return cached.conn;
    }

    const opts: ConnectOptions = {
      bufferCommands: true, // Enable command buffering
      serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 10000,
      family: 4,
      autoCreate: true, // Allow auto-creation of collections
      autoIndex: true, // Build indexes
    };

    if (!cached.promise) {
      cached.promise = mongoose.connect(uri, opts);
    }

    try {
      cached.conn = await cached.promise;
      cached.isConnected = true;
      console.log('New database connection established');

      // Add connection event handlers
      mongoose.connection.on('connected', () => {
        console.log('MongoDB connected successfully');
        cached.isConnected = true;
      });

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        cached.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
        cached.isConnected = false;
      });

      // Handle process termination
      process.on('SIGTERM', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
      });

      return cached.conn;
    } catch (error) {
      cached.promise = undefined; // Reset promise on error
      throw error; // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    cached.isConnected = false;
    return null;
  }
}

export default connectToDatabase; 