import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import { Analytics, getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

async function initializeFirebase() {
  try {
    // Check if Firebase is already initialized
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      // Fetch config from secure API endpoint
      const response = await fetch('/api/firebase-config');
      if (!response.ok) {
        throw new Error('Failed to fetch Firebase configuration');
      }
      
      const firebaseConfig = await response.json();
      
      // Validate config
      if (!firebaseConfig.projectId || !firebaseConfig.storageBucket) {
        throw new Error('Invalid Firebase configuration: missing required fields');
      }

      app = initializeApp(firebaseConfig);
    }

    // Initialize Firestore
    db = getFirestore(app);

    // Initialize Storage
    storage = getStorage(app);

    // Initialize Analytics if in browser context
    if (typeof window !== 'undefined' && await isSupported()) {
      analytics = getAnalytics(app);
    }

    return { app, analytics, db, storage };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

export { initializeFirebase, app, analytics, db, storage }; 