/// <reference types="node" />

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjE1NDA5LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NjA5NTU5MDYyMUE4YUZGM2ZjOTY0QjEwYzMzN2EzNzVjNTI3OTI0OCJ9",
      payload: "eyJkb21haW4iOiJhMzA1NDNjNWQ3Nzkubmdyb2suYXBwIn0",
      signature:
        "MHhmZTg1N2FhOWM1ZTE1OTljZWI1YzI4OWQ5ZjNjN2ViYWFlMjA3Njg3YWIyYzhiZGNiMjZjY2YxYTlkYzU4OGI5MTZjYjFmOWY4ODkyOTVlNjRmNjlkODIxODVhN2Q2ZjlmZjhmN2Q3OWQ1NmUyNjU4NTkwOGM2YzhhMTI1NDEyNDFi",
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
