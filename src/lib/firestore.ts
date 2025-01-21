import { 
  collection, 
  doc, 
  getDocs,
  getDoc,
  setDoc, 
  deleteDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  type Firestore 
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
  const db = getDb();
  const userHistoryRef = doc(db, 'users', userId.toString(), 'history', quote.id);
  
  const quoteData = {
    ...quote,
    timestamp: Timestamp.fromDate(quote.timestamp)
  };

  await setDoc(userHistoryRef, quoteData);
}

// Get user's quote history
export async function getUserQuoteHistory(userId: number): Promise<QuoteHistoryItem[]> {
  const db = getDb();
  const userHistoryRef = collection(db, 'users', userId.toString(), 'history');
  const historySnapshot = await getDocs(userHistoryRef);
  
  return historySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      timestamp: data.timestamp.toDate(),
      id: doc.id
    } as QuoteHistoryItem;
  });
}

// Save favorite quote
export async function saveFavoriteQuote(userId: number, quote: FavoriteQuote) {
  const db = getDb();
  const userFavoritesRef = doc(db, 'users', userId.toString(), 'favorites', quote.id);
  
  const quoteData = {
    ...quote,
    timestamp: Timestamp.fromDate(quote.timestamp)
  };

  await setDoc(userFavoritesRef, quoteData);
}

// Get user's favorites
export async function getUserFavorites(userId: number): Promise<FavoriteQuote[]> {
  const db = getDb();
  const userFavoritesRef = collection(db, 'users', userId.toString(), 'favorites');
  const favoritesSnapshot = await getDocs(userFavoritesRef);
  
  return favoritesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      timestamp: data.timestamp.toDate(),
      id: doc.id
    } as FavoriteQuote;
  });
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
  grace_period_used?: boolean;
  timezone: string;
}

export interface StreakUpdate {
  current_streak: number;
  last_login_timestamp: Date;
  next_eligible_login: Date;
  streak_deadline: Date;
  timezone?: string;
  grace_period_used?: boolean;
}

// Update the getUserStreak function
export const getUserStreak = async (fid: number): Promise<UserStreak> => {
  if (!db) {
    console.log('❌ getUserStreak: Firestore not initialized');
    throw new Error('Firestore not initialized');
  }

  try {
    console.log('📊 getUserStreak: Fetching streak data for user:', fid);
    const userRef = doc(db as Firestore, 'users', fid.toString());
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('📊 getUserStreak: No existing streak data - returning defaults');
      return {
        current_streak: 0,
        longest_streak: 0,
        last_login_timestamp: null,
        next_eligible_login: null,
        streak_deadline: null,
        grace_period_used: false,
        timezone: ''
      };
    }
    
    const data = userDoc.data();
    console.log('📊 getUserStreak: Raw Firestore data:', data);

    const streakData = {
      current_streak: data.current_streak || 0,
      longest_streak: data.longest_streak || 0,
      last_login_timestamp: data.last_login_timestamp || null,
      next_eligible_login: data.next_eligible_login ? new Date(data.next_eligible_login.toDate()) : null,
      streak_deadline: data.streak_deadline ? new Date(data.streak_deadline.toDate()) : null,
      grace_period_used: data.grace_period_used || false,
      timezone: data.timezone || ''
    };

    console.log('📊 getUserStreak: Processed streak data:', {
      ...streakData,
      last_login_timestamp: streakData.last_login_timestamp ? new Date(streakData.last_login_timestamp.toMillis()).toLocaleString() : null,
      next_eligible_login: streakData.next_eligible_login?.toLocaleString(),
      streak_deadline: streakData.streak_deadline?.toLocaleString()
    });

    return streakData;
  } catch (error) {
    console.error('❌ getUserStreak Error:', error);
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
    
    // Get user's current timezone
    const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (!userDoc.exists()) {
      // Create new user document - this is their first streak
      const now = new Date();
      await setDoc(userRef, {
        ...data,
        timezone,
        initial_streak_start: now,
        longest_streak: data.current_streak,
        streak_history: [{
          start_date: now,
          length: data.current_streak,
          last_update: now
        }],
        grace_period_used: data.grace_period_used || false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    } else {
      // Update existing user document
      const currentData = userDoc.data();
      const streakHistory = currentData.streak_history || [];
      const currentStreak = streakHistory[streakHistory.length - 1];
      
      // If current streak is 1 and previous streak was higher, it means streak was reset
      if (data.current_streak === 1 && currentData.current_streak > 1) {
        // End the previous streak
        if (currentStreak && !currentStreak.end_date) {
          currentStreak.end_date = data.last_login_timestamp;
          currentStreak.last_update = data.last_login_timestamp;
        }
        // Start a new streak
        streakHistory.push({
          start_date: data.last_login_timestamp,
          length: 1,
          last_update: data.last_login_timestamp
        });
      } else if (data.current_streak > currentData.current_streak) {
        // Streak increased, update the length of current streak
        if (currentStreak) {
          currentStreak.length = data.current_streak;
          currentStreak.last_update = data.last_login_timestamp;
        }
      }

      await updateDoc(userRef, {
        ...data,
        timezone,
        streak_history: streakHistory,
        longest_streak: Math.max(data.current_streak, currentData.longest_streak || 0),
        initial_streak_start: currentData.initial_streak_start || data.last_login_timestamp,
        grace_period_used: data.grace_period_used || false,
        updated_at: serverTimestamp(),
        last_update: data.last_login_timestamp // Add this to track the most recent update
      });
    }
  } catch (error) {
    console.error('Error updating user streak:', error);
    throw error;
  }
};

// Save onboarding data
export const saveOnboardingData = async (fid: number, onboardingData: {
  gender: string;
  relationshipStatus: string;
  selectedTheme: string;
  areasToImprove: string[];
  personalGoals: string;
}) => {
  if (!db) {
    console.error('Firestore not initialized');
    return false;
  }
  try {
    const userRef = doc(db, 'users', fid.toString());
    await setDoc(userRef, {
      onboardingData,
      hasCompletedOnboarding: true,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    return false;
  }
};

// Get onboarding data
export const getOnboardingData = async (fid: number) => {
  if (!db) {
    console.error('Firestore not initialized');
    return null;
  }
  try {
    const userRef = doc(db, 'users', fid.toString());
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return {
        onboardingData: userDoc.data()?.onboardingData || null,
        hasCompletedOnboarding: userDoc.data()?.hasCompletedOnboarding || false
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting onboarding data:', error);
    return null;
  }
}; 