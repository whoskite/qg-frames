/// <reference types="node" />

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjE1NDA5LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NjA5NTU5MDYyMUE4YUZGM2ZjOTY0QjEwYzMzN2EzNzVjNTI3OTI0OCJ9",
      payload: "eyJkb21haW4iOiJhcHAuZnVucXVvdGVzLnh5eiJ9",
      signature:
        "MHhmZTYwMmE0OThhZDE3MDQ3MDUxMTJkNGI0NTIxZmM1ZTVhYjVhMjgzYWMzOGNkYzZhNTdiOTkwYjRlYzgxN2IwNTY1Y2IwZjlmOGRhYTY2YzY4MWYyYmE4NWM2YjUxNDBjMTk5YzU2Nzg5YjNjMjE3Yjk5NzVhMGE2ZjRlZjQ2MDFi",
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
      webhookUrl: `https://api.neynar.com/f/app/355d80b9-972b-4427-89d2-bdd2d6e83b6d/event`,
    },
  };

  return Response.json(config);
}
