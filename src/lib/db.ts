import mongoose from 'mongoose';

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
    throw new Error('MONGODB_URI not found');
  }

  if (cached.isConnected) {
    console.log('Using cached database connection');
    return cached.conn;
  }

  try {
    console.log('Connecting to MongoDB...');
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 5,
    };

    const db = await mongoose.connect(MONGODB_URI, opts);
    
    // Add connection error handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cached.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
      cached.isConnected = false;
    });

    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully');
      cached.isConnected = true;
    });

    cached.isConnected = !!db.connections[0].readyState;
    cached.conn = mongoose;

    return cached.conn;
  } catch (e) {
    console.error('MongoDB connection error:', e);
    cached.isConnected = false;
    throw new Error('Unable to connect to database');
  }
}

export default connectToDatabase; 