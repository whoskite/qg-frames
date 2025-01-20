import { useState, useEffect } from 'react';
import type { FrameContext } from "@farcaster/frame-sdk";
import { getOnboardingData } from '../lib/firestore';
import type { OnboardingState } from '../types/onboarding';

export function useOnboarding(
  context: FrameContext | undefined,
  isFirebaseInitialized: boolean,
  setBgImage: (image: string) => void
) {
  const [onboarding, setOnboarding] = useState<OnboardingState>({
    step: 1,
    personalInfo: {
      gender: '',
      relationshipStatus: '',
      selectedTheme: '',
      areasToImprove: [],
      personalGoals: '',
      preferredQuoteStyle: '',
      preferredLength: '',
      favoriteAuthors: [],
      dailyReminders: false,
      preferredLanguage: '',
      preferredStyles: []
    },
    hasCompletedOnboarding: false
  });

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