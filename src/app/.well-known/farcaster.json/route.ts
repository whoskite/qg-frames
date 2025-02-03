/// <reference types="node" />

export async function GET() {
  try {
    const appUrl = process.env.NEXT_PUBLIC_URL;
    if (!appUrl) {
      console.error('NEXT_PUBLIC_URL is not set');
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    console.log('Serving manifest with appUrl:', appUrl);

    const config = {
      accountAssociation: {
        header: "eyJmaWQiOjE1NDA5LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NjA5NTU5MDYyMUE4YUZGM2ZjOTY0QjEwYzMzN2EzNzVjNTI3OTI0OCJ9",
        payload: "eyJkb21haW4iOiJxZy1mcmFtZXMudmVyY2VsLmFwcCJ9",
        signature: "MHg2NzlmYmRkMGRiODExNTY2OTg0ZDRkYWM1MDBkMTAxYzNjZmRhMzQ5MDM5YzZjMDZlNTgzZmFhZmM3ODgyNDgwMWY0MDNkYTJkODkxY2ExNzQ1MmUwNDY5NjE1M2IxZjE3YzU3NjgyZmVhOWMwNjZlNWI5NzRkMjU0ZTMzMmI3YjFj"
      },
      frame: {
        version: "1",
        name: "FunQuotes",
        iconUrl: `${appUrl}/logo.png`,
        homeUrl: appUrl,
        imageUrl: `${appUrl}/Background_Nature_1_pexels-asumaani-16545605.jpg`,
        buttonTitle: "Generate Quote",
        splashImageUrl: `${appUrl}/logo.png`,
        splashBackgroundColor: "#000000",
        webhookUrl: `${appUrl}/api/webhook`
      }
    };

    // Add proper CORS and caching headers
    return new Response(JSON.stringify(config, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving manifest:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
