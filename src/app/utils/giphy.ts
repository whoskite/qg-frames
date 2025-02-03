type MoodCategory = {
  style: string;
  searchTerms: string[];
  fallbackTerms: string[];
  emotions: string[];
};

const moodCategories: Record<string, MoodCategory> = {
  inspirational: {
    style: 'inspirational',
    searchTerms: ['motivation', 'success', 'achievement', 'victory', 'triumph', 'inspire', 'determination', 'perseverance', 'ambition', 'dream big'],
    fallbackTerms: ['celebration', 'winning', 'accomplishment', 'champion', 'breakthrough', 'milestone', 'overcome'],
    emotions: ['happy', 'proud', 'confident', 'energetic', 'enthusiastic']
  },
  funny: {
    style: 'funny',
    searchTerms: ['funny', 'hilarious', 'laugh', 'comedy', 'humor', 'joke', 'silly', 'goofy', 'amusing', 'entertaining'],
    fallbackTerms: ['lol', 'haha', 'fun', 'smile', 'giggle', 'playful', 'cheerful'],
    emotions: ['happy', 'amused', 'silly', 'playful', 'joyful']
  },
  thoughtful: {
    style: 'thoughtful',
    searchTerms: ['thinking', 'contemplative', 'mindful', 'reflection', 'ponder', 'wonder', 'introspective', 'philosophical'],
    fallbackTerms: ['peaceful', 'meditation', 'calm', 'serenity', 'tranquil', 'wisdom'],
    emotions: ['calm', 'peaceful', 'reflective', 'serene', 'mindful']
  },
  witty: {
    style: 'witty',
    searchTerms: ['clever', 'smart', 'genius', 'brilliant', 'witty', 'intellectual', 'sharp', 'quick'],
    fallbackTerms: ['wink', 'smirk', 'intelligence', 'aha moment', 'eureka', 'clever idea'],
    emotions: ['clever', 'amused', 'confident', 'smart', 'proud']
  },
  profound: {
    style: 'profound',
    searchTerms: ['deep', 'wisdom', 'enlightenment', 'realization', 'truth', 'insight', 'understanding', 'awakening'],
    fallbackTerms: ['universe', 'insight', 'epiphany', 'revelation', 'discovery', 'meaning'],
    emotions: ['amazed', 'inspired', 'enlightened', 'thoughtful', 'moved']
  }
};

export async function getGifForQuote(quote: string, quoteStyle: string = 'inspirational') {
  try {
    // Get mood category based on quote style
    const moodCategory = moodCategories[quoteStyle.toLowerCase()] || moodCategories.inspirational;
    
    // Extract key words from quote (excluding common words)
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can'
    ]);

    // Get meaningful keywords from the quote
    const keywords = quote
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(' ')
      .filter(word => word.length > 3 && !commonWords.has(word)) // Only words longer than 3 chars
      .slice(0, 2); // Take up to 2 keywords

    // Get random terms from mood category
    const getRandomItems = (arr: string[], count: number) => {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    };

    // Build search query with variety
    const searchComponents = [
      ...keywords,
      ...getRandomItems(moodCategory.searchTerms, 1),
      ...getRandomItems(moodCategory.emotions, 1)
    ];

    // Randomize the order of search components
    const searchQuery = encodeURIComponent(
      searchComponents
        .filter(Boolean)
        .sort(() => Math.random() - 0.5)
        .join(' ')
    );
    
    // Use the API route with improved parameters
    const response = await fetch(`/api/giphy?search=${searchQuery}`);

    if (!response.ok) {
      // If first attempt fails, try with fallback terms
      const fallbackTerms = [
        ...getRandomItems(moodCategory.fallbackTerms, 1),
        ...getRandomItems(moodCategory.emotions, 1)
      ];
      
      const fallbackQuery = encodeURIComponent(fallbackTerms.join(' '));
      const fallbackResponse = await fetch(`/api/giphy?search=${fallbackQuery}`);
      
      if (!fallbackResponse.ok) {
        throw new Error('Failed to fetch GIF');
      }
      
      const fallbackData = await fallbackResponse.json();
      return fallbackData.data[0]?.images?.fixed_height?.url || null;
    }

    const data = await response.json();
    return data.data[0]?.images?.fixed_height?.url || null;
    
  } catch (error) {
    console.error('Error fetching GIF:', error);
    return null;
  }
} 
