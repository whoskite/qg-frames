import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  Firestore
} from 'firebase/firestore';

// Types
interface QuoteHistoryItem {
  text: string;
  style: string;
  gifUrl: string | null;
  timestamp: Date;
  bgColor: string;
}

interface FavoriteQuote extends QuoteHistoryItem {
  id: string;
}

// Helper function to ensure db is initialized
function getFirestore(): Firestore {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db;
}

// Save quote history
export async function saveQuoteHistory(fid: number, quotes: QuoteHistoryItem[]) {
  try {
    const firestore = getFirestore();
    const userDoc = doc(firestore, 'users', fid.toString());
    const quotesCollection = collection(userDoc, 'quotes');
    
    // Save each quote with timestamp as ID
    for (const quote of quotes) {
      const quoteDoc = doc(quotesCollection, quote.timestamp.getTime().toString());
      await setDoc(quoteDoc, {
        ...quote,
        timestamp: quote.timestamp.toISOString()
      });
    }
  } catch (error) {
    console.error('Error saving quote history:', error);
  }
}

// Load quote history
export async function loadQuoteHistory(fid: number): Promise<QuoteHistoryItem[]> {
  try {
    const firestore = getFirestore();
    const userDoc = doc(firestore, 'users', fid.toString());
    const quotesCollection = collection(userDoc, 'quotes');
    const quotesQuery = query(quotesCollection, orderBy('timestamp', 'desc'), limit(10));
    
    const snapshot = await getDocs(quotesQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        timestamp: new Date(data.timestamp)
      } as QuoteHistoryItem;
    });
  } catch (error) {
    console.error('Error loading quote history:', error);
    return [];
  }
}

// Save favorites
export async function saveFavorites(fid: number, favorites: FavoriteQuote[]) {
  try {
    const firestore = getFirestore();
    const userDoc = doc(firestore, 'users', fid.toString());
    const favoritesCollection = collection(userDoc, 'favorites');
    
    for (const favorite of favorites) {
      const favoriteDoc = doc(favoritesCollection, favorite.id);
      await setDoc(favoriteDoc, {
        ...favorite,
        timestamp: favorite.timestamp.toISOString()
      });
    }
  } catch (error) {
    console.error('Error saving favorites:', error);
  }
}

// Load favorites
export async function loadFavorites(fid: number): Promise<FavoriteQuote[]> {
  try {
    const firestore = getFirestore();
    const userDoc = doc(firestore, 'users', fid.toString());
    const favoritesCollection = collection(userDoc, 'favorites');
    const favoritesQuery = query(favoritesCollection, orderBy('timestamp', 'desc'));
    
    const snapshot = await getDocs(favoritesQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        timestamp: new Date(data.timestamp)
      } as FavoriteQuote;
    });
  } catch (error) {
    console.error('Error loading favorites:', error);
    return [];
  }
}

// Clear history
export async function clearQuoteHistory(fid: number) {
  try {
    const firestore = getFirestore();
    const userDoc = doc(firestore, 'users', fid.toString());
    const quotesCollection = collection(userDoc, 'quotes');
    const snapshot = await getDocs(quotesCollection);
    
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }
  } catch (error) {
    console.error('Error clearing quote history:', error);
  }
} 