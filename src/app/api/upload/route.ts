import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      console.error('No image provided in request');
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.NEYNAR_API_KEY) {
      console.error('NEYNAR_API_KEY not found in environment variables');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Remove the data:image/png;base64, prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    
    try {
      // Validate base64 data
      Buffer.from(base64Data, 'base64');
    } catch (error) {
      console.error('Invalid base64 data:', error);
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }
    
    // Upload to Neynar
    const response = await fetch('https://api.neynar.com/v1/upload', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64Data,
        uploadType: 'image'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Neynar API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return NextResponse.json(
        { error: `Neynar API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Neynar API response:', data);
    
    if (data && data.url) {
      return NextResponse.json({ url: data.url });
    } else if (data && data.imageUrl) {
      return NextResponse.json({ url: data.imageUrl });
    }
    
    console.error('Unexpected Neynar response:', data);
    return NextResponse.json(
      { error: 'Invalid response from Neynar' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 