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
  type Firestore,
  deleteField
} from 'firebase/firestore';
import { getFirebaseInstance } from './firebase';
import type { QuoteHistoryItem, FavoriteQuote } from '../types/quotes';

// Helper function to get Firestore instance
async function getDb(): Promise<Firestore> {
  const { db } = await getFirebaseInstance();
  return db;
}

// Save quote to user's history
export async function saveQuoteToHistory(userId: number, quote: QuoteHistoryItem) {
  const db = await getDb();
  const userHistoryRef = doc(db, 'users', userId.toString(), 'history', quote.id);
  
  const quoteData = {
    ...quote,
    timestamp: Timestamp.fromDate(quote.timestamp)
  };

  await setDoc(userHistoryRef, quoteData);
}

// Get user's quote history
export async function getUserQuoteHistory(userId: number): Promise<QuoteHistoryItem[]> {
  const db = await getDb();
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
  const db = await getDb();
  const userFavoritesRef = doc(db, 'users', userId.toString(), 'favorites', quote.id);
  
  const quoteData = {
    ...quote,
    timestamp: Timestamp.fromDate(quote.timestamp)
  };

  await setDoc(userFavoritesRef, quoteData);
}

// Get user's favorites
export async function getUserFavorites(userId: number): Promise<FavoriteQuote[]> {
  const db = await getDb();
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
    const db = await getDb();
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
    const db = await getDb();
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
export const saveGifPreference = async (userId: number, enabled: boolean) => {
  try {
    const db = await getDb();
    const userRef = doc(db, 'users', userId.toString());
    await setDoc(userRef, { gifEnabled: enabled }, { merge: true });
  } catch (error) {
    console.error('Error saving GIF preference:', error);
    throw error;
  }
};

export const getGifPreference = async (userId: number): Promise<boolean> => {
  try {
    const db = await getDb();
    const userRef = doc(db, 'users', userId.toString());
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
export const saveThemePreference = async (userId: number, theme: string) => {
  try {
    const db = await getDb();
    const userRef = doc(db, 'users', userId.toString());
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
export const getThemePreference = async (userId: number): Promise<string | null> => {
  try {
    const db = await getDb();
    const userRef = doc(db, 'users', userId.toString());
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? userDoc.data()?.themePreference || null : null;
  } catch (error) {
    console.error('Error getting theme preference:', error);
    return null;
  }
};

// Save onboarding data
export async function saveOnboardingData(userId: number, data: {
  preferredQuoteStyle?: string;
  gender?: string;
  relationshipStatus?: string;
  selectedTheme?: string;
  areasToImprove?: string[];
  personalGoals?: string;
  preferredStyles?: string[];
}) {
  try {
    const db = await getDb();
    const userDocRef = doc(db, 'users', userId.toString());
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      await updateDoc(userDocRef, {
        onboardingData: data,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(userDocRef, {
        onboardingData: data,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    throw error;
  }
}

// Get onboarding data
export async function getOnboardingData(userId: number) {
  try {
    const db = await getDb();
    const userDocRef = doc(db, 'users', userId.toString());
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        onboardingData: data.onboardingData || null,
        hasCompletedOnboarding: true
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting onboarding data:', error);
    throw error;
  }
}

// Save notification details for a user
export const saveNotificationDetails = async (userId: number | undefined, details: { url?: string; token?: string }) => {
  if (!userId) return;
  
  try {
    const db = await getDb();
    const userRef = doc(db, 'users', userId.toString());
    await setDoc(userRef, {
      notificationDetails: details,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log('Notification details saved for user:', userId);
  } catch (error) {
    console.error('Error saving notification details:', error);
    throw error;
  }
};

// Remove notification details for a user
export const removeNotificationDetails = async (userId: number | undefined) => {
  if (!userId) return;
  
  try {
    const db = await getDb();
    const userRef = doc(db, 'users', userId.toString());
    await updateDoc(userRef, {
      notificationDetails: deleteField(),
      updatedAt: serverTimestamp()
    });
    
    console.log('Notification details removed for user:', userId);
  } catch (error) {
    console.error('Error removing notification details:', error);
    throw error;
  }
};

// Get notification details
export async function getNotificationDetails(userId: number) {
  try {
    const db = await getDb();
    const userDoc = doc(db, 'users', userId.toString());
    const userSnap = await getDoc(userDoc);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.notificationDetails;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting notification details:', error);
    return null;
  }
}

export interface StreakUpdate {
  current_streak: number;
  last_login_timestamp: Date;
  next_eligible_login: Date;
  streak_deadline: Date;
  timezone?: string;
  grace_period_used?: boolean;
}

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

// Update the getUserStreak function
export const getUserStreak = async (userId: number): Promise<UserStreak> => {
  try {
    console.log('📊 getUserStreak: Fetching streak data for user:', userId);
    const db = await getDb();
    const userRef = doc(db, 'users', userId.toString());
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

    // Use the currentStreak field if it exists (for backward compatibility)
    const currentStreak = data.currentStreak || data.current_streak || 0;

    const streakData = {
      current_streak: currentStreak,
      longest_streak: data.longest_streak || currentStreak,
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
export const updateUserStreak = async (userId: number, data: StreakUpdate): Promise<void> => {
  try {
    const db = await getDb();
    const userRef = doc(db, 'users', userId.toString());
    const userDoc = await getDoc(userRef);
    
    // Get user's current timezone
    const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (!userDoc.exists()) {
      // Create new user document - this is their first streak
      const now = new Date();
      await setDoc(userRef, {
        current_streak: data.current_streak,
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
        updated_at: serverTimestamp(),
        last_login_timestamp: data.last_login_timestamp,
        next_eligible_login: data.next_eligible_login,
        streak_deadline: data.streak_deadline
      });
    } else {
      // Update existing user document
      const currentData = userDoc.data();
      
      // If the old currentStreak field exists and is higher, use that value
      const actualCurrentStreak = Math.max(
        currentData.currentStreak || 0,
        currentData.current_streak || 0
      );
      
      const streakHistory = currentData.streak_history || [];
      const currentStreak = streakHistory[streakHistory.length - 1];
      
      // If current streak is 1 and previous streak was higher, it means streak was reset
      if (data.current_streak === 1 && actualCurrentStreak > 1) {
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
      } else if (data.current_streak > actualCurrentStreak) {
        // Streak increased, update the length of current streak
        if (currentStreak) {
          currentStreak.length = data.current_streak;
          currentStreak.last_update = data.last_login_timestamp;
        }
      }

      // Update document with cleaned up fields
      await updateDoc(userRef, {
        current_streak: data.current_streak,
        currentStreak: deleteField(), // Remove the old field
        timezone,
        streak_history: streakHistory,
        longest_streak: Math.max(data.current_streak, currentData.longest_streak || 0),
        initial_streak_start: currentData.initial_streak_start || data.last_login_timestamp,
        grace_period_used: data.grace_period_used || false,
        updated_at: serverTimestamp(),
        last_update: data.last_login_timestamp,
        last_login_timestamp: data.last_login_timestamp,
        next_eligible_login: data.next_eligible_login,
        streak_deadline: data.streak_deadline
      });
    }
  } catch (error) {
    console.error('Error updating user streak:', error);
    throw error;
  }
}; 