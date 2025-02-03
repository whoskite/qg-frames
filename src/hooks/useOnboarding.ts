import { useState, useEffect } from 'react';

import { getOnboardingData } from '~/lib/firestore';
import type { OnboardingState } from '../types/onboarding';

interface UserContext {
  user?: {
    fid: number;
  };
}

export function useOnboarding(
  context: UserContext | undefined,
  isFirebaseInitialized: boolean,
  setBgImage: (image: string) => void
) {
  const initialState: OnboardingState = {
    step: 1,
    hasCompletedOnboarding: false,
    personalInfo: {
      gender: '',
      relationshipStatus: '',
      selectedTheme: '',
      areasToImprove: [],
      personalGoals: '',
      preferredQuoteStyle: '',
      preferredStyles: []  // Initialize empty array for preferred styles
    }
  };

  const [onboarding, setOnboarding] = useState<OnboardingState>(initialState);

  useEffect(() => {
    const loadOnboardingData = async () => {
      if (context?.user?.fid && isFirebaseInitialized) {
        try {
          const data = await getOnboardingData(context.user.fid);
          if (data) {
            setOnboarding((prev: OnboardingState) => ({
              ...prev,
              hasCompletedOnboarding: data.hasCompletedOnboarding,
              personalInfo: data.onboardingData || prev.personalInfo
            }));

            // If they have a theme preference, apply it
            if (data.onboardingData?.selectedTheme) {
              setBgImage(data.onboardingData.selectedTheme);
            }
          }
        } catch (error) {
          console.error('Error loading onboarding data:', error);
        }
      }
    };

    loadOnboardingData();
  }, [context?.user?.fid, isFirebaseInitialized, setBgImage]);

  return {
    onboarding,
    setOnboarding
  };
} 