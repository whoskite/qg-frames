/// <reference types="node" />

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjE1NDA5LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NjA5NTU5MDYyMUE4YUZGM2ZjOTY0QjEwYzMzN2EzNzVjNTI3OTI0OCJ9",
      payload: "eyJkb21haW4iOiJxZy1mcmFtZXMudmVyY2VsLmFwcCJ9",
      signature:
        "MHg2NzlmYmRkMGRiODExNTY2OTg0ZDRkYWM1MDBkMTAxYzNjZmRhMzQ5MDM5YzZjMDZlNTgzZmFhZmM3ODgyNDgwMWY0MDNkYTJkODkxY2ExNzQ1MmUwNDY5NjE1M2IxZjE3YzU3NjgyZmVhOWMwNjZlNWI5NzRkMjU0ZTMzMmI3YjFj",
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
