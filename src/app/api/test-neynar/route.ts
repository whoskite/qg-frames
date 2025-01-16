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

    // Test Neynar API with a simple request to the upload endpoint
    const response = await fetch('https://api.neynar.com/v1/upload', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // 1x1 transparent PNG
        uploadType: 'image'
      })
    });

    const data = await response.json();

    return NextResponse.json({
      status: response.ok ? 'success' : 'error',
      neynarResponse: data,
      apiKeyExists: true,
      apiKeyFirstChars: process.env.NEYNAR_API_KEY.substring(0, 4) + '...',
      statusCode: response.status,
      statusText: response.statusText
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 });
  }
} 