import { NextRequest } from "next/server";
import { z } from "zod";
import { saveNotificationDetails, removeNotificationDetails } from "~/lib/firestore";

// Define our own schemas since they're not exported from frame-sdk
const eventHeaderSchema = z.object({
  fid: z.number(),
  network: z.number(),
  timestamp: z.number(),
  version: z.number(),
});

const notificationDetailsSchema = z.object({
  token: z.string(),
  url: z.string(),
});

const eventPayloadSchema = z.object({
  event: z.enum(["frame-added", "frame-removed", "notifications-enabled", "notifications-disabled"]),
  notificationDetails: notificationDetailsSchema.optional(),
});

const eventSchema = z.object({
  header: z.string(),
  payload: z.string(),
  signature: z.string(),
});

export async function POST(request: NextRequest) {
  console.log('🔔 Received webhook event:', new Date().toISOString());
  
  try {
    const requestJson = await request.json();
    console.log('📥 Request body:', JSON.stringify(requestJson, null, 2));

    const requestBody = eventSchema.safeParse(requestJson);
    if (requestBody.success === false) {
      console.error('❌ Invalid event schema:', requestBody.error.errors);
      return Response.json(
        { success: false, errors: requestBody.error.errors },
        { status: 400 }
      );
    }

    // TODO: verify signature

    const headerData = JSON.parse(
      Buffer.from(requestBody.data.header, "base64url").toString("utf-8")
    );
    console.log('📋 Decoded header:', headerData);
    
    const header = eventHeaderSchema.safeParse(headerData);
    if (header.success === false) {
      console.error('❌ Invalid header schema:', header.error.errors);
      return Response.json(
        { success: false, errors: header.error.errors },
        { status: 400 }
      );
    }
    const fid = header.data.fid;

    const payloadData = JSON.parse(
      Buffer.from(requestBody.data.payload, "base64url").toString("utf-8")
    );
    console.log('📦 Decoded payload:', payloadData);
    
    const payload = eventPayloadSchema.safeParse(payloadData);
    if (payload.success === false) {
      console.error('❌ Invalid payload schema:', payload.error.errors);
      return Response.json(
        { success: false, errors: payload.error.errors },
        { status: 400 }
      );
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || request.headers.get('host') || 'https://qg-frames.vercel.app';
      const notificationEndpoint = new URL('/api/send-notification', baseUrl).toString();
      
      switch (payload.data.event) {
        case "frame-added":
          if (payload.data.notificationDetails) {
            console.log(
              `✨ Got frame-added event for fid ${fid} with notification token ${payload.data.notificationDetails.token}`
            );
            // Save notification details
            await saveNotificationDetails(fid, payload.data.notificationDetails);
            console.log('💾 Saved notification details to Firestore');
            
            // Send a welcome notification
            const frameAddedResponse = await fetch(notificationEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: payload.data.notificationDetails.token,
                url: payload.data.notificationDetails.url,
                targetUrl: baseUrl,
              }),
            });
            
            const frameAddedResult = await frameAddedResponse.json();
            console.log('📨 Welcome notification response:', frameAddedResult);
          } else {
            console.log(`ℹ️ Got frame-added event for fid ${fid} with no notification details`);
          }
          break;
          
        case "frame-removed":
          console.log(`🗑️ Got frame-removed event for fid ${fid}`);
          await removeNotificationDetails(fid);
          break;
          
        case "notifications-enabled":
          if (payload.data.notificationDetails) {
            console.log(
              `🔔 Got notifications-enabled event for fid ${fid} with token ${payload.data.notificationDetails.token}`
            );
            await saveNotificationDetails(fid, payload.data.notificationDetails);
            console.log('💾 Saved notification details to Firestore');
            
            // Send a welcome notification
            const notifyResponse = await fetch(notificationEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: payload.data.notificationDetails.token,
                url: payload.data.notificationDetails.url,
                targetUrl: baseUrl,
              }),
            });
            
            const notifyResult = await notifyResponse.json();
            console.log('📨 Welcome notification response:', notifyResult);
          }
          break;
          
        case "notifications-disabled":
          console.log(`🔕 Got notifications-disabled event for fid ${fid}`);
          await removeNotificationDetails(fid);
          break;
      }

      console.log('✅ Successfully processed webhook event');
      return Response.json({ success: true });
    } catch (error) {
      console.error('❌ Error in webhook handler:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      return Response.json({ 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Fatal error in webhook:', error);
    return Response.json({ 
      success: false, 
      error: 'Fatal error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}