import { NextResponse } from 'next/server';
import { ParseWebhookEvent, parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/frame-node';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    let data;
    try {
      data = await parseWebhookEvent(body, verifyAppKeyWithNeynar);
    } catch (e: unknown) {
      const error = e as ParseWebhookEvent.ErrorType;
      console.error('Webhook parsing error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const fid = data.fid;
    const event = data.event;

    console.log('Webhook event:', event.event, 'from FID:', fid);

    switch (event.event) {
      case 'frame_added':
        if (event.notificationDetails) {
          // Store notification details (token and url) in your database
          console.log('Notification details:', event.notificationDetails);
          
          // Send immediate welcome notification
          const welcomeResponse = await fetch('/api/welcome-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event.notificationDetails)
          });

          if (!welcomeResponse.ok) {
            console.error('Failed to send welcome notification');
          }
        }
        break;

      case 'frame_removed':
        // Handle frame removal - invalidate stored tokens
        console.log('Frame removed for user:', fid);
        break;

      case 'notifications_enabled':
        // Store new notification details
        console.log('Notifications enabled for user:', fid, event.notificationDetails);
        break;

      case 'notifications_disabled':
        // Invalidate stored tokens
        console.log('Notifications disabled for user:', fid);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
