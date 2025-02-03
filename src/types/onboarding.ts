export interface OnboardingPersonalInfo {
  gender: string;
  relationshipStatus: string;
  selectedTheme: string;
  areasToImprove: string[];
  personalGoals: string;
  preferredQuoteStyle: string;
  preferredStyles: string[];  // Array of preferred quote styles
}

export interface OnboardingState {
  step: number;
  personalInfo: OnboardingPersonalInfo;
  hasCompletedOnboarding: boolean;
} 