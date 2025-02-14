import { NextResponse } from 'next/server';
import { connectToDatabase, fallbackTestimonials } from '@/lib/db';
import Testimonial from '@/models/Testimonial';

const TIMEOUT = 8000; // 8 seconds timeout for Vercel

// Helper function to create a response with proper headers
function createResponse(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
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
  console.log('Fetching recent testimonials...');
  
  try {
    console.log('Connecting to database...');
    const mongoose = await connectToDatabase();
    
    if (!mongoose) {
      console.warn('Database connection failed, using fallback data');
      return createResponse(fallbackTestimonials.slice(0, 4));
    }

    // Ensure we're connected before proceeding
    if (!mongoose.connection.readyState) {
      console.warn('Database not ready, using fallback data');
      return createResponse(fallbackTestimonials.slice(0, 4));
    }

    console.log('Database connected successfully');
    
    try {
      console.log('Fetching recent testimonials from database...');
      const testimonials = await Promise.race([
        Testimonial.find()
          .sort({ timestamp: -1 })
          .limit(4)
          .lean()
          .exec(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database operation timed out')), TIMEOUT)
        )
      ]);

      if (!testimonials || !Array.isArray(testimonials)) {
        console.warn('Invalid response from database, using fallback data');
        return createResponse(fallbackTestimonials.slice(0, 4));
      }

      console.log(`Found ${testimonials.length} recent testimonials`);
      return createResponse(testimonials);
    } catch (dbError) {
      console.warn('Database query error, using fallback data:', dbError);
      return createResponse(fallbackTestimonials.slice(0, 4));
    }
  } catch (error) {
    console.error('Recent testimonials fetch error:', error);
    return createResponse(fallbackTestimonials.slice(0, 4));
  }
} 