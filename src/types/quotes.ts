export interface BaseQuoteFields {
  text: string;
  style: string;
  gifUrl: string | null;
  bgColor: string;
  author?: string;
}

export interface BaseQuote extends BaseQuoteFields {
  id: string;
}

export interface QuoteHistoryItemFields extends BaseQuoteFields {
  timestamp: Date;
  likes?: number;
}

export interface QuoteHistoryItem extends QuoteHistoryItemFields {
  id: string;
}

export type FavoriteQuote = QuoteHistoryItem;

export interface Quote extends BaseQuote {
  timestamp?: Date;
}

export interface CategoryQuote {
  id: string;
  text: string;
  author: string;
  source: string;
  topics: string[];
  year: number | null;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  quotes: CategoryQuote[];
}

export interface QuotesData {
  categories: Category[];
} 