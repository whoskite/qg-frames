export interface OnboardingPersonalInfo {
  gender: string;
  relationshipStatus: string;
  selectedTheme: string;
  areasToImprove: string[];
  personalGoals: string;
  preferredQuoteStyle?: string;
}

export interface OnboardingState {
  step: number;
  personalInfo: OnboardingPersonalInfo;
  hasCompletedOnboarding: boolean;
} 