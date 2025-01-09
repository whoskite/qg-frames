import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
  baseOptions: {
    headers: {
      "x-neynar-experimental": true,
    },
  },
});

// Initialize the Neynar client
export const neynarClient = new NeynarAPIClient(config); 