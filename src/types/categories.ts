import { IconType } from 'react-icons';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  icon: IconType;
}

export interface Quote {
  id: number;
  text: string;
  author: string;
  categoryId: number;
  likes: number;
  createdAt: string;
}

export type CategoryWithQuotes = Category & {
  quotes: Quote[];
}; 