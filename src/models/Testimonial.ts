import mongoose from 'mongoose';

interface TestimonialDocument extends mongoose.Document {
  content: string;
  // ... other fields if needed
}

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
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
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
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
          return !v || v.startsWith('https://x.com/');
        },
        message: 'X (formerly Twitter) URL must start with https://x.com/'
      }
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

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

export default mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema); 