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

  // Check if we're in a server-side rendering context
  if (typeof window === 'undefined') {
    console.warn('Firebase initialization skipped in server-side rendering context');
    throw new Error('Firebase cannot be initialized in server-side rendering context');
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
              console.warn(`Attempt ${i+1}/${maxRetries} to fetch Firebase config failed:`, error);
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
  try {
    // Check if we're in a server-side rendering context
    if (typeof window === 'undefined') {
      console.warn('Firebase cannot be initialized in server-side rendering context');
      throw new Error('Firebase cannot be initialized in server-side rendering context');
    }
    
    const instances = await initializeFirebase();
    if (!instances.db) {
      throw new Error('Firestore not initialized');
    }
    return instances;
  } catch (error) {
    console.error('Error getting Firebase instance:', error);
    
    // Return a mock instance for development/testing or when in SSR
    if (process.env.NODE_ENV === 'development' || typeof window === 'undefined') {
      console.warn('Using mock Firebase instance');
      return {
        app: undefined,
        db: createMockFirestore(),
        storage: undefined,
        analytics: undefined
      };
    }
    
    // In production, we still want to throw the error
    throw error;
  }
}

// Create a mock Firestore for development/testing
function createMockFirestore() {
  // This is a very simple mock that just logs operations
  // It doesn't actually store or retrieve data
  console.warn('Using mock Firestore - no data will be saved or retrieved');
  
  // In-memory storage for mock data
  const collections: Record<string, Record<string, unknown>> = {};
  
  return {
    collection: (collectionPath: string) => {
      // Initialize collection if it doesn't exist
      if (!collections[collectionPath]) {
        collections[collectionPath] = {};
      }
      
      return {
        // Mock query method
        query: () => ({
          orderBy: () => ({
            limit: () => ({
              get: async () => ({
                docs: [],
                forEach: () => { /* Empty function */ }
              }),
              getDocs: async () => ({
                docs: [],
                forEach: () => { /* Empty function */ }
              })
            })
          })
        }),
        // Other collection methods as needed
      };
    },
    doc: (collectionPath: string, docId: string) => {
      // Initialize collection if it doesn't exist
      if (!collections[collectionPath]) {
        collections[collectionPath] = {};
      }
      
      return {
        get: async () => ({
          exists: () => false,
          data: () => null
        }),
        getDoc: async () => ({
          exists: () => false,
          data: () => null
        }),
        set: async (data: unknown) => {
          console.log(`Mock Firestore: set data for ${collectionPath}/${docId}`);
          collections[collectionPath][docId] = data;
          return true;
        },
        setDoc: async (data: unknown) => {
          console.log(`Mock Firestore: setDoc data for ${collectionPath}/${docId}`);
          collections[collectionPath][docId] = data;
          return true;
        },
        update: async (data: unknown) => {
          console.log(`Mock Firestore: update data for ${collectionPath}/${docId}`);
          if (!collections[collectionPath][docId]) {
            collections[collectionPath][docId] = {};
          }
          collections[collectionPath][docId] = {
            ...collections[collectionPath][docId] as Record<string, unknown>,
            ...data as Record<string, unknown>
          };
          return true;
        },
        updateDoc: async (data: unknown) => {
          console.log(`Mock Firestore: updateDoc data for ${collectionPath}/${docId}`);
          if (!collections[collectionPath][docId]) {
            collections[collectionPath][docId] = {};
          }
          collections[collectionPath][docId] = {
            ...collections[collectionPath][docId] as Record<string, unknown>,
            ...data as Record<string, unknown>
          };
          return true;
        }
      };
    },
    // Add other Firestore methods as needed
  } as unknown as Firestore;
}

export { initializeFirebase, getFirebaseInstance, app, analytics, db, storage, isInitialized }; 