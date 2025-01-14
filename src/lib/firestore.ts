import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import { db } from './firebase';

// Types
interface QuoteData {
  text: string;
  style: string;
  gifUrl: string | null;
  bgColor: string;
  userId: string;
}

// Collections
export const COLLECTIONS = {
  FAVORITES: 'favorites',
  HISTORY: 'history',
  USERS: 'users'
} as const;

// Helper function to check if db is initialized
const getDB = () => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db as Firestore;
};

// Favorites Operations
export const addToFavorites = async (quoteData: QuoteData) => {
  try {
    const firestore = getDB();
    const docRef = await addDoc(collection(firestore, COLLECTIONS.FAVORITES), {
      ...quoteData,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    throw error;
  }
};

export const getFavorites = async (userId: string) => {
  try {
    const firestore = getDB();
    const q = query(
      collection(firestore, COLLECTIONS.FAVORITES),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting favorites:', error);
    throw error;
  }
};

export const removeFavorite = async (quoteId: string) => {
  try {
    const firestore = getDB();
    await deleteDoc(doc(firestore, COLLECTIONS.FAVORITES, quoteId));
  } catch (error) {
    console.error('Error removing favorite:', error);
    throw error;
  }
};

// History Operations
export const addToHistory = async (quoteData: QuoteData) => {
  try {
    const firestore = getDB();
    const docRef = await addDoc(collection(firestore, COLLECTIONS.HISTORY), {
      ...quoteData,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding to history:', error);
    throw error;
  }
};

export const getHistory = async (userId: string) => {
  try {
    const firestore = getDB();
    const q = query(
      collection(firestore, COLLECTIONS.HISTORY),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting history:', error);
    throw error;
  }
};

export const clearHistory = async (userId: string) => {
  try {
    const firestore = getDB();
    const q = query(
      collection(firestore, COLLECTIONS.HISTORY),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
}; 