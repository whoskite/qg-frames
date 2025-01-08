import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if required environment variables are present
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.error('Missing required Firebase configuration');
      return NextResponse.json(
        { error: 'Missing Firebase configuration' },
        { status: 500 }
      );
    }

    const config = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };

    // Log config (remove in production)
    console.log('Firebase config being served:', {
      projectId: config.projectId,
      authDomain: config.authDomain
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error serving Firebase config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 