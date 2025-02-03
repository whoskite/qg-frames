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
}

export interface QuoteHistoryItem extends QuoteHistoryItemFields {
  id: string;
}

export type FavoriteQuote = QuoteHistoryItem;

export interface Quote extends BaseQuote {
  timestamp?: Date;
} 