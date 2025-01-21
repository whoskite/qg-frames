/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

// 1. Imports
import { Share2, Sparkles, Heart, History, X, Palette, Check, Settings, ChevronDown, Frame, Shuffle } from 'lucide-react';
import { useEffect, useCallback, useState, useRef } from "react";
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import sdk, { FrameNotificationDetails, type FrameContext } from "@farcaster/frame-sdk";
import { logEvent, setUserProperties } from "firebase/analytics";
import { Toaster, toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { generateRandomString } from "~/lib/utils";
import { analytics, initializeFirebase } from '../lib/firebase';
import {
  saveQuoteToHistory,
  getUserQuoteHistory,
  saveFavoriteQuote,
  getUserFavorites,
  removeFavoriteQuote,
  clearUserHistory,
  saveGifPreference,
  getGifPreference,
  saveThemePreference,
  getThemePreference,
  updateUserStreak,
  getUserStreak,
  saveOnboardingData,
  getOnboardingData,
  getStreakHistory
} from '../lib/firestore';
import type { OnboardingState } from '../types/onboarding';
import { OnboardingFlow } from './OnboardingFlow';
import { useOnboarding } from '../hooks/useOnboarding';
import { ErrorBoundary } from './ErrorBoundary';
import type { QuoteHistoryItem, FavoriteQuote } from '../types/quotes';

// UI Components
import { Input } from "../components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/Button";

// Utils and Services
import { generateQuote } from '../app/actions';
import { getGifForQuote } from '../app/utils/giphy';

// 2. Types and Constants
interface FarcasterUser {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  follower_count: number;
  following_count: number;
  profile?: {
    bio?: {
      text?: string;
    } | string;
  };
  verifiedAddresses?: string[];
}

type AnalyticsParams = {
  [key: string]: string | number | boolean | undefined;
};

const MAX_CHARS = 280;
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F06292', '#AEC6CF', '#836FFF', '#77DD77', '#FFB347'];

// 3. Helper Functions
const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

// First, add a timestamp formatter helper function at the top
const formatTimestamp = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // If less than 24 hours, show relative time
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  // Otherwise show date
  return date.toLocaleDateString();
};

// Add these helper functions at the top with other helper functions
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const GRACE_PERIOD_HOURS = 12; // 12 hour grace period
const GRACE_PERIOD_MS = GRACE_PERIOD_HOURS * 60 * 60 * 1000;

const calculateStreakStatus = (lastLoginTimestamp: number | null, graceUsed: boolean = false): {
  isValidStreak: boolean;
  hoursSinceLastLogin: number | null;
  nextEligibleLogin: number | null;
  streakDeadline: number | null;
  isEligibleForIncrement: boolean;
  isInGracePeriod: boolean;
  hoursUntilReset: number | null;
} => {
  if (!lastLoginTimestamp) {
    return {
      isValidStreak: true,
      hoursSinceLastLogin: null,
      nextEligibleLogin: null,
      streakDeadline: null,
      isEligibleForIncrement: true,
      isInGracePeriod: false,
      hoursUntilReset: null
    };
  }

  const now = Date.now();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lastLoginDate = new Date(lastLoginTimestamp);
  const nowDate = new Date(now);
  
  // Convert timestamps to user's local midnight
  const lastLoginMidnight = new Date(lastLoginDate.toLocaleDateString('en-US', { timeZone: userTimezone }));
  const nowMidnight = new Date(nowDate.toLocaleDateString('en-US', { timeZone: userTimezone }));
  
  // Calculate days between midnights
  const daysSinceLastLogin = Math.floor((nowMidnight.getTime() - lastLoginMidnight.getTime()) / TWENTY_FOUR_HOURS);
  const hoursSinceLastLogin = (now - lastLoginTimestamp) / (60 * 60 * 1000);
  
  // Next eligible login is next midnight in user's timezone
  const nextMidnight = new Date(nowMidnight);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  
  // Calculate deadline with grace period
  const deadline = new Date(nextMidnight);
  deadline.setHours(deadline.getHours() + GRACE_PERIOD_HOURS);
  
  const hoursUntilReset = (deadline.getTime() - now) / (60 * 60 * 1000);
  const isInGracePeriod = daysSinceLastLogin > 1 && !graceUsed && hoursSinceLastLogin <= (48 + GRACE_PERIOD_HOURS);
  
  return {
    // Valid if within normal window or grace period
    isValidStreak: daysSinceLastLogin <= 1 || (isInGracePeriod && !graceUsed),
    hoursSinceLastLogin,
    nextEligibleLogin: nextMidnight.getTime(),
    streakDeadline: deadline.getTime(),
    // Only increment if exactly one day has passed or recovering in grace period
    isEligibleForIncrement: daysSinceLastLogin === 1 || (isInGracePeriod && !graceUsed),
    isInGracePeriod,
    hoursUntilReset: hoursUntilReset > 0 ? hoursUntilReset : null
  };
};

