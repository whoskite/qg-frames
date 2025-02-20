/// <reference types="node" />

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjE1NDA5LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NjA5NTU5MDYyMUE4YUZGM2ZjOTY0QjEwYzMzN2EzNzVjNTI3OTI0OCJ9",
      payload: "eyJkb21haW4iOiI4ODY2YzA0OGFhYjcubmdyb2suYXBwIn0",
      signature:
        "MHg4MjE2ZDlmMDM0YmUxYTQ2NWJkNWQ3NThmNzc1MjZiNzFjOGQ3ZmY3NzJmM2ZjMTkwNzBhM2YxZWRkY2E0ODViNDg2NDg3NWE0ZjZkZTU0OGYyYWUzYWQ5NWViYjc1NTk3N2ZiOTJiNDEwZjBhMzdmYmEzNjcyYTEwYjYyMTQ3YzFj",
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
