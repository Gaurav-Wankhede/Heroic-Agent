import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Testimonial from '@/models/Testimonial';

const TIMEOUT = 30000; // Increase timeout to 30 seconds for production

// Helper function to create a response with proper headers
function createResponse(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, must-revalidate',
      // Add CORS headers
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function OPTIONS() {
  return createResponse({}, 200);
}

export async function GET() {
  try {
    console.log('Testimonials GET request started');
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timed out')), TIMEOUT);
    });

    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connected successfully');
    
    console.log('Fetching testimonials...');
    const testimonials = await Promise.race([
      Testimonial.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()
        .exec(),
      timeoutPromise
    ]) as any[];
    console.log(`Found ${testimonials?.length ?? 0} testimonials`);

    if (!testimonials || !Array.isArray(testimonials)) {
      console.error('Invalid response from database:', testimonials);
      throw new Error('Invalid response from database');
    }

    return createResponse(testimonials);
  } catch (error) {
    console.error('Testimonials fetch error:', error);
    return createResponse(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch testimonials',
        details: process.env.NODE_ENV === 'development' ? `${error}` : undefined
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log('Testimonials POST request started');
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timed out')), TIMEOUT);
    });

    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connected successfully');
    
    const data = await request.json();
    console.log('Received testimonial data:', { ...data, content: data.content?.substring(0, 50) + '...' });

    if (!data.email || !data.name || !data.message) {
      return createResponse(
        { error: 'Missing required fields' },
        400
      );
    }

    console.log('Checking for existing testimonial...');
    const existingTestimonial = await Promise.race([
      Testimonial.findOne({ email: data.email }).exec(),
      timeoutPromise
    ]);

    if (existingTestimonial) {
      return createResponse(
        { error: 'A testimonial with this email already exists' },
        409
      );
    }

    console.log('Creating new testimonial...');
    const testimonial = await Promise.race([
      Testimonial.create({
        ...data,
        timestamp: new Date()
      }),
      timeoutPromise
    ]);
    console.log('Testimonial created successfully');

    return createResponse(testimonial, 201);
  } catch (error) {
    console.error('Testimonial creation error:', error);
    return createResponse(
      {
        error: error instanceof Error ? error.message : 'Failed to create testimonial',
        details: process.env.NODE_ENV === 'development' ? `${error}` : undefined
      },
      500
    );
  }
} 