import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc,
  addDoc,
  type Firestore,
  Timestamp,
  serverTimestamp,
  updateDoc
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

// Save theme preference
export const saveThemePreference = async (fid: number, theme: string) => {
  if (!db) {
    console.error('Firestore not initialized');
    return false;
  }
  try {
    const userRef = doc(db, 'users', fid.toString());
    await setDoc(userRef, {
      themePreference: theme,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving theme preference:', error);
    return false;
  }
};

// Get theme preference
export const getThemePreference = async (fid: number): Promise<string | null> => {
  if (!db) {
    console.error('Firestore not initialized');
    return null;
  }
  try {
    const userRef = doc(db, 'users', fid.toString());
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? userDoc.data()?.themePreference || null : null;
  } catch (error) {
    console.error('Error getting theme preference:', error);
    return null;
  }
};

// Add these interfaces
export interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_login_timestamp: { toMillis: () => number } | null;
  next_eligible_login: Date | null;
  streak_deadline: Date | null;
}

export interface StreakUpdate {
  current_streak: number;
  last_login_timestamp: Date;
  next_eligible_login: Date;
  streak_deadline: Date;
}

// Update the getUserStreak function
export const getUserStreak = async (fid: number): Promise<UserStreak> => {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const userRef = doc(db as Firestore, 'users', fid.toString());
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return {
        current_streak: 0,
        longest_streak: 0,
        last_login_timestamp: null,
        next_eligible_login: null,
        streak_deadline: null
      };
    }
    
    const data = userDoc.data();
    return {
      current_streak: data.current_streak || 0,
      longest_streak: data.longest_streak || 0,
      last_login_timestamp: data.last_login_timestamp || null,
      next_eligible_login: data.next_eligible_login || null,
      streak_deadline: data.streak_deadline || null
    };
  } catch (error) {
    console.error('Error getting user streak:', error);
    throw error;
  }
};

// Update the updateUserStreak function
export const updateUserStreak = async (fid: number, data: StreakUpdate): Promise<void> => {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const userRef = doc(db as Firestore, 'users', fid.toString());
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userRef, {
        ...data,
        longest_streak: data.current_streak,
        created_at: serverTimestamp()
      });
    } else {
      // Update existing user document
      const currentData = userDoc.data();
      await updateDoc(userRef, {
        ...data,
        longest_streak: Math.max(data.current_streak, currentData.longest_streak || 0),
        updated_at: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating user streak:', error);
    throw error;
  }
}; 