// Add these helper functions at the top with other helper functions
const getStorageKey = (fid: number) => `funquotes_history_${fid}`;
const getFavoritesKey = (fid: number) => `funquotes_favorites_${fid}`;

// Add these interfaces at the top with other interfaces
interface StoredQuoteHistoryItem extends Omit<QuoteHistoryItem, 'timestamp'> {
  timestamp: string;
}

interface StoredFavoriteQuote extends Omit<FavoriteQuote, 'timestamp'> {
  timestamp: string;
}

// Add these interfaces near the top with other interfaces
interface UserStreak {
  current_streak: number;
  last_login_timestamp: { toMillis: () => number } | null;
}

interface StreakUpdate {
  current_streak: number;
  last_login_timestamp: Date;
  next_eligible_login: Date;
  streak_deadline: Date;
  grace_period_used?: boolean;
}

// Add this after the imports
const playStreakSound = () => {
  const audio = new Audio('/streak-sound.wav');
  audio.volume = 0.5;
  return audio.play().catch(error => {
    console.error('Error playing sound:', error);
  });
};

// Add this helper function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Add a new state for Firebase initialization
const customScrollbarStyles = `
  /* Default scrollbar styles */
  .custom-scrollbar {
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch; /* Enable smooth scrolling on iOS */
  }

  /* Webkit scrollbar styles */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px; /* Thinner scrollbar for mobile */
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
    min-height: 40px; /* Minimum height for better touch targets */
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  /* Media query for larger screens */
  @media (min-width: 768px) {
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px; /* Slightly wider scrollbar for desktop */
    }
  }

  /* For Firefox */
  @supports (scrollbar-width: thin) {
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #888 #f1f1f1;
    }
  }
`;

// Add after the calculateStreakStatus function and before the Demo component

