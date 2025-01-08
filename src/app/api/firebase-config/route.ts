import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check all required Firebase variables
    const requiredVars = [
      'FIREBASE_API_KEY',
      'FIREBASE_AUTH_DOMAIN',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET',
      'FIREBASE_MESSAGING_SENDER_ID',
      'FIREBASE_APP_ID'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing required Firebase variables:', missingVars);
      return NextResponse.json(
        { error: `Missing required Firebase variables: ${missingVars.join(', ')}` },
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
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || undefined // Optional
    };

    // Log config (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Firebase config being served:', {
        projectId: config.projectId,
        authDomain: config.authDomain
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error serving Firebase config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 