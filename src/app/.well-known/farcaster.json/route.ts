export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjE1NDA5LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NjA5NTU5MDYyMUE4YUZGM2ZjOTY0QjEwYzMzN2EzNzVjNTI3OTI0OCJ9",
      payload: "eyJkb21haW4iOiJxZy1mcmFtZXMtMnRobnRoMjRxLWtpdGVzLXByb2plY3RzLTM4YWJlZGI5LnZlcmNlbC5hcHAifQ",
      signature:
        "MHhmYjRhNmY1YmEzMWMwNzBmNmM3OWUxN2I3OTJlMWEwYTcwMGIwNzI4OGYzODFmOWMxZTA0YmZjMWYzNzg0ZGEwMWM2NDNjNGYzZTM2N2MwMDg3Yjc4ZGE5OTQ3ODc2NDlmZjAzY2IxNjkwMmQxZmRiM2U0YmRhY2MxNjFjYmU1NDFi",
    },
    frame: {
      version: "1",
      name: "Quote Generator",
      homeUrl: "https://qg-frames.vercel.app//",
      iconUrl: `https://qg-frames.vercel.app//icon.png`,
      imageUrl: `https://qg-frames.vercel.app//image.png`,
      buttonTitle: "Launch Frame",
      splashImageUrl: "https://qg-frames.vercel.app//splash.png",
      splashBackgroundColor: "#f7f7f7",
      webhookUrl: "https://qg-frames.vercel.app//api/webhook",
    },
  };

  return Response.json(config);
}