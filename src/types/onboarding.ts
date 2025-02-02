export interface PersonalInfo {
  gender: string;
  relationshipStatus: string;
  selectedTheme: string;
  areasToImprove: string[];
  personalGoals: string;
  preferredQuoteStyle: string;
  preferredStyles: string[];
}

export interface OnboardingState {
  step: number;
  hasCompletedOnboarding: boolean;
  personalInfo: PersonalInfo;
} 