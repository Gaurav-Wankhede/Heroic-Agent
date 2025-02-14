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
    console.log('Latest testimonials GET request started');
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timed out')), TIMEOUT);
    });

    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connected successfully');
    
    console.log('Fetching latest testimonials...');
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
    console.error('Latest testimonials fetch error:', error);
    return createResponse(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch testimonials',
        details: process.env.NODE_ENV === 'development' ? `${error}` : undefined
      },
      500
    );
  }
} 