export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('search') || '';
  
  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${searchQuery}&limit=10`
    );
    const data = await response.json();
    return new Response(JSON.stringify(data));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch gifs' }), { status: 500 });
  }
} 