import { ImageResponse } from "next/og";

export const alt = "FunQuotes by kite";
export const size = {
  width: 600,
  height: 400,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div tw="h-full w-full flex flex-col justify-center items-center relative bg-[#FF9F1C]">
        <div tw="flex w-full h-full p-8 gap-4">
          {/* Left side - GIF placeholder */}
          <div tw="flex-1 bg-[#E5E5E5] rounded-3xl flex items-center justify-center">
            <p tw="text-2xl text-gray-600">GIF HERE</p>
          </div>
          
          {/* Right side - Quote */}
          <div tw="flex-1 bg-[#00FFC2] rounded-3xl flex items-center justify-center p-8">
            <p tw="text-2xl text-black text-center">&quot;Insert quote here&quot;</p>
          </div>
        </div>
        
        {/* Logo position */}
        <div tw="absolute bottom-4">
          <p tw="text-xl font-bold">FunQuotes</p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
