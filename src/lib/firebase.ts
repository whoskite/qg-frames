import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import { Analytics, getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let isInitialized = false;
let initializationPromise: Promise<{
  app: FirebaseApp;
  db: Firestore;
  storage: FirebaseStorage;
  analytics?: Analytics;
}> | null = null;

async function initializeFirebase() {
  // If already initialized, return existing instances
  if (isInitialized && app && db && storage) {
    return { app, db, storage, analytics };
  }

  // If initialization is in progress, return the existing promise
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
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
        } else {
          // Client-side: fetch from API with retries
          const maxRetries = 3;
          let lastError;
          
          for (let i = 0; i < maxRetries; i++) {
            try {
              const response = await fetch('/api/firebase-config');
              if (!response.ok) {
                throw new Error(`Failed to fetch Firebase configuration: ${response.statusText}`);
              }
              firebaseConfig = await response.json();
              break;
            } catch (error) {
              lastError = error;
              if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
              }
            }
          }
          
          if (!firebaseConfig) {
            throw lastError || new Error('Failed to fetch Firebase configuration');
          }
        }
        
        // Validate config
        if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
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

      isInitialized = true;
      return { app, db, storage, analytics };
    } catch (error) {
      isInitialized = false;
      initializationPromise = null;
      console.error('Failed to initialize Firebase:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

// Helper function to get Firebase instances
async function getFirebaseInstance() {
  const instances = await initializeFirebase();
  if (!instances.db) {
    throw new Error('Firestore not initialized');
  }
  return instances;
}

export { initializeFirebase, getFirebaseInstance, app, analytics, db, storage, isInitialized }; 