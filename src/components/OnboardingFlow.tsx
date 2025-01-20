import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { FrameContext } from "@farcaster/frame-sdk";
import { Button } from "./ui/Button";
import { saveOnboardingData, saveThemePreference } from '../lib/firestore';
import type { OnboardingState } from '../types/onboarding';

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
              {['Single', 'In a relationship', 'Married', 'It&apos;s complicated', 'Prefer not to say'].map((status) => (
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
            className="space-y-6 p-4"
          >
            <h2 className="text-xl font-bold text-white text-center">Choose Your Style</h2>
            <p className="text-white/90 text-center text-sm">How would you like your quotes to sound?</p>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  style: 'casual',
                  name: 'Casual & Friendly',
                  description: 'Like chatting with a friend',
                  icon: '👋'
                },
                {
                  style: 'direct',
                  name: 'Direct & Blunt',
                  description: 'Straight to the point, no sugar coating',
                  icon: '🎯'
                },
                {
                  style: 'eloquent',
                  name: 'Eloquent & Precise',
                  description: 'Sophisticated and well-crafted',
                  icon: '✨'
                },
                {
                  style: 'poetic',
                  name: 'Poetic & Flowing',
                  description: 'Artistic and metaphorical',
                  icon: '🎭'
                },
                {
                  style: 'humorous',
                  name: 'Witty & Playful',
                  description: 'With a touch of humor',
                  icon: '😄'
                }
              ].map((style) => (
                <button
                  key={style.style}
                  onClick={() => {
                    updatePersonalInfo('preferredQuoteStyle', style.style);
                  }}
                  className={`
                    group relative overflow-hidden rounded-xl p-4 transition-all duration-300
                    ${onboarding.personalInfo.preferredQuoteStyle === style.style
                      ? 'bg-white text-purple-600 shadow-lg scale-[0.98]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{style.icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{style.name}</div>
                      <div className="text-xs opacity-80">{style.description}</div>
                    </div>
                  </div>
                  {onboarding.personalInfo.preferredQuoteStyle === style.style && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6 p-4"
          >
            <h2 className="text-2xl font-bold text-white">Pick Your Theme</h2>
            <div className="space-y-2">
              <p className="text-white/90 text-sm">Choose a background that speaks to you</p>
              <p className="text-white/70 text-xs">Don't worry, you can explore more themes later in settings</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {[
                { name: 'Nature', value: '/Background_Nature_1_pexels-asumaani-16545605.jpg' },
                { name: 'Urban', value: '/Background_Urban_1_pexels-kyle-miller-169884138-18893527.jpg' },
                { name: 'Gradient', value: 'gradient-purple' },
                { name: 'Minimal', value: 'gradient-black' }
              ].map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => {
                    updatePersonalInfo('selectedTheme', theme.value);
                  }}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                >
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: theme.value.includes('gradient') 
                        ? theme.value === 'gradient-purple'
                          ? 'linear-gradient(to bottom right, #472A91, rgb(147, 51, 234), rgb(107, 33, 168))'
                          : 'linear-gradient(to bottom right, rgb(17, 24, 39), rgb(55, 65, 81), rgb(31, 41, 55))'
                        : `url(${theme.value})`
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors" />
                  <span className="absolute inset-0 flex items-center justify-center text-white font-medium text-sm">
                    {theme.name}
                  </span>
                  {onboarding.personalInfo.selectedTheme === theme.value && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 bg-white/20 rounded-full p-1"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
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
            <h2 className="text-xl font-bold text-white text-center">Areas of Focus</h2>
            <p className="text-white/90 text-center text-sm">Select what matters most to you</p>
            
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                {[
                  { icon: '💼', label: 'Career' },
                  { icon: '🎯', label: 'Personal Growth' },
                  { icon: '❤️', label: 'Relationships' },
                  { icon: '💪', label: 'Health' },
                  { icon: '💰', label: 'Finance' },
                  { icon: '🧘', label: 'Mindfulness' },
                  { icon: '🎨', label: 'Creativity' },
                  { icon: '👥', label: 'Leadership' },
                  { icon: '🌱', label: 'Learning' },
                  { icon: '🎮', label: 'Work-Life Balance' },
                  { icon: '🌍', label: 'Social Impact' },
                  { icon: '🚀', label: 'Innovation' }
                ].map(({ icon, label }) => (
                  <button
                    key={label}
                    onClick={() => {
                      const currentAreas = onboarding.personalInfo.areasToImprove;
                      const newAreas = currentAreas.includes(label)
                        ? currentAreas.filter(a => a !== label)
                        : [...currentAreas, label];
                      updatePersonalInfo('areasToImprove', newAreas);
                    }}
                    className={`
                      group relative overflow-hidden rounded-xl p-3 transition-all duration-300
                      ${onboarding.personalInfo.areasToImprove.includes(label)
                        ? 'bg-white text-purple-600 shadow-lg scale-[0.98]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl sm:text-2xl">{icon}</span>
                      <span className="text-xs sm:text-sm font-medium">{label}</span>
                    </div>
                    {onboarding.personalInfo.areasToImprove.includes(label) && (
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
          </motion.div>
        );

      case 7:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 p-4"
          >
            <h2 className="text-xl font-bold text-white text-center">Personal Goals</h2>
            <p className="text-white/90 text-center text-sm">Share your aspirations to get more relevant quotes</p>
            
            <textarea
              value={onboarding.personalInfo.personalGoals}
              onChange={(e) => updatePersonalInfo('personalGoals', e.target.value)}
              placeholder="What do you want to achieve? 🎯"
              className="w-full h-32 p-4 rounded-xl bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none text-sm"
            />
          </motion.div>
        );

      case 8:
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
            onClick={onboarding.step === 8 ? handleComplete : handleNext}
            disabled={
              (onboarding.step === 2 && !onboarding.personalInfo.gender) ||
              (onboarding.step === 3 && !onboarding.personalInfo.relationshipStatus) ||
              (onboarding.step === 4 && !onboarding.personalInfo.preferredQuoteStyle) ||
              (onboarding.step === 5 && !onboarding.personalInfo.selectedTheme) ||
              (onboarding.step === 6 && onboarding.personalInfo.areasToImprove.length === 0) ||
              (onboarding.step === 7 && !onboarding.personalInfo.personalGoals.trim())
            }
            className={`w-full ${
              onboarding.step === 8 
                ? 'bg-purple-600 hover:bg-purple-700'
                : !onboarding.personalInfo.gender && onboarding.step === 2
                ? 'bg-purple-400 cursor-not-allowed'
                : !onboarding.personalInfo.relationshipStatus && onboarding.step === 3
                ? 'bg-purple-400 cursor-not-allowed'
                : !onboarding.personalInfo.preferredQuoteStyle && onboarding.step === 4
                ? 'bg-purple-400 cursor-not-allowed'
                : !onboarding.personalInfo.selectedTheme && onboarding.step === 5
                ? 'bg-purple-400 cursor-not-allowed'
                : onboarding.step === 6 && onboarding.personalInfo.areasToImprove.length === 0
                ? 'bg-purple-400 cursor-not-allowed'
                : onboarding.step === 7 && !onboarding.personalInfo.personalGoals.trim()
                ? 'bg-purple-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            } text-white py-2 rounded-lg transition-colors`}
          >
            {onboarding.step === 8 ? 'Get Started' : 'Continue'}
            {onboarding.step === 6 && onboarding.personalInfo.areasToImprove.length > 0 && 
              ` (${onboarding.personalInfo.areasToImprove.length} selected)`
            }
          </Button>
        </div>
      </div>
    </div>
  );
}; 