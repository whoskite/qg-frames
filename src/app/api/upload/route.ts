import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Remove the data:image/png;base64, prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    
    // Upload to Neynar
    const response = await fetch('https://api.neynar.com/v1/upload', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64Data,
        uploadType: 'image'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Neynar API error:', errorData);
      throw new Error(`Neynar API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.url) {
      return NextResponse.json({ url: data.url });
    } else if (data && data.imageUrl) {
      return NextResponse.json({ url: data.imageUrl });
    }
    
    console.error('Unexpected Neynar response:', data);
    throw new Error('Failed to get URL from Neynar response');
  } catch (error) {
    console.error('Error uploading to Neynar:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
} 