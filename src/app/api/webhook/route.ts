import { NextRequest } from "next/server";
import { z } from "zod";
import { saveNotificationDetails, removeNotificationDetails } from "~/lib/firestore";

// Define the schemas since they're not exported from frame-sdk
const eventHeaderSchema = z.object({
  fid: z.number(),
  network: z.number(),
  timestamp: z.number(),
  version: z.number(),
});

const eventPayloadSchema = z.object({
  event: z.enum(["frame-added", "frame-removed", "notifications-enabled", "notifications-disabled"]),
  notificationDetails: z.object({
    token: z.string(),
    url: z.string(),
  }).optional(),
});

const eventSchema = z.object({
  header: z.string(),
  payload: z.string(),
  signature: z.string(),
});

export async function POST(request: NextRequest) {
  console.log('Received webhook event:', new Date().toISOString());
  const requestJson = await request.json();
  console.log('Request body:', JSON.stringify(requestJson, null, 2));

  const requestBody = eventSchema.safeParse(requestJson);

  if (requestBody.success === false) {
    console.error('Invalid event schema:', requestBody.error.errors);
    return Response.json(
      { success: false, errors: requestBody.error.errors },
      { status: 400 }
    );
  }

  // Parse and validate header
  const headerData = JSON.parse(
    Buffer.from(requestBody.data.header, "base64url").toString("utf-8")
  );
  console.log('Decoded header:', headerData);
  
  const header = eventHeaderSchema.safeParse(headerData);
  if (header.success === false) {
    console.error('Invalid header schema:', header.error.errors);
    return Response.json(
      { success: false, errors: header.error.errors },
      { status: 400 }
    );
  }
  const fid = header.data.fid;

  // Parse and validate payload
  const payloadData = JSON.parse(
    Buffer.from(requestBody.data.payload, "base64url").toString("utf-8")
  );
  console.log('Decoded payload:', payloadData);
  
  const payload = eventPayloadSchema.safeParse(payloadData);

  if (payload.success === false) {
    console.error('Invalid payload schema:', payload.error.errors);
    return Response.json(
      { success: false, errors: payload.error.errors },
      { status: 400 }
    );
  }

  try {
    switch (payload.data.event) {
      case "frame-added":
        if (payload.data.notificationDetails) {
          console.log(
            `Got frame-added event for fid ${fid} with notification token ${payload.data.notificationDetails.token} and url ${payload.data.notificationDetails.url}`
          );
          // Save notification details
          await saveNotificationDetails(fid, payload.data.notificationDetails);
          // Send a welcome notification
          await fetch("/api/send-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: payload.data.notificationDetails.token,
              url: payload.data.notificationDetails.url,
              targetUrl: process.env.NEXT_PUBLIC_URL || "https://qg-frames.vercel.app",
            }),
          });
        } else {
          console.log(`Got frame-added event for fid ${fid} with no notification details`);
        }
        break;
      case "frame-removed":
        console.log(`Got frame-removed event for fid ${fid}`);
        await removeNotificationDetails(fid);
        break;
      case "notifications-enabled":
        if (payload.data.notificationDetails) {
          console.log(
            `Got notifications-enabled event for fid ${fid} with token ${
              payload.data.notificationDetails.token
            } and url ${payload.data.notificationDetails.url}`
          );
          await saveNotificationDetails(fid, payload.data.notificationDetails);
          // Send a welcome notification
          await fetch("/api/send-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: payload.data.notificationDetails.token,
              url: payload.data.notificationDetails.url,
              targetUrl: process.env.NEXT_PUBLIC_URL || "https://qg-frames.vercel.app",
            }),
          });
        }
        break;
      case "notifications-disabled":
        console.log(`Got notifications-disabled event for fid ${fid}`);
        await removeNotificationDetails(fid);
        break;
    }

    console.log('Successfully processed webhook event');
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
