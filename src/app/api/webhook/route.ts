import {
  ParseWebhookEvent,
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/frame-node";
import { NextRequest } from "next/server";
import { saveNotificationDetails, removeNotificationDetails } from "~/lib/redis";
import { sendFrameNotification } from "~/lib/notifs";

export async function POST(request: NextRequest) {
  const requestJson = await request.json();

  let data;
  try {
    data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;

    switch (error.name) {
      case "VerifyJsonFarcasterSignature.InvalidDataError":
      case "VerifyJsonFarcasterSignature.InvalidEventDataError":
        // The request data is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      case "VerifyJsonFarcasterSignature.InvalidAppKeyError":
        // The app key is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 401 }
        );
      case "VerifyJsonFarcasterSignature.VerifyAppKeyError":
        // Internal error verifying the app key (caller may want to try again)
        return Response.json(
          { success: false, error: error.message },
          { status: 500 }
        );
    }
  }

  const fid = data.fid;
  const event = data.event;

  switch (event.event) {
    case "frame_added":
      console.log(
        event.notificationDetails
          ? `Got frame_added event for fid ${fid} with notification token ${event.notificationDetails.token} and url ${event.notificationDetails.url}`
          : `Got frame_added event for fid ${fid} with no notification details`
      );

      if (event.notificationDetails) {
        await saveNotificationDetails(fid, {
          token: event.notificationDetails.token,
          url: event.notificationDetails.url
        });

        const result = await sendFrameNotification({
          fid,
          title: "Welcome to FunQuotes",
          body: "Start creating and sharing amazing quotes with your friends! 🎉",
        });

        if (result.state === "error") {
          console.error('Failed to send welcome notification:', result.error);
        } else if (result.state === "rate_limit") {
          console.log('Welcome notification rate limited');
        } else if (result.state === "no_token") {
          console.log('No notification token found');
        } else {
          console.log('Welcome notification sent successfully');
        }
      } else {
        await removeNotificationDetails(fid);
      }
      break;

    case "frame_removed":
      console.log(`Got frame_removed event for fid ${fid}`);
      await removeNotificationDetails(fid);
      break;

    case "notifications_enabled":
      console.log('Received notifications_enabled event');
      
      if (!event.notificationDetails) {
        console.error(`Got notifications_enabled event for fid ${fid} but no notification details`);
        return Response.json(
          { success: false, error: 'No notification details provided' },
          { status: 400 }
        );
      }

      await saveNotificationDetails(fid, {
        token: event.notificationDetails.token,
        url: event.notificationDetails.url
      });

      const enableResult = await sendFrameNotification({
        fid,
        title: "Notifications Enabled",
        body: "You'll now receive notifications from FunQuotes! 🔔",
      });

      if (enableResult.state === "error") {
        console.error('Failed to send notification enabled confirmation:', enableResult.error);
      } else if (enableResult.state === "rate_limit") {
        console.log('Notification enabled confirmation rate limited');
      } else if (enableResult.state === "no_token") {
        console.log('No notification token found');
      } else {
        console.log('Notification enabled confirmation sent successfully');
      }
      break;

    case "notifications_disabled":
      console.log(`Got notifications_disabled event for fid ${fid}`);
      await removeNotificationDetails(fid);
      break;
  }

  return Response.json({ success: true });
}