// Add after generateRandomPrompt function
const analyzeUserPreferences = (favorites: FavoriteQuote[]) => {
  if (!favorites.length) return null;

  // Initialize preference tracking
  const preferences = {
    averageLength: 0,
    commonWords: new Map<string, number>(),
    themes: new Map<string, number>(),
    emotionalTone: {
      positive: 0,
      negative: 0,
      neutral: 0
    },
    complexity: {
      simple: 0,
      moderate: 0,
      complex: 0
    }
  };

  // Emotional words for sentiment analysis
  const emotionalWords = {
    positive: ['happy', 'joy', 'love', 'hope', 'inspire', 'success', 'beautiful', 'courage', 'dream', 'peace'],
    negative: ['fear', 'doubt', 'struggle', 'pain', 'difficult', 'challenge', 'dark', 'lost', 'hard', 'fail'],
    neutral: ['think', 'know', 'understand', 'see', 'find', 'way', 'time', 'life', 'world', 'mind']
  };

  // Process each favorite quote
  favorites.forEach(favorite => {
    const words = favorite.text.toLowerCase().split(/\s+/);
    
    // Track length
    preferences.averageLength += words.length;

    // Analyze words and themes
    words.forEach(word => {
      // Track word frequency
      preferences.commonWords.set(word, (preferences.commonWords.get(word) || 0) + 1);

      // Analyze emotional tone
      if (emotionalWords.positive.includes(word)) preferences.emotionalTone.positive++;
      else if (emotionalWords.negative.includes(word)) preferences.emotionalTone.negative++;
      else preferences.emotionalTone.neutral++;

      // Analyze complexity based on word length
      if (word.length <= 4) preferences.complexity.simple++;
      else if (word.length <= 7) preferences.complexity.moderate++;
      else preferences.complexity.complex++;
    });
  });

  // Calculate averages
  preferences.averageLength /= favorites.length;

  // Sort and get top themes/words
  const sortedWords = Array.from(preferences.commonWords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Determine dominant preferences
  const dominantTone = Object.entries(preferences.emotionalTone)
    .reduce((a, b) => a[1] > b[1] ? a : b)[0];

  const dominantComplexity = Object.entries(preferences.complexity)
    .reduce((a, b) => a[1] > b[1] ? a : b)[0];

  return {
    preferredLength: Math.round(preferences.averageLength),
    favoriteWords: sortedWords.map(([word]) => word),
    dominantTone,
    dominantComplexity
  };
};

// Modify the generateRandomPrompt function to use user preferences
const generateRandomPrompt = (favorites: FavoriteQuote[] = []) => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const month = now.getMonth();
  
  // Get user preferences
  const userPreferences = analyzeUserPreferences(favorites);
  
  // Arrays of themes and modifiers
  const themes = [
    'life', 'success', 'happiness', 'wisdom', 'courage', 'peace',
    'growth', 'creativity', 'friendship', 'love', 'adventure', 'mindfulness'
  ];
  
  const toneModifiers = [
    'inspiring', 'philosophical', 'humorous', 'profound',
    'thought-provoking', 'uplifting', 'reflective', 'motivational'
  ];
  
  const styleModifiers = [
    'metaphorical', 'simple yet deep', 'poetic', 'direct',
    'storytelling', 'paradoxical', 'zen-like', 'analytical'
  ];

  // Adjust based on user preferences if available
  if (userPreferences) {
    // Add user's favorite words to themes
    themes.push(...userPreferences.favoriteWords.filter(word => word.length > 3));
    
    // Adjust tone based on user's preferred emotional tone
    if (userPreferences.dominantTone === 'positive') {
      toneModifiers.push('optimistic', 'joyful', 'enthusiastic');
    } else if (userPreferences.dominantTone === 'negative') {
      toneModifiers.push('contemplative', 'challenging', 'transformative');
    }
    
    // Adjust style based on complexity preference
    if (userPreferences.dominantComplexity === 'simple') {
      styleModifiers.push('clear', 'concise', 'straightforward');
    } else if (userPreferences.dominantComplexity === 'complex') {
      styleModifiers.push('elaborate', 'intricate', 'sophisticated');
    }
  }

  // Use day to select base theme with preference weighting
  const themeIndex = Math.floor((day + month + (userPreferences?.favoriteWords.length || 0)) % themes.length);
  const selectedTheme = themes[themeIndex];

  // Use hour to influence tone with preference weighting
  const toneIndex = Math.floor((hour + day + (userPreferences?.dominantTone === 'positive' ? 2 : 0)) % toneModifiers.length);
  const selectedTone = toneModifiers[toneIndex];

  // Use minutes to select style with complexity preference
  const styleIndex = Math.floor((now.getMinutes() + hour + (userPreferences?.dominantComplexity === 'complex' ? 3 : 0)) % styleModifiers.length);
  const selectedStyle = styleModifiers[styleIndex];

  // Add time-based context
  let timeContext = '';
  if (hour >= 5 && hour < 12) {
    timeContext = 'morning reflection';
  } else if (hour >= 12 && hour < 17) {
    timeContext = 'midday insight';
  } else if (hour >= 17 && hour < 22) {
    timeContext = 'evening contemplation';
  } else {
    timeContext = 'night wisdom';
  }

  // Add seasonal influence
  const seasons = ['winter', 'spring', 'summer', 'fall'];
  const currentSeason = seasons[Math.floor(month / 3)];

  // Add length preference if available
  const lengthPreference = userPreferences?.preferredLength 
    ? `with approximately ${userPreferences.preferredLength} words` 
    : '';

  // Combine all factors into a unique prompt
  return `Generate a ${selectedTone} quote about ${selectedTheme} with a ${selectedStyle} style, incorporating elements of ${timeContext} and the essence of ${currentSeason} ${lengthPreference}. ${
    userPreferences?.favoriteWords.length 
      ? `Consider incorporating themes like: ${userPreferences.favoriteWords.join(', ')}` 
      : ''
  }`;
};

