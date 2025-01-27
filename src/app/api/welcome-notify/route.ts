import {
  SendNotificationRequest,
  sendNotificationResponseSchema,
} from "@farcaster/frame-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  token: z.string(),
  url: z.string(),
  targetUrl: z.string(),
});

export async function POST(request: Request) {
  try {
    const requestJson = await request.json();
    const requestBody = requestSchema.safeParse(requestJson);

    if (requestBody.success === false) {
      return NextResponse.json(
        { success: false, errors: requestBody.error.errors },
        { status: 400 }
      );
    }

    const response = await fetch(requestBody.data.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title: "Welcome to FunQuotes",
        body: "Start creating and sharing amazing quotes with your friends! 🎉",
        targetUrl: requestBody.data.targetUrl,
        tokens: [requestBody.data.token],
      } satisfies SendNotificationRequest),
    });

    const responseJson = await response.json();

    if (response.status === 200) {
      // Ensure correct response
      const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
      if (responseBody.success === false) {
        return NextResponse.json(
          { success: false, errors: responseBody.error.errors },
          { status: 500 }
        );
      }

      // Fail when rate limited
      if (responseBody.data.result.rateLimitedTokens.length) {
        return NextResponse.json(
          { success: false, error: "Rate limited" },
          { status: 429 }
        );
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: responseJson },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending welcome notification:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome notification' },
      { status: 500 }
    );
  }
} 