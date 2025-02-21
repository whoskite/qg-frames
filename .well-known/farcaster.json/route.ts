/// <reference types="node" />

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjE1NDA5LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NjA5NTU5MDYyMUE4YUZGM2ZjOTY0QjEwYzMzN2EzNzVjNTI3OTI0OCJ9",
      payload: "eyJkb21haW4iOiIyMmI3ZDJiYzUzZjgubmdyb2suYXBwIn0",
      signature:
        "MHg3NzUwMzA2MjkwNGRlYTNiZTljMDc5NWVhMTEyY2FlNDliMmE1MTYyOWU0YmRkMGE3OTVlMTcyNDJmZDBhMzQ5MDdhNDY1YTY4NjM2ZjI1MWE5ODFlMTU3ZjI2ZDY0ZmE1MTBhZmZhMDEzM2ZiYWE1MWMyZGE0NGZjMjNlYmUyMTFi",
    },
    frame: {
      version: "1",
      name: "FunQuotes",
      iconUrl: `${appUrl}/icon.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/frame-cast.png`,
      buttonTitle: "Create FunQuotes",
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#F9C001",
      webhookUrl: `${appUrl}/api/webhook`,
    },
  };

  return Response.json(config);
}
