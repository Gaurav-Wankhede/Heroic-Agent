import mongoose from 'mongoose';

// Define the interface for the document
interface TestimonialDocument extends mongoose.Document {
  name: string;
  email: string;
  role: string;
  content: string;
  rating: number;
  socialProfiles?: {
    linkedin?: string;
    github?: string;
    x?: string;
  };
  timestamp: Date;
}

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    trim: true,
    maxlength: [100, 'Role cannot be more than 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    minlength: [10, 'Content must be at least 10 characters long'],
    maxlength: [1000, 'Content cannot be more than 1000 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  socialProfiles: {
    linkedin: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || v.startsWith('https://linkedin.com/') || v.startsWith('https://www.linkedin.com/');
        },
        message: 'LinkedIn URL must start with https://linkedin.com/ or https://www.linkedin.com/'
      }
    },
    github: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || v.startsWith('https://github.com/');
        },
        message: 'GitHub URL must start with https://github.com/'
      }
    },
    x: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || v.startsWith('https://x.com/') || v.startsWith('https://twitter.com/');
        },
        message: 'X/Twitter URL must start with https://x.com/ or https://twitter.com/'
      }
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Create indexes for better query performance
testimonialSchema.index({ timestamp: -1 });
testimonialSchema.index({ rating: -1 });

testimonialSchema.index({ email: 1, name: 1 }, { unique: true });
testimonialSchema.index({ content: 'text' });

testimonialSchema.statics.findSimilar = async function(content: string, threshold: number = 0.8) {
  const similar = await this.find(
    { $text: { $search: content } },
    { score: { $meta: "textScore" } }
  )
  .sort({ score: { $meta: "textScore" } })
  .exec();

  return similar.filter((doc: TestimonialDocument) => {
    const similarity = calculateSimilarity(content, doc.content);
    return similarity > threshold;
  });
};

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

// Handle undefined model error in development hot reloading
const Testimonial = mongoose.models.Testimonial || mongoose.model<TestimonialDocument>('Testimonial', testimonialSchema);

export default Testimonial; 