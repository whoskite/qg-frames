import { NextRequest } from "next/server";
import { getUserNotificationDetails } from "@/lib/kv";
import { sendFrameNotification } from "@/lib/notifs";

export async function POST(req: NextRequest) {
  try {
    const { fid, title, body } = await req.json();

    if (!fid || !title || !body) {
      return new Response("Missing required fields", { status: 400 });
    }

    const notificationDetails = await getUserNotificationDetails(fid);
    if (!notificationDetails) {
      return new Response(JSON.stringify({ error: "no_token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await sendFrameNotification({ fid, title, body });

    return new Response(JSON.stringify({ success: result.state === "success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
