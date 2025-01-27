import { NextRequest } from "next/server";
import { eventHeaderSchema, eventPayloadSchema, eventSchema } from "@farcaster/frame-sdk";

export async function POST(request: NextRequest) {
  const requestJson = await request.json();

  const requestBody = eventSchema.safeParse(requestJson);

  if (requestBody.success === false) {
    return Response.json(
      { success: false, errors: requestBody.error.errors },
      { status: 400 }
    );
  }

  // TODO: verify signature

  const headerData = JSON.parse(
    Buffer.from(requestBody.data.header, "base64url").toString("utf-8")
  );
  const header = eventHeaderSchema.safeParse(headerData);
  if (header.success === false) {
    return Response.json(
      { success: false, errors: header.error.errors },
      { status: 400 }
    );
  }
  const fid = header.data.fid;

  const payloadData = JSON.parse(
    Buffer.from(requestBody.data.payload, "base64url").toString("utf-8")
  );
  const payload = eventPayloadSchema.safeParse(payloadData);

  if (payload.success === false) {
    return Response.json(
      { success: false, errors: payload.error.errors },
      { status: 400 }
    );
  }

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
      if (!payload.data.notificationDetails) {
        console.log(`Got notifications-enabled event for fid ${fid} but no notification details`);
        break;
      }

      console.log(
        `Got notifications-enabled event for fid ${fid} with token ${
          payload.data.notificationDetails.token
        } and url ${payload.data.notificationDetails.url} ${JSON.stringify(
          payload.data
        )}`
      );
      
      // Send confirmation notification
      const enableResponse = await fetch('/api/welcome-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload.data.notificationDetails,
          targetUrl: process.env.NEXT_PUBLIC_HOST || 'https://qg-frames.vercel.app'
        })
      });

      if (!enableResponse.ok) {
        const errorText = await enableResponse.text();
        console.error('Failed to send notification enabled confirmation:', errorText);
      } else {
        console.log('Notification enabled confirmation sent successfully');
      }
      break;

    case "notifications-disabled":
      console.log(`Got notifications-disabled event for fid ${fid}`);
      break;
  }

  return Response.json({ success: true });
}
