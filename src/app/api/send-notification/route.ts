import { notificationDetailsSchema } from "@farcaster/frame-sdk";
import { NextRequest } from "next/server";
import { z } from "zod";
import { setUserNotificationDetails } from "~/lib/kv";
import { sendFrameNotification } from "~/lib/notifs";

const requestSchema = z.object({
  fid: z.number(),
  title: z.string(),
  body: z.string(),
  targetUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const requestJson = await request.json();
    const requestBody = requestSchema.safeParse(requestJson);

    if (requestBody.success === false) {
      return Response.json(
        { success: false, errors: requestBody.error.errors },
        { status: 400 }
      );
    }

    const { fid, title, body, targetUrl } = requestBody.data;

    const sendResult = await sendFrameNotification({
      fid,
      title,
      body,
      url: targetUrl,
    });

    if (sendResult.state === "error") {
      return Response.json(
        { success: false, error: sendResult.error },
        { status: 500 }
      );
    } else if (sendResult.state === "rate_limit") {
      return Response.json(
        { success: false, error: "Rate limited" },
        { status: 429 }
      );
    } else if (sendResult.state === "no_token") {
      return Response.json(
        { success: false, error: "No notification token found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error sending notification:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
