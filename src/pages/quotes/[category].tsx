import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FaArrowLeft, FaHeart } from 'react-icons/fa';
import quotesData from '../../data/quotes.json';

interface QuoteData {
  id: string;
  text: string;
  author: string;
  source: string;
}

interface QuotesDatabase {
  [key: string]: QuoteData[];
}

export default function CategoryQuotes() {
  const router = useRouter();
  const { category } = router.query;
  const categorySlug = typeof category === 'string' ? category : '';
  const [likedQuotes, setLikedQuotes] = useState<Set<string>>(new Set());

  const getCategoryTitle = (slug: string): string => {
    const categoryMap: { [key: string]: string } = {
      inspirational: 'Inspirational',
      love: 'Love & Relationships',
      humor: 'Humor',
      wisdom: 'Wisdom',
      success: 'Success',
      career: 'Career & Business',
      leadership: 'Leadership',
      life: 'Life & Mindfulness'
    };
    return categoryMap[slug] || slug;
  };

  // Get quotes for the current category
  const quotes: QuoteData[] = (quotesData as QuotesDatabase)[categorySlug] || [];

  const handleLikeClick = (quoteId: string) => {
    setLikedQuotes(prev => {
      const newLikes = new Set(prev);
      if (newLikes.has(quoteId)) {
        newLikes.delete(quoteId);
      } else {
        newLikes.add(quoteId);
      }
      return newLikes;
    });
  };

  if (!category) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="mb-8">
        <Link href="/Categories" className="inline-flex items-center text-primary-500 hover:text-primary-600 transition-colors">
          <FaArrowLeft className="mr-2" />
          Back to Categories
        </Link>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{getCategoryTitle(categorySlug)} Quotes</h1>
        <p className="text-gray-400">Find inspiration in our collection of {getCategoryTitle(categorySlug).toLowerCase()} quotes</p>
      </div>

      <div className="grid gap-6">
        {quotes.length > 0 ? (
          quotes.map((quote) => (
            <div
              key={quote.id}
              className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300"
            >
              <blockquote className="text-xl mb-4">&ldquo;{quote.text}&rdquo;</blockquote>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center text-gray-400">
                <div className="flex flex-col">
                  <span className="font-medium">— {quote.author}</span>
                  <span className="text-sm opacity-75">{quote.source}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleLikeClick(quote.id)}
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <FaHeart className={likedQuotes.has(quote.id) ? "text-red-500" : "text-primary-500"} />
                    <span>{likedQuotes.has(quote.id) ? "Liked" : "Like"}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-12">
            No quotes found for this category yet.
          </div>
        )}
      </div>
    </div>
  );
} 