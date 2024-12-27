import { Metadata } from "next";
import App from "./app";

const appUrl = process.env.NEXT_PUBLIC_URL;


const frame = {
  version: "next",
  imageUrl: `${appUrl}/opengraph-image`,
  button: {
    title: "Create Quote",
    action: {
      type: "launch_frame",
      name: "Quote Generator",
      url: appUrl,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#f7f7f7",
    },
  },
};

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Quote Generator",
    openGraph: {
      title: "Quote Generator",
      description: "A quote generator for your Farcaster posts. Created by KITE .// Powered by The POD",
      images: [{
        url: `${appUrl}/frame-cast.png`,
        width: 1200,
        height: 630,
      }],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function Home() {
  return (<App />);
}