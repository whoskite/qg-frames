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
      // Initialize with config
      const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
      };

      // Validate config
      if (!firebaseConfig.projectId) {
        console.error('Firebase Config:', {
          apiKey: !!firebaseConfig.apiKey,
          authDomain: !!firebaseConfig.authDomain,
          projectId: !!firebaseConfig.projectId,
          storageBucket: !!firebaseConfig.storageBucket,
          messagingSenderId: !!firebaseConfig.messagingSenderId,
          appId: !!firebaseConfig.appId,
          measurementId: !!firebaseConfig.measurementId
        });
        throw new Error('Missing required Firebase configuration values');
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
    console.error('Environment variables:', {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      // Log other env vars presence
      hasApiKey: !!process.env.FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.FIREBASE_AUTH_DOMAIN,
      hasStorageBucket: !!process.env.FIREBASE_STORAGE_BUCKET,
      hasMessagingSenderId: !!process.env.FIREBASE_MESSAGING_SENDER_ID,
      hasAppId: !!process.env.FIREBASE_APP_ID,
      hasMeasurementId: !!process.env.FIREBASE_MEASUREMENT_ID
    });
    throw error;
  }
}

export { initializeFirebase, app, analytics, db }; 