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

    try {
      // Test with a simple API call
      const response = await fetch('https://api.neynar.com/v2/farcaster/user/search?viewer_fid=1&q=dwr', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'api_key': process.env.NEYNAR_API_KEY
        }
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
    } catch (neynarError) {
      console.error('Neynar API error:', neynarError);
      return NextResponse.json({
        error: 'Failed to make test API call',
        details: neynarError instanceof Error ? neynarError.message : 'Unknown error',
        status: 'error'
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 });
  }
} 