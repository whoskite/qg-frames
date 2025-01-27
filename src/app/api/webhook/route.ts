import { NextResponse } from 'next/server';
import { FrameSignaturePacket, validateFrameMessage } from '@farcaster/core';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate the Farcaster message signature
    const packet = body as FrameSignaturePacket;
    const validationResult = await validateFrameMessage(packet);
    
    if (!validationResult.isValid) {
      console.error('Invalid signature:', validationResult.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Decode the base64url encoded payload
    const payloadStr = Buffer.from(packet.payload, 'base64url').toString();
    const payload = JSON.parse(payloadStr);

    console.log('Webhook event:', payload.event);

    switch (payload.event) {
      case 'frame_added':
        if (payload.notificationDetails) {
          // Store notification details (token and url) in your database
          // This is where you'd save to your database
          console.log('Notification details:', payload.notificationDetails);
          
          // Send immediate welcome notification
          const welcomeResponse = await fetch('/api/welcome-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload.notificationDetails)
          });

          if (!welcomeResponse.ok) {
            console.error('Failed to send welcome notification');
          }
        }
        break;

      case 'frame_removed':
        // Handle frame removal - invalidate stored tokens
        console.log('Frame removed for user');
        break;

      case 'notifications_enabled':
        // Store new notification details
        console.log('Notifications enabled:', payload.notificationDetails);
        break;

      case 'notifications_disabled':
        // Invalidate stored tokens
        console.log('Notifications disabled');
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
