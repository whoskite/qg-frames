import { Sparkles, Heart, Book, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface BottomNavProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  className?: string;
  showTooltips?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  activeSection, 
  onNavigate,
  className = '',
  showTooltips = false
}) => {
  const [currentTooltipIndex, setCurrentTooltipIndex] = useState(0);
  const [isTooltipVisible, setIsTooltipVisible] = useState(true);

  const navItems = [
    { 
      name: 'Generate', 
      id: 'generate', 
      icon: Sparkles,
      tooltip: 'Generate new quotes'
    },
    { 
      name: 'Categories', 
      id: 'categories', 
      icon: Book,
      tooltip: 'Browse quote categories'
    },
    { 
      name: 'Favorites', 
      id: 'favorites', 
      icon: Heart,
      tooltip: 'View your favorite quotes'
    },
    { 
      name: 'Leaderboard', 
      id: 'leaderboard', 
      icon: Trophy,
      tooltip: 'View top quotes'
    }
  ];

  // Handle tooltip rotation with delay
  useEffect(() => {
    if (showTooltips) {
      const showNextTooltip = () => {
        setIsTooltipVisible(false);
        // Wait for exit animation to complete before changing index
        setTimeout(() => {
          setCurrentTooltipIndex((prev) => (prev + 1) % navItems.length);
          setIsTooltipVisible(true);
        }, 500); // 500ms delay between tooltips
      };

      const interval = setInterval(() => {
        showNextTooltip();
      }, 4500); // 4000ms display + 500ms transition

      return () => {
        clearInterval(interval);
      };
    } else {
      setCurrentTooltipIndex(0);
      setIsTooltipVisible(true);
    }
  }, [showTooltips, navItems.length]);

  return (
    <nav className={`fixed bottom-0 left-0 right-0 border-t border-white/10 z-50 pb-[2px] ${className}`}>
      <div className="max-w-md mx-auto px-4">
        <ul className="flex justify-around items-center h-16">
          {navItems.map((item, index) => (
            <li key={item.id} className="relative w-16">
              <div className="absolute w-full -top-8">
                <AnimatePresence mode="wait">
                  {showTooltips && currentTooltipIndex === index && isTooltipVisible && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.9 }}
                      transition={{ 
                        duration: 0.3,
                        ease: "easeOut"
                      }}
                      className="flex flex-col items-center"
                    >
                      <div className="bg-black/90 text-white text-xs py-1.5 px-3 rounded-full whitespace-nowrap">
                        {item.tooltip}
                      </div>
                      <div className="w-2 h-2 bg-black/90 rotate-45 mt-1" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <button
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center space-y-1 w-full ${
                  activeSection === item.id
                    ? 'text-blue-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <item.icon className="w-5 h-5" />
                </motion.div>
                <span className="text-xs">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
} 