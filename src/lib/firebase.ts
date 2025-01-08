import { initializeApp, type FirebaseApp } from "firebase/app";
import { Analytics, getAnalytics, setAnalyticsCollectionEnabled, isSupported } from "firebase/analytics";

console.log('Firebase Config:', {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;

// Check if we're in the browser environment
if (typeof window !== 'undefined') {
  try {
    app = initializeApp(firebaseConfig);
    
    // Initialize analytics
    const initAnalytics = async () => {
      try {
        if (await isSupported()) {
          analytics = getAnalytics(app);
          if (process.env.NODE_ENV === 'development') {
            setAnalyticsCollectionEnabled(analytics, true);
          }
        }
      } catch (error) {
        console.error('Error initializing Firebase Analytics:', error);
      }
    };

    initAnalytics().catch(console.error);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

export { app, analytics }; 