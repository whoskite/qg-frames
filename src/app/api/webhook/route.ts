import {
  ParseWebhookEvent,
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/frame-node";
import { NextRequest } from "next/server";
import {
  deleteUserNotificationDetails,
  setUserNotificationDetails,
} from "~/lib/kv";
import { sendFrameNotification } from "~/lib/notifs";

// Add OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  // Add CORS headers to POST response
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  console.log('Webhook received:', new Date().toISOString());
  console.log('Request URL:', request.url);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  
  const requestJson = await request.json();
  console.log('Webhook body:', JSON.stringify(requestJson, null, 2));

  let data;
  try {
    console.log('Attempting to parse webhook event...');
    data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
    console.log('Successfully parsed webhook event:', JSON.stringify(data, null, 2));
  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;
    console.error('Error parsing webhook:', error);

    switch (error.name) {
      case "VerifyJsonFarcasterSignature.InvalidDataError":
      case "VerifyJsonFarcasterSignature.InvalidEventDataError":
        // The request data is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 400, headers }
        );
      case "VerifyJsonFarcasterSignature.InvalidAppKeyError":
        // The app key is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 401, headers }
        );
      case "VerifyJsonFarcasterSignature.VerifyAppKeyError":
        // Internal error verifying the app key (caller may want to try again)
        return Response.json(
          { success: false, error: error.message },
          { status: 500, headers }
        );
    }
  }

  const fid = data.fid;
  const event = data.event;
  console.log('Processing event type:', event.event, 'for FID:', fid);

  switch (event.event) {
    case "frame_added":
      console.log('Frame added event received');
      if (event.notificationDetails) {
        console.log('Notification details present, storing...');
        await setUserNotificationDetails(fid, event.notificationDetails);
        console.log('Sending welcome notification...');
        await sendFrameNotification({
          fid,
          title: "Welcome to FunQuotes",
          body: "Frame is now added to your client",
        });
      } else {
        console.log('No notification details, deleting if any exist...');
        await deleteUserNotificationDetails(fid);
      }
      break;

    case "frame_removed":
      console.log('Frame removed event received');
      await deleteUserNotificationDetails(fid);
      break;

    case "notifications_enabled":
      console.log('Notifications enabled event received');
      await setUserNotificationDetails(fid, event.notificationDetails);
      console.log('Sending test notification...');
      await sendFrameNotification({
        fid,
        title: "Ding ding ding",
        body: "Notifications are now enabled",
      });
      break;

    case "notifications_disabled":
      console.log('Notifications disabled event received');
      await deleteUserNotificationDetails(fid);
      break;
  }

  console.log('Webhook processed successfully');
  return Response.json({ success: true }, { headers });
}
