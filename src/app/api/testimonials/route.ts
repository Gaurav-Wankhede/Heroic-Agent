import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Testimonial from '@/models/Testimonial';

export async function GET() {
  try {
    await connectToDatabase();
    const testimonials = await Testimonial.find()
      .sort({ timestamp: -1 })
      .lean();
    return NextResponse.json(testimonials);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    // Check for duplicate email
    const existingTestimonial = await Testimonial.findOne({ email: data.email });
    if (existingTestimonial) {
      return NextResponse.json(
        { error: 'A testimonial with this email already exists' },
        { status: 409 }
      );
    }

    const testimonial = await Testimonial.create({
      ...data,
      timestamp: new Date()
    });

    return NextResponse.json(testimonial, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create testimonial' },
      { status: 500 }
    );
  }
} 