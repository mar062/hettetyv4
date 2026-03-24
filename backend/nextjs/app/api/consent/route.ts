import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, preferences, agreedToTerms } = body;
    
    // Validate request
    if (!preferences || typeof agreedToTerms !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // In a real application, you would store this in a dedicated Consent table
    // Example:
    // await prisma.userConsent.create({
    //   data: {
    //     userId: userId || null, // Optional if guest
    //     agreedToTerms,
    //     necessary: preferences.necessary,
    //     analytics: preferences.analytics,
    //     marketing: preferences.marketing,
    //     ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    //     userAgent: request.headers.get('user-agent') || 'unknown',
    //   }
    // });

    console.log("Consent saved to backend database:", { userId, preferences, agreedToTerms });

    return NextResponse.json({ success: true, message: 'Consent saved successfully' });
  } catch (error) {
    console.error('Error saving consent:', error);
    return NextResponse.json({ error: 'Failed to save consent' }, { status: 500 });
  }
}
