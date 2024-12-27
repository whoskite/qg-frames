// If this is in an API route or Server Component
const apiKey = process.env.GIPHY_API_KEY
if (!apiKey) {
  throw new Error('GIPHY_API_KEY is missing from environment variables')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('search') || '';
  
  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${searchQuery}&limit=10`
    );
    // ... rest of the code ...
  }
} 