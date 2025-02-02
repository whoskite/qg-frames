import React, { createContext, useContext, useState, useCallback } from 'react';
import type { QuoteHistoryItem, QuoteHistoryItemFields, FavoriteQuote } from '../types/quotes';
import { generateRandomString } from '../lib/utils';

interface UserDataContextType {
  quoteHistory: QuoteHistoryItem[];
  favorites: FavoriteQuote[];
  addQuoteToHistory: (quote: QuoteHistoryItemFields) => void;
  addToFavorites: (quote: QuoteHistoryItem) => void;
  removeFromFavorites: (id: string) => void;
  clearHistory: () => void;
  setQuoteHistory: (history: QuoteHistoryItem[]) => void;
  setFavorites: (favorites: FavoriteQuote[]) => void;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [quoteHistory, setQuoteHistory] = useState<QuoteHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteQuote[]>([]);

  const addQuoteToHistory = useCallback((quote: QuoteHistoryItemFields) => {
    const newQuote: QuoteHistoryItem = {
      ...quote,
      id: generateRandomString(10)
    };
    setQuoteHistory(prev => [newQuote, ...prev]);
  }, []);

  const addToFavorites = useCallback((quote: QuoteHistoryItem) => {
    setFavorites(prev => [quote, ...prev]);
  }, []);

  const removeFromFavorites = useCallback((id: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setQuoteHistory([]);
  }, []);

  return (
    <UserDataContext.Provider 
      value={{ 
        quoteHistory, 
        favorites,
        addQuoteToHistory,
        addToFavorites,
        removeFromFavorites,
        clearHistory,
        setQuoteHistory,
        setFavorites
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
} 