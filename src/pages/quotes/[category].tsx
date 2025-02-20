import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FaArrowLeft, FaHeart } from 'react-icons/fa';
import { Quote } from '../../types/categories';

// Example quotes data - replace with your actual data source
const SAMPLE_QUOTES: { [key: string]: Quote[] } = {
  inspirational: [
    { 
      id: 1, 
      text: "The only way to do great work is to love what you do.", 
      author: "Steve Jobs", 
      categoryId: 1,
      likes: 150,
      createdAt: new Date().toISOString()
    },
    { 
      id: 2, 
      text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", 
      author: "Winston Churchill", 
      categoryId: 1,
      likes: 120,
      createdAt: new Date().toISOString()
    },
  ],
  love: [
    { 
      id: 3, 
      text: "Love all, trust a few, do wrong to none.", 
      author: "William Shakespeare", 
      categoryId: 2,
      likes: 89,
      createdAt: new Date().toISOString()
    },
    { 
      id: 4, 
      text: "The best thing to hold onto in life is each other.", 
      author: "Audrey Hepburn", 
      categoryId: 2,
      likes: 76,
      createdAt: new Date().toISOString()
    },
  ],
};

export default function CategoryQuotes() {
  const router = useRouter();
  const { category } = router.query;
  const categorySlug = typeof category === 'string' ? category : '';

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
  const quotes = SAMPLE_QUOTES[categorySlug] || [];

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
              <div className="flex justify-between items-center text-gray-400">
                <span>— {quote.author}</span>
                <div className="flex items-center gap-2">
                  <button 
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <FaHeart className="text-primary-500" />
                    <span>{quote.likes}</span>
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