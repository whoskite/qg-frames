import { NextResponse } from 'next/server';

export async function GET() {
  console.log('Fetching Firebase config...');
  
  // Only return non-sensitive configuration
  const publicConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };

  // Log config (excluding sensitive data)
  console.log('Firebase config:', {
    hasApiKey: !!publicConfig.apiKey,
    authDomain: publicConfig.authDomain,
    projectId: publicConfig.projectId,
    storageBucket: publicConfig.storageBucket,
    hasMessagingSenderId: !!publicConfig.messagingSenderId,
    hasAppId: !!publicConfig.appId,
    hasMeasurementId: !!publicConfig.measurementId
  });

  return NextResponse.json(publicConfig);
} 