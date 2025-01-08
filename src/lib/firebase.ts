import { initializeApp, type FirebaseApp } from "firebase/app";
import { Analytics, getAnalytics, setAnalyticsCollectionEnabled, isSupported } from "firebase/analytics";

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;

async function initializeFirebase() {
  if (typeof window === 'undefined') return;

  try {
    // Fetch config from API route
    const response = await fetch('/api/firebase-config');
    const firebaseConfig = await response.json();

    if (!firebaseConfig.projectId) {
      throw new Error('Firebase Project ID is required');
    }

    app = initializeApp(firebaseConfig);
    
    // Initialize analytics
    if (await isSupported()) {
      analytics = getAnalytics(app);
      if (process.env.NODE_ENV === 'development') {
        setAnalyticsCollectionEnabled(analytics, true);
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

// Initialize Firebase when this module is imported
initializeFirebase();

export { app, analytics }; 