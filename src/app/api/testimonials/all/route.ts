import { NextResponse } from 'next/server';
import { connectToDatabase, fallbackTestimonials } from '@/lib/db';
import Testimonial from '@/models/Testimonial';

const TIMEOUT = 30000; // 30 seconds timeout

// Helper function to create a response with proper headers
function createResponse(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}

export async function OPTIONS() {
  return createResponse({}, 200);
}

export async function GET() {
  try {
    console.log('Fetching all testimonials...');
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timed out')), TIMEOUT);
    });

    console.log('Connecting to database...');
    try {
      await connectToDatabase();
      console.log('Database connected successfully');
      
      console.log('Fetching testimonials from database...');
      const testimonials = await Promise.race([
        Testimonial.find()
          .sort({ timestamp: -1 })
          .lean()
          .exec(),
        timeoutPromise
      ]) as any[];
      console.log(`Found ${testimonials?.length ?? 0} testimonials in database`);

      if (!testimonials || !Array.isArray(testimonials)) {
        console.warn('Invalid response from database, using fallback data');
        return createResponse(fallbackTestimonials);
      }

      return createResponse(testimonials);
    } catch (dbError) {
      console.warn('Database error, using fallback data:', dbError);
      return createResponse(fallbackTestimonials);
    }
  } catch (error) {
    console.error('Testimonials fetch error:', error);
    // Even if everything fails, return fallback data
    return createResponse(fallbackTestimonials);
  }
} 