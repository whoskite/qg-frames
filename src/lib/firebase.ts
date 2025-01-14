import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import { Analytics, getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp;
let analytics: Analytics | undefined;
let db: Firestore | undefined;

async function initializeFirebase() {
  if (typeof window === 'undefined') return null;

  try {
    // Use existing instance if available
    if (getApps().length > 0) {
      app = getApps()[0];
      db = getFirestore(app);
      return { app, analytics, db };
    }

    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      throw new Error(`Failed to fetch Firebase config: ${response.statusText}`);
    }

    const firebaseConfig = await response.json();
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);

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