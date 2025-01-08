import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    firebase: {
      hasApiKey: !!process.env.FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.FIREBASE_AUTH_DOMAIN,
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasStorageBucket: !!process.env.FIREBASE_STORAGE_BUCKET,
      hasMessagingSenderId: !!process.env.FIREBASE_MESSAGING_SENDER_ID,
      hasAppId: !!process.env.FIREBASE_APP_ID,
      hasMeasurementId: !!process.env.FIREBASE_MEASUREMENT_ID
    },
    // Add other API checks if needed
    hasGiphyKey: !!process.env.GIPHY_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY
  });
} 