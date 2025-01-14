import { initializeApp, type FirebaseApp } from "firebase/app";
import { Analytics, getAnalytics, setAnalyticsCollectionEnabled, isSupported } from "firebase/analytics";
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;
let db: Firestore | undefined;

const firebaseConfig = {
  apiKey: "AIzaSyAlEvmbGZF8w5MJvHTR5LwXEN4RY44bpYE",
  authDomain: "funquotes-864f1.firebaseapp.com",
  projectId: "funquotes-864f1",
  storageBucket: "funquotes-864f1.appspot.com",
  messagingSenderId: "653295041318",
  appId: "1:653295041318:web:4e27882cddd96b7e305fe7",
  measurementId: "G-ZSK0QT3J1Q"
};

// Only initialize in browser environment
if (typeof window !== 'undefined') {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    isSupported().then(supported => {
      if (supported) {
        analytics = getAnalytics(app);
        setAnalyticsCollectionEnabled(analytics, true);
      }
    }).catch(console.error);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

export { app, analytics, db }; 