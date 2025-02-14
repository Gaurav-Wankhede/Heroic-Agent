import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Testimonial from '@/models/Testimonial';

export async function GET() {
  try {
    await connectToDatabase();
    
    const testimonials = await Testimonial.find()
      .sort({ timestamp: -1 })
      .limit(6);
    
    return NextResponse.json(testimonials);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
} 