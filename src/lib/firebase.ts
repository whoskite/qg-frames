import { initializeApp, type FirebaseApp } from "firebase/app";
import { Analytics, getAnalytics, setAnalyticsCollectionEnabled, isSupported } from "firebase/analytics";
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;
let db: Firestore | undefined;

async function initializeFirebase() {
  if (typeof window === 'undefined') return null;

  try {
    // Only initialize once
    if (app) return { app, analytics, db };

    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      throw new Error(`Failed to fetch Firebase config: ${response.statusText}`);
    }

    const firebaseConfig = await response.json();
    if (!firebaseConfig.projectId) {
      throw new Error('Firebase config is missing projectId');
    }

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    if (await isSupported()) {
      analytics = getAnalytics(app);
      if (process.env.NODE_ENV === 'development') {
        setAnalyticsCollectionEnabled(analytics, true);
      }
    }

    return { app, analytics, db };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return null;
  }
}

export { initializeFirebase, app, analytics, db }; 