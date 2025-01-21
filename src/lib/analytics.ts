import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';
import { app } from './firebase';

let analytics: Analytics | null = null;

// Initialize analytics
export const initAnalytics = () => {
  if (typeof window !== 'undefined' && !analytics) {
    analytics = getAnalytics(app);
    console.log('Firebase Analytics initialized');
  }
  return analytics;
};

// Log a custom event
export const logAnalyticsEvent = (eventName: string, eventParams?: { [key: string]: any }) => {
  try {
    const analyticsInstance = analytics || initAnalytics();
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, eventParams);
      console.log('Analytics Event:', { eventName, eventParams });
    }
  } catch (error) {
    console.error('Error logging analytics event:', error);
  }
};

// Log page view
export const logPageView = (pagePath: string) => {
  logAnalyticsEvent('page_view', { page_path: pagePath });
};

// Log user action
export const logUserAction = (action: string, category: string, label?: string, value?: number) => {
  logAnalyticsEvent('user_action', {
    action,
    category,
    label,
    value
  });
}; 