// 4. Main Component
export default function Demo({ title = "Fun Quotes" }) {
  const [quote, setQuote] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bgColor, setBgColor] = useState(getRandomColor());
  const [bgImage, setBgImage] = useState<string>('/Background_Nature_1_pexels-asumaani-16545605.jpg');
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<FrameContext>();
  const [isCasting, setIsCasting] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [quoteHistory, setQuoteHistory] = useState<QuoteHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Frame-specific state
  const [added, setAdded] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState<FrameNotificationDetails | null>(null);
  const [lastEvent, setLastEvent] = useState("");
  const [addFrameResult, setAddFrameResult] = useState("");
  const [sendNotificationResult, setSendNotificationResult] = useState("");

  // Add to your state declarations
  const [favorites, setFavorites] = useState<FavoriteQuote[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  // Add a new state for Firebase initialization
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  // Add to state declarations
  const [showSettings, setShowSettings] = useState(false);
  const [gifEnabled, setGifEnabled] = useState(true);

  // Add a new state to track if it's the initial state
  const [isInitialState, setIsInitialState] = useState(true);

  // Add new state for preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Add to state declarations
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);

  // Add to state declarations
  const [lastTapTime, setLastTapTime] = useState(0);

  // Add to state declarations
  const [showProfile, setShowProfile] = useState(false);

  // Add to state declarations
  const [userStreak, setUserStreak] = useState(0);

  // Add new state for music
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(false);
  const [lastStreakNotification, setLastStreakNotification] = useState<number | null>(null);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  // Add loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingGif, setIsLoadingGif] = useState(false);

  const { onboarding, setOnboarding } = useOnboarding(context, isFirebaseInitialized, setBgImage);

  // 5. Analytics Functions
  const logAnalyticsEvent = useCallback((eventName: string, params: AnalyticsParams) => {
    if (analytics) {
      logEvent(analytics, eventName, params);
      console.log('Analytics Event:', { eventName, params });
    }
  }, []);

  // 6. Frame SDK Functions
  useEffect(() => {
    const initializeFrameSDK = async () => {
      try {
        const frameContext = await sdk.context;
        console.log('Frame SDK Context:', frameContext);
        
        if (!frameContext) {
          console.log('No context available');
          return;
        }
        
        setContext(frameContext);
        if (frameContext.client) {
          setAdded(frameContext.client.added);
        }

        // Setup Frame event listeners
        sdk.on("frameAdded", ({ notificationDetails }) => {
          setLastEvent(`frameAdded${!!notificationDetails ? ", notifications enabled" : ""}`);
          setAdded(true);
          if (notificationDetails) {
            setNotificationDetails(notificationDetails);
          }
        });

        sdk.on("frameAddRejected", ({ reason }) => {
          setLastEvent(`frameAddRejected, reason ${reason}`);
        });

        sdk.on("frameRemoved", () => {
          setLastEvent("frameRemoved");
          setAdded(false);
          setNotificationDetails(null);
        });

        sdk.actions.ready({});
      } catch (error) {
        console.error('Error in initializeFrameSDK:', error);
      }
    };

    if (!isSDKLoaded) {
      setIsSDKLoaded(true);
      initializeFrameSDK();
    }
  }, [isSDKLoaded, setAdded, setNotificationDetails, setLastEvent, isFirebaseInitialized]);

  // 7. Quote Generation Functions
  const handleGenerateQuote = useCallback(async () => {
    try {
      setIsGenerating(true);
      setIsInitialState(false);
      if (isLoading) return;
      setIsLoading(true);
      
      try {
        setGifUrl(null);
        
        // Create a personalized prompt based on user preferences
        let personalizedPrompt = userPrompt;

        // Add emotional context based on time of day
        const hour = new Date().getHours();
        let timeBasedMood = '';
        if (hour >= 5 && hour < 12) {
          timeBasedMood = 'energetic and motivational';
        } else if (hour >= 12 && hour < 17) {
          timeBasedMood = 'focused and productive';
        } else if (hour >= 17 && hour < 22) {
          timeBasedMood = 'reflective and peaceful';
        } else {
          timeBasedMood = 'calm and contemplative';
        }

        // Add style preference
        let styleContext = '';
        switch (onboarding.personalInfo.preferredQuoteStyle) {
          case 'casual':
            styleContext = 'in a casual, friendly, and conversational tone';
            break;
          case 'direct':
            styleContext = 'in a direct, blunt, and straightforward manner';
            break;
          case 'eloquent':
            styleContext = 'in an eloquent, sophisticated, and precise manner';
            break;
          case 'poetic':
            styleContext = 'in a poetic and metaphorical style';
            break;
          case 'humorous':
            styleContext = 'with wit and humor';
            break;
          case 'spiritual':
            styleContext = 'in an enlightening and holistic manner';
            break;
          case 'philosophical':
            styleContext = 'in a thought-provoking and introspective way';
            break;
          default:
            styleContext = 'in a casual, friendly tone';
        }

        // Add areas of improvement context
        if (onboarding.personalInfo.areasToImprove.length > 0) {
          const randomArea = onboarding.personalInfo.areasToImprove[
            Math.floor(Math.random() * onboarding.personalInfo.areasToImprove.length)
          ];
          personalizedPrompt = `${userPrompt || randomArea} ${
            userPrompt ? `with a focus on ${randomArea}` : ''
          }`;
        }

        // Add relationship context if available
        if (onboarding.personalInfo.relationshipStatus && 
            onboarding.personalInfo.relationshipStatus !== 'Prefer not to say') {
          personalizedPrompt += ` for someone who is ${onboarding.personalInfo.relationshipStatus.toLowerCase()}`;
        }

        // Add personal goals context if available
        if (onboarding.personalInfo.personalGoals) {
          personalizedPrompt += ` aligned with goals of ${onboarding.personalInfo.personalGoals}`;
        }

        // Add emotional and style context
        personalizedPrompt += ` with a ${timeBasedMood} tone ${styleContext}`;

        // Add streak-based motivation
        if (userStreak > 0) {
          personalizedPrompt += ` to encourage maintaining a ${userStreak}-day streak of personal growth`;
        }

        const quoteResponse = await generateQuote(personalizedPrompt);
        
        if (quoteResponse) {
          const newQuote = quoteResponse.text.slice(0, MAX_CHARS);
          setQuote(newQuote);
          
          if (gifEnabled) {
            const gifUrl = await getGifForQuote(quoteResponse.text, quoteResponse.style);
            setGifUrl(gifUrl);
          }
          
          // Add to history
          setQuoteHistory(prev => [{
            id: Date.now().toString(),
            text: newQuote,
            style: quoteResponse.style,
            gifUrl: gifEnabled ? gifUrl : null,
            timestamp: new Date(),
            bgColor
          }, ...prev.slice(0, 9)]); // Keep last 10 quotes
          
          logAnalyticsEvent('quote_generated_success', {
            prompt: personalizedPrompt || 'empty_prompt',
            quote_length: quoteResponse.text.length,
            area_of_improvement: onboarding.personalInfo.areasToImprove.join(','),
            relationship_status: onboarding.personalInfo.relationshipStatus,
            has_personal_goals: !!onboarding.personalInfo.personalGoals
          });
        }
      } catch (error) {
        console.error('Error:', error);
        setQuote('Failed to generate quote. Please try again.');
        logAnalyticsEvent('quote_generated_error', {
          prompt: userPrompt || 'empty_prompt',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      toast.error('Failed to generate quote. Please try again.');
      console.error('Error generating quote:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [isLoading, userPrompt, onboarding, userStreak, gifEnabled]);

  // 8. Effect Hooks
  useEffect(() => {
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
    }
  }, [isSDKLoaded]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHistory) {
        setShowHistory(false);
      }
    };

    if (showHistory) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showHistory]);

  // Additional Functions
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerateQuote();
    }
  };

  const handleRegenerateGif = useCallback(async () => {
    try {
      setIsLoadingGif(true);
      if (!quote || isLoading) return;
      
      const searchQuery = encodeURIComponent(quote.slice(0, 30));
      const response = await fetch(`/api/giphy?search=${searchQuery}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch GIF');
      }
      
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(5, data.data.length));
        const newGifUrl = data.data[randomIndex]?.images?.fixed_height?.url;
        setGifUrl(newGifUrl || null);
        
        logAnalyticsEvent('gif_regenerated_success', {
          quote_text: quote.slice(0, 30) + '...'
        });
      }
    } catch (error) {
      toast.error('Failed to regenerate GIF. Please try again.');
      console.error('Error regenerating GIF:', error);
    } finally {
      setIsLoadingGif(false);
    }
  }, [isLoading, quote]);

  const handleReuseQuote = (item: QuoteHistoryItem | FavoriteQuote) => {
    setQuote(item.text);
    if (item.gifUrl) {
      setGifUrl(item.gifUrl);
    }
    setShowHistory(false);
    setShowFavorites(false);
    setIsInitialState(false);
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Show success notification
    toast.success('Quote loaded successfully');
  };

  // Add clear function
  const handleClearHistory = async () => {
    if (!context?.user?.fid) return;
    
    setIsClearing(true);
    try {
      await clearUserHistory(context.user.fid);
      setQuoteHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    } finally {
      setIsClearing(false);
    }
  };

  // Update the Firebase initialization useEffect
  useEffect(() => {
    const initApp = async () => {
      try {
        const result = await initializeFirebase();
        if (!result) {
          throw new Error('Firebase initialization failed');
        }

        const { analytics: fbAnalytics, db } = result;
        if (!db) {
          throw new Error('Firestore not initialized');
        }
        
        if (fbAnalytics) {
          logEvent(fbAnalytics, 'app_initialized');
        }

        setIsFirebaseInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initApp();
  }, []);

  // Update the load saved data effect to wait for Firebase initialization
  useEffect(() => {
    const loadSavedData = async () => {
      if (context?.user?.fid && isFirebaseInitialized) {
        try {
          // Load history
          const history = await getUserQuoteHistory(context.user.fid);
          setQuoteHistory(history);

          // Load favorites
          const favorites = await getUserFavorites(context.user.fid);
          setFavorites(favorites);
        } catch (error) {
          console.error('Error loading saved data:', error);
        }
      }
    };

    loadSavedData();
  }, [context?.user?.fid, isFirebaseInitialized]);

  const saveQuote = useCallback(async () => {
    try {
      setIsSaving(true);
      if (context?.user?.fid && quoteHistory.length > 0) {
        const latestQuote = quoteHistory[0];
        await saveQuoteToHistory(context.user.fid, latestQuote);
      }
    } catch (error) {
      toast.error('Failed to save quote. Please try again.');
      console.error('Error saving quote:', error);
    } finally {
      setIsSaving(false);
    }
  }, [context?.user?.fid, quoteHistory]);

  // Modify the favorite toggle function
  const toggleFavorite = async (quote: QuoteHistoryItem) => {
    if (!context?.user?.fid) {
      console.log('No user FID found, cannot save favorite');
      return;
    }

    try {
      console.log('Starting toggleFavorite with quote:', quote);
      const isAlreadyFavorited = favorites.some(fav => fav.text === quote.text);
      console.log('Is already favorited:', isAlreadyFavorited);
      
      if (isAlreadyFavorited) {
        // Remove from favorites
        const favoriteToRemove = favorites.find(fav => fav.text === quote.text);
        if (favoriteToRemove) {
          console.log('Removing favorite:', favoriteToRemove);
          await removeFavoriteQuote(context.user.fid, favoriteToRemove.id);
          setFavorites(prev => prev.filter(fav => fav.id !== favoriteToRemove.id));
        }
      } else {
        // Add to favorites
        const newFavorite: FavoriteQuote = {
          ...quote,
          id: generateRandomString(10),
          timestamp: new Date()
        };
        
        console.log('Adding new favorite:', newFavorite);
        try {
          // Save to Firestore first
          await saveFavoriteQuote(context.user.fid, newFavorite);
          console.log('Successfully saved to Firestore');
          
          // Update local state after successful save
          setFavorites(prev => [newFavorite, ...prev]);
          console.log('Updated local favorites state');
        } catch (error) {
          console.error('Error saving to Firestore:', error);
          throw error; // Re-throw to be caught by outer catch block
        }
      }
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      if (error instanceof Error) {
        console.error('Full error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
    }
  };

  // Update the streak effect with proper notification timing
  useEffect(() => {
    const updateUserStreakCount = async () => {
      // Only update streak if user is logged in and Firebase is initialized
      if (!context?.user?.fid || !isFirebaseInitialized) return;
      
      // Get the current date in user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const today = new Date().toLocaleDateString('en-US', { timeZone: userTimezone });
      
      // Check if we've already updated the streak today
      const lastUpdate = localStorage.getItem('lastStreakUpdate');
      if (lastUpdate === today) return;
      
      try {
        const userDoc = await getUserStreak(context.user.fid);
        const lastLoginTimestamp = userDoc?.last_login_timestamp?.toMillis() || null;
        const streakHistory = await getStreakHistory(context.user.fid);
        
        const {
          isValidStreak,
          hoursSinceLastLogin,
          nextEligibleLogin,
          streakDeadline,
          isEligibleForIncrement,
          isInGracePeriod,
          hoursUntilReset
        } = calculateStreakStatus(lastLoginTimestamp, userDoc?.grace_period_used);

        let newStreak = userDoc?.current_streak || 0;
        const now = Date.now();

        // Only show notification once per day
        const shouldShowNotification = !lastStreakNotification || 
          new Date(lastStreakNotification).toLocaleDateString('en-US', { timeZone: userTimezone }) !== today;

        if (!lastLoginTimestamp) {
          // First login ever
          newStreak = 1;
          if (shouldShowNotification) {
            playStreakSound();
            toast.info('Streak started! Come back tomorrow to continue.');
            setLastStreakNotification(now);
          }
        } else if (!isValidStreak) {
          // Reset streak if beyond grace period
          const wasLongStreak = newStreak > 3; // Consider it a "long" streak if > 3 days
          newStreak = 1;
          if (shouldShowNotification) {
            playStreakSound();
            if (wasLongStreak) {
              toast.error(
                <div>
                  <div>Streak Reset!</div>
                  <div className="text-sm opacity-80">
                    You missed your daily login window. Your {userDoc.current_streak} day streak has been reset.
                    Remember to log in daily to maintain your streak!
                  </div>
                </div>
              );
            } else {
              toast.info('New streak started! Come back tomorrow to continue.');
            }
            setLastStreakNotification(now);
          }
        } else if (isInGracePeriod) {
          // In grace period - chance to recover streak
          newStreak = userDoc.current_streak; // Maintain current streak
          if (shouldShowNotification) {
            playStreakSound();
            toast.warning(
              <div>
                <div>Streak Recovery Mode 🎯</div>
                <div className="text-sm opacity-80">
                  <p>Your {newStreak} day streak is at risk!</p>
                  <p>You have {Math.ceil(hoursUntilReset || 0)} hours left in the grace period to maintain your streak.</p>
                  <p className="mt-1 text-xs">Tip: Log in daily to avoid using grace periods.</p>
                </div>
              </div>
            );
            setLastStreakNotification(now);
          }
        } else if (isEligibleForIncrement) {
          // Normal streak increment
          newStreak += 1;
          if (shouldShowNotification) {
            playStreakSound();
            const streakStartDate = streakHistory.initial_streak_start?.toDate();
            const daysFromStart = streakStartDate ? 
              Math.floor((now - streakStartDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
            
            toast.success(
              <div>
                <div>🔥 {newStreak} Day Streak!</div>
                {streakStartDate && (
                  <div className="text-sm opacity-80">
                    Started {formatTimestamp(streakStartDate)}
                    {daysFromStart > 0 && ` (${daysFromStart} days ago)`}
                  </div>
                )}
              </div>
            );
            setLastStreakNotification(now);
          }
        } else if (hoursUntilReset && hoursUntilReset < 4 && shouldShowNotification) {
          // Warning when close to reset
          toast.warning(
            <div>
              <div>⚠️ Streak at Risk!</div>
              <div className="text-sm opacity-80">
                Log in within {Math.ceil(hoursUntilReset)} hours to maintain your {newStreak} day streak!
              </div>
            </div>
          );
          setLastStreakNotification(now);
        }

        // Update the streak in Firestore
        const streakUpdate: StreakUpdate = {
          current_streak: newStreak,
          last_login_timestamp: new Date(),
          next_eligible_login: new Date(nextEligibleLogin || now + TWENTY_FOUR_HOURS),
          streak_deadline: new Date(streakDeadline || now + TWENTY_FOUR_HOURS),
          grace_period_used: isInGracePeriod ? true : undefined // Only set if grace period was used
        };
        
        await updateUserStreak(context.user.fid, streakUpdate);
        
        // Store today's date as last update
        localStorage.setItem('lastStreakUpdate', today);

        // Update streak count without notification if it has changed
        if (newStreak !== userStreak) {
          setUserStreak(newStreak);
        }

        // Log analytics
        logAnalyticsEvent('streak_updated', {
          new_streak: newStreak,
          hours_since_last_login: hoursSinceLastLogin || 0,
          streak_maintained: isValidStreak,
          notification_shown: shouldShowNotification,
          timezone: userTimezone,
          in_grace_period: isInGracePeriod,
          hours_until_reset: hoursUntilReset || 0,
          days_since_initial_start: streakHistory.initial_streak_start ? 
            Math.floor((now - streakHistory.initial_streak_start.toDate().getTime()) / (24 * 60 * 60 * 1000)) : 0
        });

      } catch (error) {
        console.error('Error updating streak:', error);
        toast.error('Failed to update streak');
      }
    };

    updateUserStreakCount();
  }, [context?.user?.fid, isFirebaseInitialized, userStreak, lastStreakNotification]);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen">
        {/* Rest of the component content */}
      </div>
    </ErrorBoundary>
  );
}
