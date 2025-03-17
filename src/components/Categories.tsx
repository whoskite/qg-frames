import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronRight, ChevronLeft, Heart, Lock } from 'lucide-react';
import { Card } from './ui/card';
import type { Category, QuotesData, CategoryQuote } from '../types/quotes';
import quotesData from '../data/quotes.json';
import { FaLightbulb, FaHeart, FaLaugh, FaBook, FaStar, FaBriefcase, FaUsers, FaLeaf, FaBrain, FaPaintBrush, FaFeather, FaTrophy, FaDove, FaHandsHelping, FaRulerCombined } from 'react-icons/fa';
import { GiMeditation } from 'react-icons/gi';
import type { IconType } from 'react-icons';
import type { QuoteHistoryItem } from '../types/quotes';
import { getCommunityQuotes } from '../lib/firestore';

interface CategoriesProps {
  onSelectQuote: (text: string, author: string, source: string, gifUrl: string | null) => void;
  onSelectCategory: (quotes: CategoryQuote[], initialIndex: number) => void;
  onToggleFavorite: (quote: CategoryQuote) => void;
  onShare: (quote: CategoryQuote) => void;
  favorites: QuoteHistoryItem[];
}

const categoryIcons: { [key: string]: IconType } = {
  'Motivation': FaLightbulb,
  'Love': FaHeart,
  'Humor': FaLaugh,
  'Wisdom': FaBook,
  'Success': FaStar,
  'Career': FaBriefcase,
  'Leadership': FaUsers,
  'Life': FaLeaf,
  'Mindfulness': GiMeditation,
  'Creativity': FaPaintBrush,
  'Design': FaRulerCombined,
  'Philosophy': FaBrain,
  'Poetry': FaFeather,
  'Achievement': FaTrophy,
  'Funny': FaLaugh,
  'Peace': FaDove,
  'Compassion': FaHandsHelping
};

// Sample community quotes as fallback
const sampleCommunityQuotes: CategoryQuote[] = [
  {
    id: "comm1",
    text: "The best way to predict the future is to create it.",
    author: "Community Member",
    source: "Community Submission",
    topics: ["inspiration", "future", "creativity"],
    year: 2023
  },
  {
    id: "comm2",
    text: "Every moment is a fresh beginning.",
    author: "Community Member",
    source: "Community Submission",
    topics: ["beginnings", "hope", "opportunity"],
    year: 2023
  },
  {
    id: "comm3",
    text: "Your perspective is unique. It's important and it counts.",
    author: "Community Member",
    source: "Community Submission",
    topics: ["perspective", "uniqueness", "value"],
    year: 2023
  },
  {
    id: "comm4",
    text: "The only limit to our realization of tomorrow will be our doubts of today.",
    author: "Community Member",
    source: "Community Submission",
    topics: ["doubt", "future", "possibility"],
    year: 2023
  },
  {
    id: "comm5",
    text: "Creativity is intelligence having fun.",
    author: "Community Member",
    source: "Community Submission",
    topics: ["creativity", "intelligence", "fun"],
    year: 2023
  }
];

