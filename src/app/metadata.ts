import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_URL || "https://qg-frames.vercel.app";

const frame = {
  version: "vNext",
  image: `${appUrl}/frame-cast.png`,
  buttons: [
    {
      label: "Create FunQuotes",
      action: "post_redirect"
    }
  ],
  post_url: appUrl,
  input: {
    text: "Share your favorite quotes!",
  },
  accepts_notification_permission: true,
  image_aspect_ratio: "1.91:1"
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "FunQuotes",
    description: "A quote generator for your Farcaster posts. Created by KITE .// /thepod",
    openGraph: {
      title: "FunQuotes",
      description: "A quote generator for your Farcaster posts. Created by KITE .// /thepod",
      images: [{
        url: `${appUrl}/frame-cast.png`,
        width: 1200,
        height: 630,
      }],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
      "fc:frame:image": frame.image,
      "fc:frame:image:aspect_ratio": frame.image_aspect_ratio,
      "fc:frame:post_url": frame.post_url,
      "fc:frame:input:text": frame.input.text,
      "fc:frame:button:1": frame.buttons[0].label,
      "fc:frame:button:1:action": frame.buttons[0].action,
      "fc:frame:accepts_notification_permission": frame.accepts_notification_permission.toString()
    },
  };
} 