import { db } from './firebase';
import { collection, addDoc, getDocs, Firestore } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  if (!db) {
    console.error('Firebase DB not initialized');
    return false;
  }

  try {
    // Try to add a test document
    const testCollection = collection(db as Firestore, 'test');
    await addDoc(testCollection, {
      test: true,
      timestamp: new Date()
    });
    
    // Try to read it back
    const querySnapshot = await getDocs(testCollection);
    
    console.log('Firebase connection successful!');
    console.log('Documents in test collection:', querySnapshot.size);
    
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
}; 