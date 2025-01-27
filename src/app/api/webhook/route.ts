import { NextRequest } from "next/server";
import { eventHeaderSchema, eventPayloadSchema, eventSchema } from "~/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const requestJson = await request.json();
    console.log('Received webhook payload:', JSON.stringify(requestJson, null, 2));

    const requestBody = eventSchema.safeParse(requestJson);

    if (requestBody.success === false) {
      console.error('Invalid request body:', requestBody.error.errors);
      return Response.json(
        { success: false, errors: requestBody.error.errors },
        { status: 400 }
      );
    }

    // TODO: verify signature

    const headerData = JSON.parse(
      Buffer.from(requestBody.data.header, "base64url").toString("utf-8")
    );
    console.log('Parsed header data:', headerData);
    
    const header = eventHeaderSchema.safeParse(headerData);
    if (header.success === false) {
      console.error('Invalid header:', header.error.errors);
      return Response.json(
        { success: false, errors: header.error.errors },
        { status: 400 }
      );
    }
    const fid = header.data.fid;

    const payloadData = JSON.parse(
      Buffer.from(requestBody.data.payload, "base64url").toString("utf-8")
    );
    console.log('Parsed payload data:', payloadData);
    
    const payload = eventPayloadSchema.safeParse(payloadData);

    if (payload.success === false) {
      console.error('Invalid payload:', payload.error.errors);
      return Response.json(
        { success: false, errors: payload.error.errors },
        { status: 400 }
      );
    }

    console.log('Processing event:', payload.data.event, 'for FID:', fid);

    switch (payload.data.event) {
      case "frame-added":
        console.log(
          payload.data.notificationDetails
            ? `Got frame-added event for fid ${fid} with notification token ${payload.data.notificationDetails.token} and url ${payload.data.notificationDetails.url}`
            : `Got frame-added event for fid ${fid} with no notification details`
        );
        
        if (payload.data.notificationDetails) {
          // Send welcome notification
          const welcomeResponse = await fetch('/api/welcome-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload.data.notificationDetails,
              targetUrl: process.env.NEXT_PUBLIC_HOST || 'https://qg-frames.vercel.app'
            })
          });

          if (!welcomeResponse.ok) {
            const errorText = await welcomeResponse.text();
            console.error('Failed to send welcome notification:', errorText);
          } else {
            console.log('Welcome notification sent successfully');
          }
        }
        break;

      case "frame-removed":
        console.log(`Got frame-removed event for fid ${fid}`);
        break;

      case "notifications-enabled":
        console.log('Received notifications-enabled event');
        
        if (!payload.data.notificationDetails) {
          console.error(`Got notifications-enabled event for fid ${fid} but no notification details`);
          return Response.json(
            { success: false, error: 'No notification details provided' },
            { status: 400 }
          );
        }

        console.log(
          `Processing notifications-enabled event for fid ${fid}:`,
          JSON.stringify(payload.data.notificationDetails, null, 2)
        );
      
        // Send confirmation notification
        try {
          const enableResponse = await fetch('/api/welcome-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload.data.notificationDetails,
              targetUrl: process.env.NEXT_PUBLIC_HOST || 'https://qg-frames.vercel.app'
            })
          });

          const responseText = await enableResponse.text();
          if (!enableResponse.ok) {
            console.error('Failed to send notification enabled confirmation:', responseText);
          } else {
            console.log('Notification enabled confirmation sent successfully:', responseText);
          }
        } catch (error) {
          console.error('Error sending notification enabled confirmation:', error);
        }
        break;

      case "notifications-disabled":
        console.log(`Got notifications-disabled event for fid ${fid}`);
        break;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
