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
  isConnected?: boolean;
  conn?: typeof mongoose;
}

const cached: MongooseCache = {};

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI not found, using fallback data');
    return null;
  }

  if (cached.isConnected && cached.conn) {
    console.log('Using cached database connection');
    return cached.conn;
  }

  try {
    console.log('Connecting to MongoDB...', process.env.NODE_ENV);
    
    // Clear any existing connections
    if (mongoose.connections.length > 0) {
      const connection = mongoose.connections[0];
      if (connection.readyState !== 1) {
        await mongoose.disconnect();
      }
    }

    // Optimized connection options for serverless
    const opts: ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // 5 seconds
      socketTimeoutMS: 10000, // 10 seconds
      connectTimeoutMS: 10000, // 10 seconds
      maxPoolSize: 2, // Reduced pool size for serverless
      minPoolSize: 1,
      retryWrites: true,
      heartbeatFrequencyMS: 5000, // More frequent heartbeats
      autoCreate: false, // Don't auto-create collections
    };

    // Connect with new options
    const db = await mongoose.connect(MONGODB_URI, opts);
    
    // Add connection error handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cached.isConnected = false;
      cached.conn = undefined;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      cached.isConnected = false;
      cached.conn = undefined;
    });

    cached.isConnected = db.connections[0].readyState === 1;
    cached.conn = mongoose;

    return cached.conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return null; // Return null to trigger fallback data
  }
}

export default connectToDatabase; 