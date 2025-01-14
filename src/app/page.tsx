import { Metadata } from "next";
import App from "./app";
import { SessionTest } from "~/components/SessionTest";

const appUrl = process.env.NEXT_PUBLIC_URL;

const frame = {
  version: "next",
  imageUrl: `${appUrl}/frame-cast.png`,
  button: {
    title: "Create FunQuotes",
    action: {
      type: "launch_frame",
      name: "FunQuotes",
      url: appUrl,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#F9C001",
    },
  },
};

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "FunQuotes",
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
    },
  };
}

export default function Home() {
  return (
    <main>
      <App />
    </main>
  );
}