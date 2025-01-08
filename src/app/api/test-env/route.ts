import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasApiKey: !!process.env.FIREBASE_API_KEY,
    // Add other environment variables you want to check
  });
} 