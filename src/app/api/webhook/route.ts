/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ParseWebhookEvent,
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/frame-node";
import { NextRequest } from "next/server";
import { setUserNotificationDetails } from "@/lib/kv";
import { FrameNotificationDetails } from "@farcaster/frame-sdk";

export async function POST(req: NextRequest) {
  try {
    const { fid, url, token } = await req.json();

    if (!fid || !url || !token) {
      return new Response("Missing required fields", { status: 400 });
    }

    await setUserNotificationDetails(fid, { url, token } as FrameNotificationDetails);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process webhook" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
