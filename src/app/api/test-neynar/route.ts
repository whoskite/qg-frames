import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if API key and Client ID exist
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json({ 
        error: 'NEYNAR_API_KEY not found',
        status: 'error'
      }, { status: 500 });
    }

    if (!process.env.NEYNAR_CLIENT_ID) {
      return NextResponse.json({ 
        error: 'NEYNAR_CLIENT_ID not found',
        status: 'error'
      }, { status: 500 });
    }

    try {
      // Test the uploads endpoint with a minimal request
      const response = await fetch('https://api.neynar.com/v2/uploads', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'api_key': process.env.NEYNAR_API_KEY,
          'Content-Type': 'application/json',
          'X-Client-Id': process.env.NEYNAR_CLIENT_ID
        },
        body: JSON.stringify({
          file: 'test',
          type: 'image'
        })
      });

      const data = await response.json();

      return NextResponse.json({
        status: response.ok ? 'success' : 'error',
        neynarResponse: data,
        apiKeyExists: true,
        clientIdExists: true,
        apiKeyFirstChars: process.env.NEYNAR_API_KEY.substring(0, 4) + '...',
        clientIdFirstChars: process.env.NEYNAR_CLIENT_ID.substring(0, 4) + '...',
        statusCode: response.status,
        statusText: response.statusText,
        endpoint: 'v2/uploads'
      });
    } catch (neynarError) {
      console.error('Neynar API error:', neynarError);
      return NextResponse.json({
        error: 'Failed to make test API call',
        details: neynarError instanceof Error ? neynarError.message : 'Unknown error',
        status: 'error',
        endpoint: 'v2/uploads'
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 });
  }
} 