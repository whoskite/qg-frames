import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  if (!fid) {
    return NextResponse.json({ error: 'FID is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.NEYNAR_API_KEY!
      }
    });

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from Neynar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' }, 
      { status: 500 }
    );
  }
} 