export const Categories: React.FC<CategoriesProps> = ({ onSelectQuote, onSelectCategory, onToggleFavorite, onShare }) => {
  const data = quotesData as QuotesData;
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [communityQuotes, setCommunityQuotes] = useState<CategoryQuote[]>(sampleCommunityQuotes);
  const [isLoadingCommunityQuotes, setIsLoadingCommunityQuotes] = useState(true);

  const filteredCategories = data.categories;

  // Fetch community quotes from Firebase
  useEffect(() => {
    const fetchCommunityQuotes = async () => {
      try {
        setIsLoadingCommunityQuotes(true);
        const quotes = await getCommunityQuotes(10); // Get up to 10 community quotes
        
        if (quotes && quotes.length > 0) {
          // Convert to CategoryQuote format
          const formattedQuotes: CategoryQuote[] = quotes.map(quote => ({
            id: quote.id,
            text: quote.text,
            author: quote.author,
            source: "Community Submission",
            topics: quote.topics || [],
            year: quote.year || new Date().getFullYear()
          }));
          
          setCommunityQuotes(formattedQuotes);
        }
      } catch (error) {
        console.error('Error fetching community quotes:', error);
        // Keep the sample quotes as fallback
      } finally {
        setIsLoadingCommunityQuotes(false);
      }
    };

    fetchCommunityQuotes();
  }, []);

  const handleQuoteSelection = (quotes: CategoryQuote[]) => {
    const initialIndex = Math.floor(Math.random() * quotes.length);
    const selectedQuote = quotes[initialIndex];
    
    onSelectQuote(
      selectedQuote.text,
      selectedQuote.author,
      selectedQuote.source || '',
      null
    );

    // Only call onSelectCategory if it's provided
    if (onSelectCategory) {
      onSelectCategory(quotes.map(quote => ({
        id: quote.id,
        text: quote.text,
        author: quote.author,
        source: quote.source,
        topics: quote.topics,
        year: quote.year
      })), initialIndex);
    }
  };

  const handlePrevQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentQuoteIndex((prev) => 
      prev === 0 ? communityQuotes.length - 1 : prev - 1
    );
  };

  const handleNextQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentQuoteIndex((prev) => 
      prev === communityQuotes.length - 1 ? 0 : prev + 1
    );
  };

  const handleShareQuote = (e: React.MouseEvent, quote: CategoryQuote) => {
    e.stopPropagation();
    
    // Check if it's a community quote
    if (quote.source === "Community Submission") {
      // Show tooltip explaining why sharing is disabled
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 3000);
      return;
    }
    
    if (onShare) {
      onShare(quote);
    }
  };

  const handleFavoriteQuote = (e: React.MouseEvent, quote: CategoryQuote) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(quote);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-white/15 bg-black/20">
        <h2 className="text-xl font-semibold text-white">Categories</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Community Category Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center mb-3">
            <h3 className="text-white text-base font-medium flex items-center">
              <Users className="mr-2 text-blue-400" size={18} />
              Community Quotes
            </h3>
          </div>
          
          <Card 
            className="bg-white/20 hover:bg-white/25 transition-all duration-300 border border-white/15 cursor-pointer p-4 w-full rounded-xl"
            onClick={() => handleQuoteSelection(communityQuotes)}
          >
            <div className="flex flex-col h-full relative">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-white/15 rounded-full px-3 py-1 text-xs text-white font-medium">
                    Community Picks
                  </div>
                  <div className="text-white/80 text-xs font-medium">
                    {communityQuotes.length} quotes
                  </div>
                </div>
                
                <div className="relative mb-4">
                  {isLoadingCommunityQuotes ? (
                    <div className="bg-white/15 rounded-lg p-4 min-h-[100px] flex items-center justify-center">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                    </div>
                  ) : communityQuotes.length > 0 ? (
                    <motion.div 
                      key={currentQuoteIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white/15 rounded-lg p-4 min-h-[100px] relative"
                    >
                      <p className="text-white text-sm italic mb-3 leading-relaxed">&ldquo;{communityQuotes[currentQuoteIndex].text}&rdquo;</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full bg-blue-500/40 flex items-center justify-center mr-2">
                            <Users size={10} className="text-white" />
                          </div>
                          <p className="text-white/95 text-xs">{communityQuotes[currentQuoteIndex].author}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={(e) => handleFavoriteQuote(e, communityQuotes[currentQuoteIndex])}
                            className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
                          >
                            <Heart size={14} className="text-pink-400" />
                          </button>
                          <div className="relative">
                            <button 
                              onClick={(e) => handleShareQuote(e, communityQuotes[currentQuoteIndex])}
                              className="p-1.5 rounded-full hover:bg-white/15 transition-colors opacity-50"
                            >
                              <Lock size={14} className="text-gray-400" />
                            </button>
                            {showShareTooltip && (
                              <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black/80 text-white text-xs rounded shadow-lg z-50">
                                Sharing is disabled for community quotes as they aren&apos;t your own content.
                                <div className="absolute bottom-0 right-3 transform translate-y-1/2 rotate-45 w-2 h-2 bg-black/80"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Navigation arrows inside the content */}
                      {communityQuotes.length > 1 && (
                        <>
                          <button 
                            onClick={handlePrevQuote}
                            className="absolute top-1/2 left-2 transform -translate-y-1/2 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                          >
                            <ChevronLeft size={14} className="text-white" />
                          </button>
                          
                          <button 
                            onClick={handleNextQuote}
                            className="absolute top-1/2 right-2 transform -translate-y-1/2 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                          >
                            <ChevronRight size={14} className="text-white" />
                          </button>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <div className="bg-white/15 rounded-lg p-4 min-h-[100px] flex items-center justify-center">
                      <p className="text-white/70 text-sm text-center">No community quotes yet. Be the first to share!</p>
                    </div>
                  )}
                  
                  {communityQuotes.length > 1 && (
                    <div className="flex justify-center mt-3 space-x-1">
                      {communityQuotes.map((_, index) => (
                        <div 
                          key={index}
                          className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-200 ${index === currentQuoteIndex ? 'bg-blue-400' : 'bg-white/40 hover:bg-white/60'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentQuoteIndex(index);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {communityQuotes.length > 0 && (
                <div 
                  className="flex justify-center items-center bg-white/15 hover:bg-white/20 transition-colors duration-200 py-2 rounded-lg text-center"
                >
                  <span className="text-white text-xs font-medium mr-1">Browse all community quotes</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Regular Categories Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {filteredCategories.map((category: Category) => (
            <motion.div
              key={category.id}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.2 }}
            >
              <Card 
                className="bg-white/20 hover:bg-white/25 transition-colors border border-white/15 cursor-pointer group p-4 flex flex-col items-center gap-2 rounded-xl"
                onClick={() => handleQuoteSelection(category.quotes)}
              >
                {categoryIcons[category.name] && (
                  <div className="p-2.5 rounded-full bg-white/15 group-hover:bg-white/20 transition-colors">
                    {React.createElement(categoryIcons[category.name], {
                      className: "w-5 h-5 text-blue-400"
                    })}
                  </div>
                )}
                <h3 className="text-white text-sm text-center font-medium">{category.name}</h3>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}; 