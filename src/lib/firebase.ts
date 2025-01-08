import { initializeApp, type FirebaseApp } from "firebase/app";
import { Analytics, getAnalytics, setAnalyticsCollectionEnabled, isSupported } from "firebase/analytics";

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;

async function initializeFirebase() {
  if (typeof window === 'undefined') return;

  try {
    // Fetch config from API route with error handling
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to fetch Firebase config: ${errorData.error || response.statusText}`);
    }

    const firebaseConfig = await response.json();

    // Validate config
    if (!firebaseConfig.projectId) {
      throw new Error('Firebase config is missing projectId');
    }

    // Log config in development (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Initializing Firebase with config:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain
      });
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
    // Optionally report to your error tracking service
    throw error; // Re-throw to handle it in the component
  }
}

// Initialize Firebase when this module is imported
initializeFirebase().catch(error => {
  console.error('Failed to initialize Firebase:', error);
});

export { app, analytics }; 