export interface QuoteHistoryItem {
  text: string;
  style: string;
  gifUrl: string | null;
  timestamp: Date;
  bgColor: string;
}

export interface FavoriteQuote extends QuoteHistoryItem {
  id: string;
} 