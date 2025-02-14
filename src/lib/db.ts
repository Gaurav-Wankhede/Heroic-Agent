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

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Ensure MONGODB_URI is defined
const dbUri: string = MONGODB_URI as string;
let isConnected = false;

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  if (isConnected) {
    console.log('Using existing connection');
    return mongoose;
  }

  try {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      maxPoolSize: 1,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
      maxIdleTimeMS: 8000,
      compressors: "zlib"
    };

    console.log('Creating new connection');
    await mongoose.connect(dbUri, opts);
    isConnected = true;
    console.log('Connected to MongoDB');
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });

    return mongoose;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    isConnected = false;
    return null;
  }
}

// Handle graceful shutdown
if (process.env.NODE_ENV !== 'development') {
  process.on('SIGTERM', async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
    }
    process.exit(0);
  });
}

export default connectToDatabase; 