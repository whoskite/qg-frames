import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import type { QuoteHistoryItem, FavoriteQuote } from '../types';

// Save quote to user's history
export async function saveQuoteToHistory(userId: string, quote: QuoteHistoryItem) {
  try {
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
export async function getUserQuoteHistory(userId: string) {
  try {
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
export async function saveFavoriteQuote(userId: string, quote: FavoriteQuote) {
  try {
    const userFavoritesRef = collection(db, 'users', userId.toString(), 'favorites');
    await addDoc(userFavoritesRef, {
      ...quote,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error saving favorite:', error);
    throw error;
  }
}

// Get user's favorites
export async function getUserFavorites(userId: string) {
  try {
    const userFavoritesRef = collection(db, 'users', userId.toString(), 'favorites');
    const querySnapshot = await getDocs(userFavoritesRef);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    })) as FavoriteQuote[];
  } catch (error) {
    console.error('Error getting favorites:', error);
    throw error;
  }
}

// Remove favorite quote
export async function removeFavoriteQuote(userId: string, quoteId: string) {
  try {
    const quoteRef = doc(db, 'users', userId.toString(), 'favorites', quoteId);
    await deleteDoc(quoteRef);
  } catch (error) {
    console.error('Error removing favorite:', error);
    throw error;
  }
}

// Clear user history
export async function clearUserHistory(userId: string) {
  try {
    const userHistoryRef = collection(db, 'users', userId.toString(), 'history');
    const querySnapshot = await getDocs(userHistoryRef);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
} 