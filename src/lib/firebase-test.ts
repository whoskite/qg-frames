import { initializeFirebase } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    // Ensure Firebase is initialized
    const firebase = await initializeFirebase();
    if (!firebase?.db) {
      throw new Error('Firebase initialization failed');
    }

    // Try to add a test document
    const testCollection = collection(firebase.db, 'test');
    const docRef = await addDoc(testCollection, {
      test: true,
      timestamp: new Date()
    });
    
    // Try to read it back
    const querySnapshot = await getDocs(testCollection);
    
    console.log('Firebase connection successful!');
    console.log('Documents in test collection:', querySnapshot.size);
    console.log('Test document ID:', docRef.id);
    
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
}; 