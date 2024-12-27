export async function GET(request: Request) {
  try {
    // Get and validate search parameter
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    
    if (!searchQuery) {
      return Response.json({ error: 'Search query is required' }, { status: 400 });
    }

    if (!process.env.GIPHY_API_KEY) {
      console.error('GIPHY_API_KEY is not defined');
      return Response.json({ error: 'API configuration error' }, { status: 500 });
    }

    // Make request to Giphy
    const giphyUrl = `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=10`;
    
    const response = await fetch(giphyUrl);
    
    if (!response.ok) {
      console.error(`Giphy API error: ${response.status}`);
      return Response.json({ error: 'Failed to fetch from Giphy' }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
    
  } catch (error) {
    console.error('Server error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 