import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';
import { app } from './firebase';

let analytics: Analytics | null = null;

// Initialize analytics
export const initAnalytics = () => {
  if (typeof window !== 'undefined' && !analytics) {
    try {
      console.log('Initializing Firebase Analytics...');
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

// Log a custom event
export const logAnalyticsEvent = (eventName: string, eventParams: Record<string, string | number | boolean>) => {
  try {
    console.log('📊 Attempting to log event:', eventName);
    const analyticsInstance = analytics || initAnalytics();
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