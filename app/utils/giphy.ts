export async function getGifForQuote(quote: string) {
  try {
    const searchTerm = quote.split(' ').slice(0, 3).join(' ') // Use first 3 words of quote for search
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${process.env.NEXT_PUBLIC_GIPHY_API_KEY}&q=${encodeURIComponent(
        searchTerm
      )}&limit=1&rating=g`
    )
    const data = await response.json()
    return data.data[0]?.images?.fixed_height?.url || null
  } catch (error) {
    console.error('Error fetching GIF:', error)
    return null
  }
}

