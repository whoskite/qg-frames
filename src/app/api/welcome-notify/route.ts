import { NextResponse } from 'next/server';
import { type Firestore } from 'firebase/firestore';
import { db } from '~/lib/firebase';

// Helper function to ensure we have a valid Firestore instance
function getDb(): Firestore {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

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
        notifications: [{
          url,
          notificationToken,
          message: "Welcome to FunQuotes! 🎉 Start generating and sharing amazing quotes with your friends.",
          title: "Welcome to FunQuotes"
        }]
      })
    });

    if (!response.ok) {
      console.error('Error sending welcome notification:', await response.text());
      return NextResponse.json(
        { error: 'Failed to send welcome notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending welcome notification:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome notification' },
      { status: 500 }
    );
  }
} 