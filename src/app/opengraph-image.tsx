import { ImageResponse } from "next/og";

export const runtime = 'edge';

export const alt = "FunQuotes by KITE";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to right, #4F46E5, #7C3AED)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
          }}
        >
          FunQuotes
        </div>
        <div
          style={{
            fontSize: 30,
            color: 'white',
            textAlign: 'center',
          }}
        >
          Generate fun and inspiring quotes for your Farcaster posts
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
