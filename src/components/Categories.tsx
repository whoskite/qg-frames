import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { Category, QuotesData, CategoryQuote } from '../types/quotes';
import quotesData from '../data/quotes.json';

interface CategoriesProps {
  onSelectQuote: (text: string, author: string, source: string, gifUrl: string | null) => void;
}

export const Categories: React.FC<CategoriesProps> = ({ onSelectQuote }) => {
  const data = quotesData as QuotesData;

  const handleQuoteSelection = (quotes: CategoryQuote[]) => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    onSelectQuote(
      randomQuote.text,
      randomQuote.author,
      randomQuote.source,
      null
    );
  };

  return (
    <div className="fixed inset-0 bottom-16 bg-black z-40">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Categories</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 md:grid-cols-2"
          >
            {data.categories.map((category: Category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  className="bg-white/10 hover:bg-white/20 transition-colors border-none cursor-pointer"
                  onClick={() => handleQuoteSelection(category.quotes)}
                >
                  <CardHeader>
                    <CardTitle className="text-xl text-white">{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 mb-4">{category.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {category.quotes[0].topics.map((topic: string) => (
                        <span
                          key={topic}
                          className="px-2 py-1 text-xs rounded-full bg-white/10 text-white"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 text-sm text-gray-400">
                      {category.quotes.length} quotes
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}; 