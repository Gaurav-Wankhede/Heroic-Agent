import { NextResponse } from 'next/server';
import { connectToDatabase, fallbackTestimonials } from '@/lib/db';
import Testimonial from '@/models/Testimonial';

const TIMEOUT = 5000; // Reduce timeout to 5 seconds for faster fallback

// Helper function to create a response with proper headers
function createResponse(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', // Cache for 1 minute, stale for 5 minutes
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}

export async function OPTIONS() {
  return createResponse({}, 200);
}

// Helper function to fetch testimonials
async function fetchTestimonials() {
  console.log('Testimonials GET request started');
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Database operation timed out')), TIMEOUT);
  });

  console.log('Connecting to database...');
  const db = await connectToDatabase();
  
  if (!db) {
    console.warn('Database connection failed, using fallback data');
    return fallbackTestimonials;
  }
  
  try {
    console.log('Fetching testimonials...');
    const testimonials = await Promise.race([
      Testimonial.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()
        .exec(),
      timeoutPromise
    ]) as any[];
    
    if (!testimonials || !Array.isArray(testimonials)) {
      console.warn('Invalid response from database, using fallback data');
      return fallbackTestimonials;
    }
    
    console.log(`Found ${testimonials.length} testimonials`);
    return testimonials;
  } catch (error) {
    console.warn('Error fetching testimonials, using fallback data:', error);
    return fallbackTestimonials;
  }
}

export async function GET(request: Request) {
  try {
    console.log('Request URL:', request.url);
    const testimonials = await fetchTestimonials();
    return createResponse(testimonials);
  } catch (error) {
    console.error('Testimonials fetch error:', error);
    return createResponse(fallbackTestimonials);
  }
}

export async function POST(request: Request) {
  try {
    console.log('Testimonials POST request started');
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timed out')), TIMEOUT);
    });

    const db = await connectToDatabase();
    if (!db) {
      return createResponse(
        { error: 'Database connection failed' },
        503
      );
    }
    
    const data = await request.json();
    console.log('Received testimonial data:', { ...data, content: data.content?.substring(0, 50) + '...' });

    if (!data.email || !data.name || !data.message) {
      return createResponse(
        { error: 'Missing required fields' },
        400
      );
    }

    try {
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
      if (error instanceof Error && error.message === 'Database operation timed out') {
        return createResponse(
          { error: 'Operation timed out, please try again' },
          504
        );
      }
      throw error;
    }
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