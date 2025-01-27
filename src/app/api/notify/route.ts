import { NextResponse } from 'next/server';
import { collection, getDocs, query, where, type Firestore } from 'firebase/firestore';
import { db } from '~/lib/firebase';

// Helper function to ensure we have a valid Firestore instance
function getDb(): Firestore {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

export async function POST(req: Request) {
  try {
    // Get notification data from request body
    const { message, title = 'FunQuotes Update' } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get all users with notification details
    const database = getDb();
    const usersRef = collection(database, 'users');
    const q = query(usersRef, where('notificationDetails', '!=', null));
    const querySnapshot = await getDocs(q);

    const notifications = [];
    
    // Prepare notifications for each user
    for (const doc of querySnapshot.docs) {
      const userData = doc.data();
      const notificationDetails = userData.notificationDetails;
      
      if (notificationDetails?.url && notificationDetails?.token) {
        notifications.push({
          url: notificationDetails.url,
          notificationToken: notificationDetails.token,
          message,
          title
        });
      }
    }

    // Send notifications in batches of 10
    const batchSize = 10;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      // Send notifications using Neynar's API
      const response = await fetch('https://api.neynar.com/v2/farcaster/notifications/frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_key': process.env.NEYNAR_API_KEY || ''
        },
        body: JSON.stringify({
          notifications: batch
        })
      });

      if (!response.ok) {
        console.error('Error sending notifications batch:', await response.text());
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent: notifications.length
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
} 
