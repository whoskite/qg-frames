import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc,
  addDoc,
  type Firestore,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { QuoteHistoryItem, FavoriteQuote } from '../types/quotes';

// Helper function to ensure we have a valid Firestore instance
function getDb(): Firestore {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

// Save quote to user's history
export async function saveQuoteToHistory(userId: number, quote: QuoteHistoryItem) {
  try {
    const db = getDb();
    const userHistoryRef = collection(db, 'users', userId.toString(), 'history');
    await addDoc(userHistoryRef, {
      ...quote,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error saving quote:', error);
    throw error;
  }
}

// Get user's quote history
export async function getUserQuoteHistory(userId: number) {
  try {
    const db = getDb();
    const userHistoryRef = collection(db, 'users', userId.toString(), 'history');
    const querySnapshot = await getDocs(userHistoryRef);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    })) as QuoteHistoryItem[];
  } catch (error) {
    console.error('Error getting history:', error);
    throw error;
  }
}

// Save favorite quote
export async function saveFavoriteQuote(userId: number, quote: FavoriteQuote) {
  try {
    console.log('Starting saveFavoriteQuote with:', { userId, quote });
    const db = getDb();
    
    // Ensure all required fields are present
    if (!quote.id || !quote.text || !quote.timestamp) {
      throw new Error('Missing required fields for favorite quote');
    }
    
    const quoteData = {
      id: quote.id,
      text: quote.text,
      style: quote.style || 'default',
      gifUrl: quote.gifUrl,
      bgColor: quote.bgColor,
      timestamp: Timestamp.fromDate(quote.timestamp)
    };
    
    const userFavoritesRef = doc(db, 'users', userId.toString(), 'favorites', quote.id);
    console.log('About to save favorite with data:', quoteData);
    console.log('To Firestore path:', `users/${userId}/favorites/${quote.id}`);
    
    await setDoc(userFavoritesRef, quoteData);
    console.log('Successfully saved favorite quote to Firestore');
    
    return quote.id;
  } catch (error) {
    console.error('Error in saveFavoriteQuote:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    throw error;
  }
}

// Get user's favorites
export async function getUserFavorites(userId: number) {
  try {
    console.log('Starting getUserFavorites for userId:', userId);
    const db = getDb();
    const userFavoritesRef = collection(db, 'users', userId.toString(), 'favorites');
    
    console.log('Fetching documents from:', `users/${userId}/favorites`);
    const querySnapshot = await getDocs(userFavoritesRef);
    console.log('Number of documents found:', querySnapshot.size);
    
    const favorites = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Processing document:', data);
      
      return {
        id: doc.id,
        text: data.text,
        style: data.style,
        gifUrl: data.gifUrl,
        bgColor: data.bgColor,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as FavoriteQuote;
    });
    
    console.log('Processed favorites:', favorites);
    return favorites;
  } catch (error) {
    console.error('Error in getUserFavorites:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    throw error;
  }
}

// Remove favorite quote
export async function removeFavoriteQuote(userId: number, quoteId: string) {
  try {
    const db = getDb();
    const quoteRef = doc(db, 'users', userId.toString(), 'favorites', quoteId);
    await deleteDoc(quoteRef);
  } catch (error) {
    console.error('Error removing favorite:', error);
    throw error;
  }
}

// Clear user history
export async function clearUserHistory(userId: number) {
  try {
    const db = getDb();
    const userHistoryRef = collection(db, 'users', userId.toString(), 'history');
    const querySnapshot = await getDocs(userHistoryRef);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
}

// Add these new functions for GIF preferences
export const saveGifPreference = async (fid: number, enabled: boolean) => {
  try {
    const database = getDb();
    const userRef = doc(database, 'users', fid.toString());
    await setDoc(userRef, { gifEnabled: enabled }, { merge: true });
  } catch (error) {
    console.error('Error saving GIF preference:', error);
    throw error;
  }
};

export const getGifPreference = async (fid: number): Promise<boolean> => {
  try {
    const database = getDb();
    const userRef = doc(database, 'users', fid.toString());
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data()?.gifEnabled ?? true; // Default to true if not set
    }
    
    return true; // Default to true for new users
  } catch (error) {
    console.error('Error getting GIF preference:', error);
    return true; // Default to true on error
  }
}; 