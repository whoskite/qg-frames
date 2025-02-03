import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from "./ui/Button";
import { saveOnboardingData, saveThemePreference } from '../lib/firestore';
import type { OnboardingState } from '../types/onboarding';
import type { FrameContext } from "@farcaster/frame-sdk";

interface OnboardingProps {
  onboarding: OnboardingState;
  setOnboarding: React.Dispatch<React.SetStateAction<OnboardingState>>;
  onComplete: () => void;
  context: FrameContext | undefined;
  setBgImage: (image: string) => void;
}

export const OnboardingFlow: React.FC<OnboardingProps> = ({ 
  onboarding, 
  setOnboarding, 
  onComplete,
  context,
  setBgImage
}) => {
  const handleNext = () => {
    setOnboarding(prev => ({ ...prev, step: prev.step + 1 }));
  };

  const handleBack = () => {
    setOnboarding(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  };

  const handleSkip = () => {
    setOnboarding(prev => ({ ...prev, step: prev.step + 1 }));
  };

  const updatePersonalInfo = (key: keyof OnboardingState['personalInfo'], value: string | string[]) => {
    setOnboarding(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [key]: value
      }
    }));
  };

  const handleComplete = async () => {
    if (context?.user?.fid) {
      try {
        await saveOnboardingData(context.user.fid, onboarding.personalInfo);
        // Apply the selected theme
        if (onboarding.personalInfo.selectedTheme) {
          setBgImage(onboarding.personalInfo.selectedTheme);
          await saveThemePreference(context.user.fid, onboarding.personalInfo.selectedTheme);
        }
        setOnboarding(prev => ({ ...prev, hasCompletedOnboarding: true }));
        onComplete();
      } catch (error) {
        console.error('Error saving onboarding data:', error);
        toast.error('Failed to save preferences');
      }
    }
  };

  const renderStep = () => {
    switch (onboarding.step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6 p-4"
          >
            <h2 className="text-2xl font-bold text-white">Welcome to Fun Quotes</h2>
            <p className="text-white/90">Tailor your journey by sharing a bit about yourself.</p>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-bold text-white text-center">Question #1</h2>
            <p className="text-white/90 text-center">What&apos;s your gender?</p>
            <div className="space-y-3">
              {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map((gender) => (
                <button
                  key={gender}
                  onClick={() => {
                    updatePersonalInfo('gender', gender);
                  }}
                  className={`w-full p-4 rounded-lg text-left transition-colors ${
                    onboarding.personalInfo.gender === gender
                      ? 'bg-white text-purple-600'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {gender}
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-bold text-white text-center">Question #2</h2>
            <p className="text-white/90 text-center">What&apos;s your relationship status?</p>
            <div className="space-y-3">
              {['Single', 'In a relationship', 'Married', 'It\'s complicated', 'Prefer not to say'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    updatePersonalInfo('relationshipStatus', status);
                  }}
                  className={`w-full p-4 rounded-lg text-left transition-colors ${
                    onboarding.personalInfo.relationshipStatus === status
                      ? 'bg-white text-purple-600'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-bold text-white text-center">What matters to you?</h2>
            <p className="text-white/90 text-center">Choose areas you&apos;d like to focus on (max 3)</p>
            <div className="space-y-3">
              {[
                { id: 'personal-growth', label: '🌱 Personal Growth', description: 'Self-improvement and development' },
                { id: 'motivation', label: '🔥 Motivation', description: 'Drive and inspiration' },
                { id: 'mindfulness', label: '🧘 Mindfulness', description: 'Peace and mental clarity' },
                { id: 'success', label: '⭐ Success', description: 'Achievement and goals' },
                { id: 'relationships', label: '💝 Relationships', description: 'Love and connections' },
                { id: 'happiness', label: '😊 Happiness', description: 'Joy and positivity' }
              ].map((area) => (
                <button
                  key={area.id}
                  onClick={() => {
                    const currentAreas = onboarding.personalInfo.areasToImprove;
                    const isSelected = currentAreas.includes(area.id);
                    if (!isSelected && currentAreas.length >= 3) {
                      toast.error('Maximum 3 areas can be selected');
                      return;
                    }
                    const newAreas = isSelected
                      ? currentAreas.filter(a => a !== area.id)
                      : [...currentAreas, area.id];
                    updatePersonalInfo('areasToImprove', newAreas);
                  }}
                  className={`w-full p-4 rounded-lg text-left transition-colors ${
                    onboarding.personalInfo.areasToImprove.includes(area.id)
                      ? 'bg-white text-purple-600'
                      : onboarding.personalInfo.areasToImprove.length >= 3
                        ? 'bg-white/10 text-white/50 cursor-not-allowed'
                        : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  disabled={!onboarding.personalInfo.areasToImprove.includes(area.id) && onboarding.personalInfo.areasToImprove.length >= 3}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{area.label}</div>
                      <div className="text-sm opacity-80">{area.description}</div>
                    </div>
                    {onboarding.personalInfo.areasToImprove.includes(area.id) && (
                      <Check className="w-5 h-5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-white/70 text-sm text-center">
              {3 - onboarding.personalInfo.areasToImprove.length} selection{3 - onboarding.personalInfo.areasToImprove.length !== 1 ? 's' : ''} remaining
            </p>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 p-4"
          >
            <h2 className="text-xl font-bold text-white text-center">Personal Goals</h2>
            <p className="text-white/90 text-center text-sm">Tell us what you want to work towards in life - this helps us find quotes that match your journey</p>
            
            <textarea
              value={onboarding.personalInfo.personalGoals}
              onChange={(e) => updatePersonalInfo('personalGoals', e.target.value)}
              placeholder="e.g., I want to be more confident, start a business, improve my relationships..."
              className="w-full h-32 p-4 rounded-xl bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none text-sm"
            />
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 p-4"
          >
            <h2 className="text-xl font-bold text-white text-center">Tone and Style</h2>
            <p className="text-white/90 text-center text-sm">Choose up to 3 styles for your quotes</p>
            
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                {[
                  { icon: '💫', label: 'Inspirational' },
                  { icon: '🎭', label: 'Philosophical' },
                  { icon: '💡', label: 'Practical' },
                  { icon: '✨', label: 'Poetic' },
                  { icon: '🌟', label: 'Motivational' },
                  { icon: '🎯', label: 'Direct' },
                  { icon: '🌈', label: 'Optimistic' },
                  { icon: '🤔', label: 'Thought-provoking' },
                  { icon: '💪', label: 'Empowering' },
                  { icon: '😊', label: 'Light-hearted' },
                  { icon: '🧠', label: 'Intellectual' },
                  { icon: '💭', label: 'Reflective' }
                ].map(({ icon, label }) => (
                  <button
                    key={label}
                    onClick={() => {
                      const currentStyles = onboarding.personalInfo.preferredStyles || [];
                      const isSelected = currentStyles.includes(label);
                      if (!isSelected && currentStyles.length >= 3) {
                        toast.error('Maximum 3 styles can be selected');
                        return;
                      }
                      const newStyles = isSelected
                        ? currentStyles.filter(s => s !== label)
                        : [...currentStyles, label];
                      updatePersonalInfo('preferredStyles', newStyles);
                    }}
                    className={`
                      group relative overflow-hidden rounded-xl p-3 transition-all duration-300
                      ${(onboarding.personalInfo.preferredStyles || []).includes(label)
                        ? 'bg-white text-purple-600 shadow-lg scale-[0.98]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl sm:text-2xl">{icon}</span>
                      <span className="text-xs sm:text-sm font-medium">{label}</span>
                    </div>
                    {(onboarding.personalInfo.preferredStyles || []).includes(label) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1"
                      >
                        <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-white/70 text-sm text-center">
              {3 - (onboarding.personalInfo.preferredStyles || []).length} selection{3 - (onboarding.personalInfo.preferredStyles || []).length !== 1 ? 's' : ''} remaining
            </p>
          </motion.div>
        );

      case 7:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6 p-4"
          >
            <div className="text-5xl sm:text-6xl mb-4">✨</div>
            <h2 className="text-2xl font-bold text-white">All Set!</h2>
            <p className="text-white/90 text-sm">Your personalized quote journey begins now</p>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 h-full w-full max-w-lg mx-auto flex flex-col">
        {/* Fixed Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-purple-900/50 backdrop-blur-sm">
          {onboarding.step > 1 ? (
            <button 
              onClick={handleBack}
              className="text-white hover:text-white/80"
            >
              <ChevronDown className="w-6 h-6 rotate-90" />
            </button>
          ) : (
            <div className="w-6" /> /* Spacer for alignment */
          )}
          {onboarding.step < 5 && (
            <button 
              onClick={handleSkip}
              className="text-white hover:text-white/80"
            >
              Skip
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-white/10 p-4 bg-purple-900/50 backdrop-blur-sm">
          <Button
            onClick={onboarding.step === 7 ? handleComplete : handleNext}
            disabled={
              (onboarding.step === 2 && !onboarding.personalInfo.gender) ||
              (onboarding.step === 3 && !onboarding.personalInfo.relationshipStatus) ||
              (onboarding.step === 4 && !onboarding.personalInfo.areasToImprove.length) ||
              (onboarding.step === 5 && !onboarding.personalInfo.personalGoals.trim()) ||
              (onboarding.step === 6 && !(onboarding.personalInfo.preferredStyles || []).length)
            }
            className={`w-full ${
              onboarding.step === 7 
                ? 'bg-purple-600 hover:bg-purple-700'
                : !onboarding.personalInfo.gender && onboarding.step === 2
                ? 'bg-purple-400 cursor-not-allowed'
                : !onboarding.personalInfo.relationshipStatus && onboarding.step === 3
                ? 'bg-purple-400 cursor-not-allowed'
                : !onboarding.personalInfo.areasToImprove.length && onboarding.step === 4
                ? 'bg-purple-400 cursor-not-allowed'
                : !onboarding.personalInfo.personalGoals.trim() && onboarding.step === 5
                ? 'bg-purple-400 cursor-not-allowed'
                : onboarding.step === 6 && !(onboarding.personalInfo.preferredStyles || []).length
                ? 'bg-purple-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            } text-white py-2 rounded-lg transition-colors`}
          >
            {onboarding.step === 7 ? 'Get Started' : 'Continue'}
            {onboarding.step === 6 && (onboarding.personalInfo.preferredStyles || []).length > 0 && 
              ` (${(onboarding.personalInfo.preferredStyles || []).length} selected)`
            }
          </Button>
        </div>
      </div>
    </div>
  );
}; 