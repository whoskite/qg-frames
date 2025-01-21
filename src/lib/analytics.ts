import { getAnalytics, logEvent, Analytics, setUserId, setUserProperties } from 'firebase/analytics';
import { app, initializeFirebase, isInitialized } from './firebase';

let analytics: Analytics | null = null;

// Initialize analytics
export const initAnalytics = async () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!analytics) {
    try {
      if (!isInitialized) {
        await initializeFirebase();
      }

      if (!app) {
        return null;
      }

      analytics = getAnalytics(app);
      return analytics;
    } catch {
      return null;
    }
  }
  return analytics;
};

// Set user ID in analytics
export const setAnalyticsUser = async (userId: string | number, userProperties?: Record<string, string | number | boolean>) => {
  try {
    const analyticsInstance = analytics || await initAnalytics();
    if (analyticsInstance) {
      setUserId(analyticsInstance, userId.toString());
      if (userProperties) {
        setUserProperties(analyticsInstance, userProperties);
      }
      
      // Log a user_login event
      logEvent(analyticsInstance, 'user_login', {
        user_id: userId.toString(),
        login_method: 'farcaster',
        timestamp: Date.now()
      });
    }
  } catch {
    // Silent fail
  }
};

// Log a custom event
export const logAnalyticsEvent = async (eventName: string, eventParams: Record<string, string | number | boolean>) => {
  try {
    const analyticsInstance = analytics || await initAnalytics();
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, eventParams);
    }
  } catch {
    // Silent fail
  }
};

// Log page view
export const logPageView = (pagePath: string) => {
  logAnalyticsEvent('page_view', { page_path: pagePath });
};

// Log user action
export const logUserAction = (action: string, category: string, label: string = '', value?: number) => {
  logAnalyticsEvent('user_action', {
    action,
    category,
    label,
    value: value ?? 0
  });
}; 