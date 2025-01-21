import { getAnalytics, logEvent, Analytics, setUserId, setUserProperties } from 'firebase/analytics';
import { app, initializeFirebase, isInitialized } from './firebase';

let analytics: Analytics | null = null;

// Initialize analytics
export const initAnalytics = async () => {
  if (typeof window === 'undefined') {
    console.log('⏭️ Skipping analytics initialization in server context');
    return null;
  }

  if (!analytics) {
    try {
      console.log('🔄 Initializing Firebase Analytics...');
      
      // Ensure Firebase is initialized
      if (!isInitialized) {
        console.log('⏳ Waiting for Firebase initialization...');
        await initializeFirebase();
      }

      if (!app) {
        console.error('❌ Firebase app not initialized');
        return null;
      }

      analytics = getAnalytics(app);
      console.log('✅ Firebase Analytics initialized successfully');
      return analytics;
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Analytics:', error);
      return null;
    }
  }
  return analytics;
};

// Set user ID in analytics
export const setAnalyticsUser = async (userId: string | number, userProperties?: Record<string, string | number | boolean>) => {
  try {
    console.log('👤 Setting analytics user ID:', userId);
    const analyticsInstance = analytics || await initAnalytics();
    if (analyticsInstance) {
      setUserId(analyticsInstance, userId.toString());
      if (userProperties) {
        setUserProperties(analyticsInstance, userProperties);
      }
      console.log('✅ Analytics user ID set successfully');
      
      // Log a user_login event
      logEvent(analyticsInstance, 'user_login', {
        user_id: userId.toString(),
        login_method: 'farcaster',
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('❌ Error setting analytics user:', error);
  }
};

// Log a custom event
export const logAnalyticsEvent = async (eventName: string, eventParams: Record<string, string | number | boolean>) => {
  try {
    console.log('📊 Attempting to log event:', eventName);
    const analyticsInstance = analytics || await initAnalytics();
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, eventParams);
      console.log('✅ Analytics Event logged successfully:', { eventName, eventParams });
    } else {
      console.warn('⚠️ Analytics not initialized, event not logged:', eventName);
    }
  } catch (error) {
    console.error('❌ Error logging analytics event:', error);
  }
};

// Log page view
export const logPageView = (pagePath: string) => {
  console.log('📄 Logging page view:', pagePath);
  logAnalyticsEvent('page_view', { page_path: pagePath });
};

// Log user action
export const logUserAction = (action: string, category: string, label: string = '', value?: number) => {
  console.log('👤 Logging user action:', { action, category, label, value });
  logAnalyticsEvent('user_action', {
    action,
    category,
    label,
    value: value ?? 0
  });
}; 