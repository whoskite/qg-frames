import React from 'react';
import type { QuoteHistoryItem } from '../types/quotes';

interface QuoteHistoryItemProps {
  quote: QuoteHistoryItem;
  onClick?: () => void;
}

export function QuoteHistoryItemComponent({ quote, onClick }: QuoteHistoryItemProps) {
  return (
    <div 
      className="p-4 border rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <p className="text-lg font-medium">{quote.text}</p>
      {quote.author && (
        <p className="text-sm text-gray-500 mt-2">- {quote.author}</p>
      )}
      <div className="text-xs text-gray-400 mt-1">
        {new Date(quote.timestamp).toLocaleString()}
      </div>
    </div>
  );
} 