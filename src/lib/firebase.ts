import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import { Analytics, getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;
let db: Firestore | undefined;

async function initializeFirebase() {
  if (typeof window === 'undefined') return null;

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
      if (!firebaseConfig.projectId) {
        throw new Error('Invalid Firebase configuration');
      }

      app = initializeApp(firebaseConfig);
    }

    // Initialize Firestore
    db = getFirestore(app);

    // Initialize Analytics if supported
    if (await isSupported()) {
      analytics = getAnalytics(app);
    }

    return { app, analytics, db };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

export { initializeFirebase, app, analytics, db }; 