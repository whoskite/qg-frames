export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('search') || '';
  
  console.log('API Key:', process.env.GIPHY_API_KEY ? 'Present' : 'Missing');
  console.log('Search Query:', searchQuery);
  
  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${searchQuery}&limit=10`
    );
    
    if (!response.ok) {
      console.error('Giphy API error:', response.status);
      return Response.json({ error: 'Failed to fetch from Giphy' }, { status: response.status });
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error in Giphy route:', error);
    return Response.json({ error: 'Failed to fetch gifs' }, { status: 500 });
  }
} 