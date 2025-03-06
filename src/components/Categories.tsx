import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Card } from './ui/card';
import type { Category, QuotesData, CategoryQuote } from '../types/quotes';
import quotesData from '../data/quotes.json';
import { FaLightbulb, FaHeart, FaLaugh, FaBook, FaStar, FaBriefcase, FaUsers, FaLeaf, FaBrain, FaPaintBrush, FaFeather, FaTrophy, FaDove, FaHandsHelping } from 'react-icons/fa';
import { GiMeditation } from 'react-icons/gi';
import type { IconType } from 'react-icons';
import type { QuoteHistoryItem } from '../types/quotes';

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
  'Philosophy': FaBrain,
  'Poetry': FaFeather,
  'Achievement': FaTrophy,
  'Funny': FaLaugh,
  'Peace': FaDove,
  'Compassion': FaHandsHelping
};

export const Categories: React.FC<CategoriesProps> = ({ onSelectQuote, onSelectCategory }) => {
  const data = quotesData as QuotesData;
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = data.categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="fixed inset-0 bottom-16 bg-black z-40">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Categories</h2>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {filteredCategories.map((category: Category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Card 
                  className="bg-white/10 hover:bg-white/20 transition-colors border-none cursor-pointer group p-4 flex flex-col items-center gap-3"
                  onClick={() => handleQuoteSelection(category.quotes)}
                >
                  {categoryIcons[category.name] && (
                    <div className="p-3 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                      {React.createElement(categoryIcons[category.name], {
                        className: "w-6 h-6 text-blue-400"
                      })}
                    </div>
                  )}
                  <h3 className="text-white text-center font-medium">{category.name}</h3>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}; 