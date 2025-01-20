export interface OnboardingState {
  step: number;
  personalInfo: {
    gender: string;
    relationshipStatus: string;
    selectedTheme: string;
    areasToImprove: string[];
    personalGoals: string;
    preferredQuoteStyle: string;  // e.g., 'inspirational', 'philosophical', 'humorous'
    preferredLength: string;      // e.g., 'short', 'medium', 'long'
    favoriteAuthors: string[];    // List of preferred quote authors/sources
    dailyReminders: boolean;      // Whether user wants daily quote reminders
    preferredLanguage: string;    // Preferred language style (formal/casual)
  };
  hasCompletedOnboarding: boolean;
} 