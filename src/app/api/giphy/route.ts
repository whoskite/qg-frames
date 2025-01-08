import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('search');
  const apiKey = process.env.GIPHY_API_KEY;

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  if (!apiKey) {
    console.error('API Key check:', {
      keyExists: !!process.env.GIPHY_API_KEY,
      envKeys: Object.keys(process.env).filter(key => key.includes('GIPHY'))
    });
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  try {
    const giphyUrl = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=10&rating=g`;
    
    const response = await fetch(giphyUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GIPHY API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`GIPHY API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GIPHY route:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch GIF'
    }, { status: 500 });
  }
} 