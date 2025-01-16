import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if API key exists
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json({ 
        error: 'NEYNAR_API_KEY not found',
        status: 'error'
      }, { status: 500 });
    }

    // Test Neynar API with a simple request
    const response = await fetch('https://api.neynar.com/v1/app_details', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY
      }
    });

    const data = await response.json();

    return NextResponse.json({
      status: 'success',
      neynarResponse: data,
      apiKeyExists: true,
      apiKeyFirstChars: process.env.NEYNAR_API_KEY.substring(0, 4) + '...'
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 });
  }
} 