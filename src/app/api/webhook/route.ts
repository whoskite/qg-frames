import { NextResponse } from "next/server";
import { 
  ParseWebhookEvent,
  parseWebhookEvent,
  verifyAppKeyWithNeynar 
} from "@farcaster/frame-node";
import { 
  saveNotificationDetails, 
  removeNotificationDetails 
} from "~/lib/firestore";
import { logAnalyticsEvent } from "~/lib/analytics";

export async function POST(request: Request) {
  try {
    // Get the request body
    const requestJson = await request.json();

    // Parse and validate the webhook event
    let data;
    try {
      data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
    } catch (e: unknown) {
      const error = e as ParseWebhookEvent.ErrorType;

      switch (error.name) {
        case "VerifyJsonFarcasterSignature.InvalidDataError":
        case "VerifyJsonFarcasterSignature.InvalidEventDataError":
          return NextResponse.json(
            { error: "Invalid request data", details: error.message },
            { status: 400 }
          );
        case "VerifyJsonFarcasterSignature.InvalidAppKeyError":
          return NextResponse.json(
            { error: "Invalid app key", details: error.message },
            { status: 401 }
          );
        case "VerifyJsonFarcasterSignature.VerifyAppKeyError":
          return NextResponse.json(
            { error: "Error verifying app key", details: error.message },
            { status: 500 }
          );
        default:
          throw error;
      }
    }

    const { fid, event } = data;

    // Handle different event types
    switch (event.event) {
      case "frame_added": {
        logAnalyticsEvent('frame_added', { fid });
        
        // Save notification details if provided
        if (event.notificationDetails) {
          await saveNotificationDetails(fid, event.notificationDetails);
          logAnalyticsEvent('notifications_enabled_with_frame', { fid });
        }
        break;
      }

      case "frame_removed": {
        logAnalyticsEvent('frame_removed', { fid });
        // Remove notification details when frame is removed
        await removeNotificationDetails(fid);
        break;
      }

      case "notifications_disabled": {
        logAnalyticsEvent('notifications_disabled', { fid });
        // Remove notification details when notifications are disabled
        await removeNotificationDetails(fid);
        break;
      }

      case "notifications_enabled": {
        logAnalyticsEvent('notifications_enabled', { fid });
        // Save new notification details
        if (!event.notificationDetails) {
          return NextResponse.json(
            { error: "Missing notification details" },
            { status: 400 }
          );
        }
        await saveNotificationDetails(fid, event.notificationDetails);
        break;
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    logAnalyticsEvent('webhook_error', {
      error_type: 'unexpected',
      message: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
