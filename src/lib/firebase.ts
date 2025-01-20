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
      let firebaseConfig;
      
      // Handle server-side and client-side differently
      if (typeof window === 'undefined') {
        // Server-side: use environment variables directly
        firebaseConfig = {
          apiKey: process.env.FIREBASE_API_KEY,
          authDomain: process.env.FIREBASE_AUTH_DOMAIN,
          projectId: process.env.FIREBASE_PROJECT_ID,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.FIREBASE_APP_ID,
          measurementId: process.env.FIREBASE_MEASUREMENT_ID
        };
        console.log('Server-side Firebase config:', {
          hasApiKey: !!firebaseConfig.apiKey,
          authDomain: firebaseConfig.authDomain,
          projectId: firebaseConfig.projectId,
          storageBucket: firebaseConfig.storageBucket,
          hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
          hasAppId: !!firebaseConfig.appId
        });
      } else {
        // Client-side: fetch from API
        const response = await fetch('/api/firebase-config');
        if (!response.ok) {
          throw new Error('Failed to fetch Firebase configuration');
        }
        firebaseConfig = await response.json();
      }
      
      // Validate config
      if (!firebaseConfig.projectId || !firebaseConfig.storageBucket) {
        console.error('Invalid Firebase config:', {
          hasProjectId: !!firebaseConfig.projectId,
          hasStorageBucket: !!firebaseConfig.storageBucket
        });
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