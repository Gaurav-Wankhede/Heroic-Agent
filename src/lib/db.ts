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
    console.warn('MONGODB_URI not found in environment variables');
    throw new Error('MONGODB_URI not found');
  }

  if (cached.isConnected && cached.conn) {
    console.log('Using cached database connection');
    return cached.conn;
  }

  try {
    console.log('Connecting to MongoDB...', process.env.NODE_ENV);
    
    // Parse and sanitize the connection string
    const uri = MONGODB_URI.includes('mongodb+srv') ? 
      MONGODB_URI : 
      `mongodb+srv://${MONGODB_URI}`;

    const opts: ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Increased timeout for production
      socketTimeoutMS: 60000, // Increased for production
      connectTimeoutMS: 30000, // Increased for production
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      autoCreate: true,
      heartbeatFrequencyMS: 30000,
    };

    // Clear any existing connections
    if (mongoose.connections.length > 0) {
      const connection = mongoose.connections[0];
      if (connection.readyState !== 1) {
        await mongoose.disconnect();
      }
    }

    // Connect with new options
    const db = await mongoose.connect(uri, opts);
    
    // Add connection error handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cached.isConnected = false;
      cached.conn = undefined;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
      cached.isConnected = false;
      cached.conn = undefined;
    });

    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully');
      cached.isConnected = true;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
      cached.isConnected = true;
    });

    cached.isConnected = db.connections[0].readyState === 1;
    cached.conn = mongoose;

    console.log('Database connection established');
    return cached.conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    cached.isConnected = false;
    cached.conn = undefined;
    throw new Error(`Unable to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default connectToDatabase; 