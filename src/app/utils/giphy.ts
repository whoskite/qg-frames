type MoodCategory = {
  style: string;
  searchTerms: string[];
  fallbackTerms: string[];
};

const moodCategories: Record<string, MoodCategory> = {
  inspirational: {
    style: 'inspirational',
    searchTerms: ['motivation', 'success', 'achievement', 'victory', 'triumph'],
    fallbackTerms: ['celebration', 'winning', 'accomplishment']
  },
  funny: {
    style: 'funny',
    searchTerms: ['funny', 'hilarious', 'laugh', 'comedy', 'humor'],
    fallbackTerms: ['lol', 'joke', 'silly']
  },
  thoughtful: {
    style: 'thoughtful',
    searchTerms: ['thinking', 'contemplative', 'mindful', 'reflection'],
    fallbackTerms: ['peaceful', 'meditation', 'calm']
  },
  witty: {
    style: 'witty',
    searchTerms: ['clever', 'smart', 'genius', 'brilliant'],
    fallbackTerms: ['wink', 'smirk', 'intelligence']
  },
  profound: {
    style: 'profound',
    searchTerms: ['deep', 'wisdom', 'enlightenment', 'realization'],
    fallbackTerms: ['universe', 'insight', 'epiphany']
  }
};

export async function getGifForQuote(quote: string, quoteStyle: string = 'inspirational') {
  try {
    // Get mood category based on quote style
    const moodCategory = moodCategories[quoteStyle.toLowerCase()] || moodCategories.inspirational;
    
    // Extract key words from quote (excluding common words)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const keywords = quote
      .toLowerCase()
      .split(' ')
      .filter(word => !commonWords.has(word))
      .slice(0, 2);
    
    // Combine quote keywords with mood terms
    const randomMoodTerm = moodCategory.searchTerms[Math.floor(Math.random() * moodCategory.searchTerms.length)];
    const searchTerms = [...keywords, randomMoodTerm];
    
    // Build search query
    const searchQuery = encodeURIComponent(searchTerms.join(' '));
    
    // Use the API route instead of direct GIPHY API call
    const response = await fetch(`/api/giphy?search=${searchQuery}`);

    if (!response.ok) {
      // If first attempt fails, try with fallback terms
      const fallbackTerm = moodCategory.fallbackTerms[Math.floor(Math.random() * moodCategory.fallbackTerms.length)];
      const fallbackResponse = await fetch(`/api/giphy?search=${encodeURIComponent(fallbackTerm)}`);
      
      if (!fallbackResponse.ok) {
        throw new Error('Failed to fetch GIF');
      }
      
      const fallbackData = await fallbackResponse.json();
      const randomIndex = Math.floor(Math.random() * Math.min(5, fallbackData.data.length));
      return fallbackData.data[randomIndex]?.images?.fixed_height?.url || null;
    }

    const data = await response.json();
    
    // Get a random GIF from the results
    const randomIndex = Math.floor(Math.random() * Math.min(5, data.data.length));
    return data.data[randomIndex]?.images?.fixed_height?.url || null;
    
  } catch (error) {
    console.error('Error fetching GIF:', error);
    return null;
  }
} 

