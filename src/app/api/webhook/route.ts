import { NextResponse } from 'next/server';
import { ParseWebhookEvent, parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/frame-node';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received webhook payload:', JSON.stringify(body, null, 2));
    
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
    console.log('Event details:', JSON.stringify(event, null, 2));

    switch (event.event) {
      case 'frame_added':
        if (event.notificationDetails) {
          console.log('Frame added with notifications enabled');
          console.log('Notification details:', event.notificationDetails);
          
          // Send immediate welcome notification
          const welcomeResponse = await fetch('/api/welcome-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...event.notificationDetails,
              targetUrl: process.env.NEXT_PUBLIC_HOST || 'https://qg-frames.vercel.app'
            })
          });

          if (!welcomeResponse.ok) {
            const errorText = await welcomeResponse.text();
            console.error('Failed to send welcome notification:', errorText);
          } else {
            console.log('Welcome notification sent successfully');
          }
        } else {
          console.log('Frame added without notification details');
        }
        break;

      case 'frame_removed':
        console.log('Frame removed for FID:', fid);
        // TODO: Remove notification tokens from database
        break;

      case 'notifications_enabled':
        if (event.notificationDetails) {
          console.log('Notifications enabled for FID:', fid);
          console.log('New notification details:', event.notificationDetails);
          
          // Send a confirmation notification
          const enableResponse = await fetch('/api/welcome-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...event.notificationDetails,
              targetUrl: process.env.NEXT_PUBLIC_HOST || 'https://qg-frames.vercel.app'
            })
          });

          if (!enableResponse.ok) {
            const errorText = await enableResponse.text();
            console.error('Failed to send notification enabled confirmation:', errorText);
          } else {
            console.log('Notification enabled confirmation sent successfully');
          }
          // TODO: Store new notification token in database
        } else {
          console.log('Notifications enabled but no details provided');
        }
        break;

      case 'notifications_disabled':
        console.log('Notifications disabled for FID:', fid);
        // TODO: Remove notification tokens from database
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
