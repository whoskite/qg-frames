import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    // Get notification details from request body
    const { url, notificationToken } = await req.json();

    if (!url || !notificationToken) {
      return NextResponse.json(
        { error: 'URL and notification token are required' },
        { status: 400 }
      );
    }

    // Send welcome notification using Neynar's API
    const response = await fetch('https://api.neynar.com/v2/farcaster/notifications/frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY || ''
      },
      body: JSON.stringify({
        notificationId: randomUUID(),
        title: "Welcome to FunQuotes",
        body: "Start generating and sharing amazing quotes with your friends! 🎉",
        targetUrl: process.env.NEXT_PUBLIC_HOST || '',
        tokens: [notificationToken]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error sending welcome notification:', errorText);
      return NextResponse.json(
        { error: 'Failed to send welcome notification', details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      message: 'Welcome notification sent successfully',
      result
    });
  } catch (error) {
    console.error('Error sending welcome notification:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome notification' },
      { status: 500 }
    );
  }
} 