import React, { useCallback } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import { QuoteHistoryItemComponent } from '../QuoteHistoryItem';
import { Modal } from './index';
import type { QuoteHistoryItem } from '../../types/quotes';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const { quoteHistory } = useUserData();

  const handleQuoteClick = useCallback((quote: QuoteHistoryItem) => {
    // Handle quote click
    console.log('Quote clicked:', quote);
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quote History">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {quoteHistory.map((quote) => (
          <QuoteHistoryItemComponent
            key={quote.id}
            quote={quote}
            onClick={() => handleQuoteClick(quote)}
          />
        ))}
        {quoteHistory.length === 0 && (
          <p className="text-center text-gray-500">No quotes in history</p>
        )}
      </div>
    </Modal>
  );
} 