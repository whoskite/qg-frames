export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  if (!fid) {
    return Response.json({ error: 'FID is required' }, { status: 400 });
  }

  try {
    console.log('Fetching user profile for FID:', fid);
    
    // Using direct API call with correct header name
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-KEY': process.env.NEYNAR_API_KEY!
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response:', data);

    return Response.json({
      success: true,
      users: [data.result.user]
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to fetch user profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 