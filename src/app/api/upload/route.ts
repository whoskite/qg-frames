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

    if (!process.env.NEYNAR_CLIENT_ID) {
      console.error('NEYNAR_CLIENT_ID not found in environment variables');
      return NextResponse.json({ error: 'Client ID not configured' }, { status: 500 });
    }

    // Remove the data:image/png;base64, prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    
    try {
      // Make direct API call to Neynar v2 uploads endpoint
      const response = await fetch('https://api.neynar.com/v2/uploads', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'api_key': process.env.NEYNAR_API_KEY,
          'Content-Type': 'application/json',
          'X-Client-Id': process.env.NEYNAR_CLIENT_ID
        },
        body: JSON.stringify({
          file: base64Data,
          type: 'image'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Neynar API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.url) {
        return NextResponse.json({ url: data.url });
      }
      
      throw new Error('No URL in upload response');
    } catch (uploadError) {
      console.error('Neynar upload error:', uploadError);
      return NextResponse.json(
        { error: uploadError instanceof Error ? uploadError.message : 'Failed to upload image' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 