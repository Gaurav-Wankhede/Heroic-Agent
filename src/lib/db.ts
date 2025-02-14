import mongoose from 'mongoose';

const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER;
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION;

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

// Validate environment variables
if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_CLUSTER || !MONGODB_COLLECTION) {
  throw new Error(
    'Please define all MongoDB environment variables: USERNAME, PASSWORD, CLUSTER, and COLLECTION'
  );
}

// Construct MongoDB URI with appName
const dbUri = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority&appName=${MONGODB_COLLECTION}`;
console.log('MongoDB URI Structure (without password):', 
  `mongodb+srv://${MONGODB_USERNAME}:****@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`
);

let isConnected = false;

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const opts = {
      serverSelectionTimeoutMS: 5000, // 5 seconds
      connectTimeoutMS: 10000, // 10 seconds
    };

    await mongoose.connect(dbUri, opts);
    isConnected = true;
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('connected', () => {
      console.log(`Connected to MongoDB collection: ${MONGODB_COLLECTION}`);
      isConnected = true;
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