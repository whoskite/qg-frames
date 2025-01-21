import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import { Analytics, getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let isInitialized = false;

async function initializeFirebase() {
  if (isInitialized) {
    return { app, analytics, db, storage };
  }

  try {
    // Check if Firebase is already initialized
    if (getApps().length > 0) {
      app = getApps()[0];
      console.log('✅ Firebase app already initialized');
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
        console.log('🔧 Server-side Firebase config loaded');
      } else {
        // Client-side: fetch from API
        console.log('🔄 Fetching Firebase config...');
        const response = await fetch('/api/firebase-config');
        if (!response.ok) {
          throw new Error('Failed to fetch Firebase configuration');
        }
        firebaseConfig = await response.json();
        console.log('✅ Firebase config fetched successfully');
      }
      
      // Validate config
      if (!firebaseConfig.projectId || !firebaseConfig.storageBucket) {
        console.error('❌ Invalid Firebase config:', {
          hasProjectId: !!firebaseConfig.projectId,
          hasStorageBucket: !!firebaseConfig.storageBucket
        });
        throw new Error('Invalid Firebase configuration: missing required fields');
      }

      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase app initialized');
    }

    // Initialize Firestore
    db = getFirestore(app);
    console.log('✅ Firestore initialized');

    // Initialize Storage
    storage = getStorage(app);
    console.log('✅ Storage initialized');

    // Initialize Analytics if in browser context
    if (typeof window !== 'undefined' && await isSupported()) {
      analytics = getAnalytics(app);
      console.log('✅ Analytics initialized');
    }

    isInitialized = true;
    console.log('🎉 Firebase initialization complete');
    return { app, analytics, db, storage };
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    isInitialized = false;
    throw error;
  }
}

export { initializeFirebase, app, analytics, db, storage, isInitialized }; 