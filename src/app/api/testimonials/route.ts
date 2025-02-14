import { NextResponse } from 'next/server';
import { connectToDatabase, fallbackTestimonials } from '@/lib/db';
import Testimonial from '@/models/Testimonial';
import { headers } from 'next/headers';

const TIMEOUT = 5000; // 5 seconds timeout

// Helper function to create a response with proper headers
function createResponse(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    },
  });
}

export async function OPTIONS() {
  return createResponse({}, 200);
}

// Helper function to fetch testimonials with caching
async function fetchTestimonials() {
  console.log('Testimonials GET request started');
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Database operation timed out')), TIMEOUT);
  });

  try {
    const db = await connectToDatabase();
    if (!db) {
      console.warn('Database connection failed, using fallback data');
      return fallbackTestimonials;
    }

    const testimonials = await Promise.race([
      Testimonial.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .select('-__v')
        .lean()
        .exec(),
      timeoutPromise
    ]);

    if (!testimonials || !Array.isArray(testimonials)) {
      console.warn('Invalid response from database, using fallback data');
      return fallbackTestimonials;
    }

    return testimonials;
  } catch (error) {
    console.warn('Error fetching testimonials:', error);
    return fallbackTestimonials;
  }
}

export async function GET() {
  try {
    const headersList = await headers();
    const requestHeaders: Record<string, string> = {};
    Array.from(headersList.entries()).forEach(([key, value]: [string, string]) => {
      requestHeaders[key] = value;
    });
    console.log('Request headers:', requestHeaders);

    const testimonials = await fetchTestimonials();
    return createResponse(testimonials);
  } catch (error) {
    console.error('GET request error:', error);
    return createResponse(fallbackTestimonials);
  }
}

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const requestHeaders: Record<string, string> = {};
    Array.from(headersList.entries()).forEach(([key, value]: [string, string]) => {
      requestHeaders[key] = value;
    });
    console.log('Request headers:', requestHeaders);

    const db = await connectToDatabase();
    if (!db) {
      return createResponse(
        { error: 'Database service unavailable' },
        503
      );
    }

    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createResponse(
        { error: 'Content-Type must be application/json' },
        415
      );
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name?.trim() || !data.role?.trim() || !data.content?.trim() || !data.rating) {
      return createResponse(
        { error: 'Missing required fields: name, role, content, and rating are required' },
        400
      );
    }

    // Validate rating
    if (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
      return createResponse(
        { error: 'Rating must be a number between 1 and 5' },
        400
      );
    }

    try {
      const testimonial = await Promise.race([
        Testimonial.create({
          name: data.name.trim(),
          role: data.role.trim(),
          content: data.content.trim(),
          rating: data.rating,
          socialProfiles: data.socialProfiles || {},
          timestamp: new Date()
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timed out')), TIMEOUT)
        )
      ]);

      return createResponse(testimonial, 201);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Operation timed out') {
          return createResponse(
            { error: 'Request timed out, please try again' },
            504
          );
        }
        if (error.message.includes('duplicate key')) {
          return createResponse(
            { error: 'A testimonial from you already exists' },
            409
          );
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('POST request error:', error);
    return createResponse(
      { 
        error: 'Failed to create testimonial',
        details: process.env.NODE_ENV === 'development' ? `${error}` : undefined
      },
      500
    );
  }
} 