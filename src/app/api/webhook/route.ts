/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ParseWebhookEvent,
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/frame-node";
import { NextRequest } from "next/server";
import { setUserNotificationDetails } from "@/lib/kv";
import { FrameNotificationDetails } from "@farcaster/frame-sdk";

// Handle GET requests
export async function GET() {
  return new Response(JSON.stringify({ 
    message: "Webhook endpoint is working. Please use POST method for webhook requests.",
    status: "ok" 
  }), {
    status: 200,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
    }
  });
}

// Handle POST requests
export async function POST(req: NextRequest) {
  // Add CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
  };

  try {
    console.log("Received webhook request"); // Debug log
    const body = await req.json();
    console.log("Webhook body:", body); // Debug log
    
    const { fid, url, token } = body;

    if (!fid || !url || !token) {
      console.log("Missing required fields:", { fid, url, token }); // Debug log
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400,
        headers 
      });
    }

    console.log("Storing notification details for FID:", fid); // Debug log
    await setUserNotificationDetails(fid, { url, token } as FrameNotificationDetails);
    console.log("Successfully stored notification details"); // Debug log

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process webhook" }),
      { status: 500, headers }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
