// If this is in an API route or Server Component
const apiKey = process.env.GIPHY_API_KEY
if (!apiKey) {
  throw new Error('GIPHY_API_KEY is missing from environment variables')
}

const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${query}&limit=1&rating=g` 