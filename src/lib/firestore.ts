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
  Timestamp,
  QueryDocumentSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { QuoteHistoryItem, FavoriteQuote } from '../types/quotes';

interface FirestoreQuote extends Omit<QuoteHistoryItem, 'timestamp'> {
  timestamp: Timestamp;
  fid: number;
  createdAt: Timestamp;
}

// Helper function to convert Firestore data to QuoteHistoryItem
const convertToQuoteHistoryItem = (doc: QueryDocumentSnapshot<FirestoreQuote>): QuoteHistoryItem => {
  const data = doc.data();
  return {
    text: data.text,
    style: data.style,
    gifUrl: data.gifUrl,
    timestamp: data.timestamp.toDate(),
    bgColor: data.bgColor
  };
};

// Helper function to convert Firestore data to FavoriteQuote
const convertToFavoriteQuote = (doc: QueryDocumentSnapshot<FirestoreQuote>): FavoriteQuote => {
  return {
    ...convertToQuoteHistoryItem(doc),
    id: doc.id
  };
};

export async function saveQuoteToHistory(fid: number, quote: QuoteHistoryItem): Promise<string | null> {
  if (!db) return null;
  
  try {
    const quotesRef = collection(db, 'quotes');
    const firestoreQuote = {
      text: quote.text,
      style: quote.style,
      gifUrl: quote.gifUrl,
      bgColor: quote.bgColor,
      timestamp: Timestamp.fromDate(quote.timestamp),
      fid,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(quotesRef, firestoreQuote);
    return docRef.id;
  } catch (error) {
    console.error('Error saving quote:', error);
    return null;
  }
}

export async function getUserQuoteHistory(fid: number): Promise<QuoteHistoryItem[]> {
  if (!db) return [];
  
  try {
    const quotesRef = collection(db, 'quotes');
    const q = query(
      quotesRef, 
      where('fid', '==', fid),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertToQuoteHistoryItem(doc as QueryDocumentSnapshot<FirestoreQuote>));
  } catch (error) {
    console.error('Error getting quote history:', error);
    return [];
  }
}

export async function saveFavoriteQuote(fid: number, quote: FavoriteQuote): Promise<string | null> {
  if (!db) return null;
  
  try {
    const favoritesRef = collection(db, 'favorites');
    const firestoreQuote = {
      text: quote.text,
      style: quote.style,
      gifUrl: quote.gifUrl,
      bgColor: quote.bgColor,
      timestamp: Timestamp.fromDate(quote.timestamp),
      fid,
      createdAt: serverTimestamp()
    };
    await setDoc(doc(favoritesRef, quote.id), firestoreQuote);
    return quote.id;
  } catch (error) {
    console.error('Error saving favorite:', error);
    return null;
  }
}

export async function getUserFavorites(fid: number): Promise<FavoriteQuote[]> {
  if (!db) return [];
  
  try {
    const favoritesRef = collection(db, 'favorites');
    const q = query(
      favoritesRef, 
      where('fid', '==', fid),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertToFavoriteQuote(doc as QueryDocumentSnapshot<FirestoreQuote>));
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