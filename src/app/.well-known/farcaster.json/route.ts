/// <reference types="node" />

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjE1NDA5LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NjA5NTU5MDYyMUE4YUZGM2ZjOTY0QjEwYzMzN2EzNzVjNTI3OTI0OCJ9",
      payload: "eyJkb21haW4iOiI5YmJiOGZiOWExN2Qubmdyb2suYXBwIn0",
      signature:
        "MHg1ZGU2ZDU0MWM3ZTc4ODExOWE3ZTcxODRjMjI3ZWFmZjFlMzQ5NTVhNjFkYzljYmU0MjcxODRmOTk0YTY5MDM3MDkyM2JkOThmMjhiZWMwYmMzMzk0N2U2OWFlYjBhZDUxYTE1ZjQxZDUzNzY2MTk0ZjA4NjI0NTIzOWE0ZTkxYzFi",
    },
    frame: {
      version: "1",
      name: "FunQuotes",
      iconUrl: `${appUrl}/icon.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/frames/hello/opengraph-image`,
      buttonTitle: "Create FunQuotes",
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#F9C001",
      webhookUrl: `${appUrl}/api/webhook`,
    },
  };

  return Response.json(config);
}
