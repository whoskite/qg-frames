import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  doc,
  setDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { QuoteHistoryItem, FavoriteQuote } from '../types/quotes';

interface FirestoreData {
  timestamp?: Timestamp;
  [key: string]: any;
}

// Helper function to convert Firestore timestamp to Date
const convertTimestamps = (data: FirestoreData) => {
  if (data?.timestamp) {
    return {
      ...data,
      timestamp: data.timestamp.toDate()
    };
  }
  return data;
};

export async function saveQuoteToHistory(fid: number, quote: QuoteHistoryItem) {
  if (!db) return null;
  
  try {
    const quotesRef = collection(db, 'quotes');
    const docRef = await addDoc(quotesRef, {
      ...quote,
      fid,
      createdAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving quote:', error);
    return null;
  }
}

export async function getUserQuoteHistory(fid: number) {
  if (!db) return [];
  
  try {
    const quotesRef = collection(db, 'quotes');
    const q = query(
      quotesRef, 
      where('fid', '==', fid),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    }));
  } catch (error) {
    console.error('Error getting quote history:', error);
    return [];
  }
}

export async function saveFavoriteQuote(fid: number, quote: FavoriteQuote) {
  if (!db) return null;
  
  try {
    const favoritesRef = collection(db, 'favorites');
    const docRef = await setDoc(doc(favoritesRef, quote.id), {
      ...quote,
      fid,
      createdAt: new Date()
    });
    return quote.id;
  } catch (error) {
    console.error('Error saving favorite:', error);
    return null;
  }
}

export async function getUserFavorites(fid: number) {
  if (!db) return [];
  
  try {
    const favoritesRef = collection(db, 'favorites');
    const q = query(
      favoritesRef, 
      where('fid', '==', fid),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    }));
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

export async function removeFavoriteQuote(quoteId: string) {
  if (!db) return false;
  
  try {
    const favoriteRef = doc(db, 'favorites', quoteId);
    await deleteDoc(favoriteRef);
    return true;
  } catch (error) {
    console.error('Error removing favorite:', error);
    return false;
  }
}

export async function clearUserHistory(fid: number) {
  if (!db) return false;
  
  try {
    const quotesRef = collection(db, 'quotes');
    const q = query(quotesRef, where('fid', '==', fid));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    return true;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
} 