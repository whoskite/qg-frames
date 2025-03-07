/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

// 1. Imports
import { Share2, Sparkles, Heart, History, X, Palette, Check, Settings, ChevronDown, Frame, Shuffle, Upload, Dice3, ChevronRight, ChevronLeft, Quote } from 'lucide-react';
import { useEffect, useCallback, useState, useRef } from "react";
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import sdk, {
  AddFrame,
  FrameNotificationDetails,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import type { FrameContext } from "@farcaster/frame-core";

import { logEvent, setUserProperties } from "firebase/analytics";
import { Toaster, toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
  saveNotificationDetails,
  removeNotificationDetails
} from '../lib/firestore';
import type { OnboardingState } from '../types/onboarding';
import { OnboardingFlow } from './OnboardingFlow';
import { useOnboarding } from '../hooks/useOnboarding';
import type { QuoteHistoryItem, FavoriteQuote, CategoryQuote } from '../types/quotes';
import { logAnalyticsEvent, logUserAction, setAnalyticsUser } from '../lib/analytics';
import { BottomNav } from './BottomNav';
import { Categories } from './Categories';

// UI Components
import { Input } from "../components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/Button";

// Utils and Services
import { generateQuote } from '../app/actions';
import { getGifForQuote } from '../app/utils/giphy';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
  
  // Expanded arrays of themes and modifiers
  const themes = {
    personal: ['growth', 'confidence', 'resilience', 'authenticity', 'self-discovery', 'purpose'],
    relationships: ['friendship', 'love', 'empathy', 'trust', 'connection', 'understanding'],
    career: ['success', 'ambition', 'leadership', 'creativity', 'innovation', 'perseverance'],
    wellbeing: ['mindfulness', 'balance', 'health', 'peace', 'gratitude', 'happiness'],
    wisdom: ['philosophy', 'knowledge', 'insight', 'truth', 'understanding', 'awareness'],
    motivation: ['inspiration', 'determination', 'courage', 'discipline', 'focus', 'drive'],
    life: ['adventure', 'change', 'destiny', 'journey', 'possibility', 'opportunity']
  };
  
  const toneModifiers = {
    inspiring: ['uplifting', 'motivational', 'encouraging', 'empowering', 'hopeful'],
    reflective: ['thoughtful', 'introspective', 'contemplative', 'philosophical', 'meditative'],
    practical: ['actionable', 'pragmatic', 'straightforward', 'grounded', 'realistic'],
    emotional: ['passionate', 'heartfelt', 'sincere', 'genuine', 'authentic'],
    humorous: ['witty', 'playful', 'lighthearted', 'clever', 'amusing']
  };
  
  const styleModifiers = {
    poetic: ['metaphorical', 'lyrical', 'rhythmic', 'flowing', 'artistic'],
    direct: ['clear', 'concise', 'powerful', 'impactful', 'bold'],
    narrative: ['storytelling', 'descriptive', 'engaging', 'vivid', 'expressive'],
    wisdom: ['sage-like', 'timeless', 'profound', 'enlightening', 'insightful']
  };

  // Time-based context
  const timeContext = {
    earlyMorning: hour >= 5 && hour < 9,
    morning: hour >= 9 && hour < 12,
    afternoon: hour >= 12 && hour < 17,
    evening: hour >= 17 && hour < 22,
    night: hour >= 22 || hour < 5
  };

  // Day-based context
  const dayContext = {
    isWeekend: day === 0 || day === 6,
    isMonday: day === 1,
    isFriday: day === 5
  };

  // Season-based context
  const seasons = ['winter', 'spring', 'summer', 'fall'];
  const currentSeason = seasons[Math.floor(month / 3)];

  // Select theme category based on time and preferences
  let themeCategory = 'personal';
  if (timeContext.earlyMorning) themeCategory = 'motivation';
  else if (timeContext.night) themeCategory = 'wisdom';
  else if (dayContext.isMonday) themeCategory = 'motivation';
  else if (dayContext.isFriday) themeCategory = 'wellbeing';
  else if (dayContext.isWeekend) themeCategory = 'life';

  // Adjust based on user preferences if available
  if (userPreferences) {
    // Add user's favorite words to appropriate theme categories
    userPreferences.favoriteWords.forEach(word => {
      Object.values(themes).forEach(category => {
        if (!category.includes(word) && word.length > 3) {
          category.push(word);
        }
      });
    });
    
    // Adjust tone based on user's preferred emotional tone
    if (userPreferences.dominantTone === 'positive') {
      toneModifiers.inspiring.push('optimistic', 'joyful', 'enthusiastic');
    } else if (userPreferences.dominantTone === 'negative') {
      toneModifiers.reflective.push('challenging', 'transformative', 'deep');
    }
    
    // Adjust style based on complexity preference
    if (userPreferences.dominantComplexity === 'simple') {
      Object.values(styleModifiers).forEach(style => {
        style.push('clear', 'simple', 'direct');
      });
    } else if (userPreferences.dominantComplexity === 'complex') {
      Object.values(styleModifiers).forEach(style => {
        style.push('sophisticated', 'nuanced', 'layered');
      });
    }
  }

  // Select random elements from each category
  const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  const selectedThemeCategory = themes[themeCategory as keyof typeof themes];
  const selectedTheme = getRandomElement(selectedThemeCategory);
  
  // Select tone based on time and theme
  let toneCategory: keyof typeof toneModifiers = 'inspiring';
  if (timeContext.night) toneCategory = 'reflective';
  else if (timeContext.morning) toneCategory = 'practical';
  else if (selectedTheme.includes('wisdom')) toneCategory = 'reflective';
  
  const selectedTone = getRandomElement(toneModifiers[toneCategory]);
  
  // Select style based on theme and tone
  let styleCategory: keyof typeof styleModifiers = 'direct';
  if (selectedTheme.includes('philosophy')) styleCategory = 'wisdom';
  else if (selectedTone.includes('contemplative')) styleCategory = 'poetic';
  
  const selectedStyle = getRandomElement(styleModifiers[styleCategory]);

  // Add contextual elements
  const timePhrase = timeContext.earlyMorning ? 'early morning reflection'
    : timeContext.morning ? 'morning motivation'
    : timeContext.afternoon ? 'midday insight'
    : timeContext.evening ? 'evening contemplation'
    : 'night wisdom';

  // Add seasonal influence
  const seasonalContext = {
    winter: 'inner warmth and perseverance',
    spring: 'renewal and growth',
    summer: 'vitality and joy',
    fall: 'transformation and reflection'
  }[currentSeason];

  // Combine all factors into a unique prompt
  const prompt = `Generate a ${selectedTone} quote about ${selectedTheme} with a ${selectedStyle} style, 
    incorporating elements of ${timePhrase} and ${seasonalContext}${
    userPreferences?.favoriteWords.length 
      ? ` and personal resonance with: ${userPreferences.favoriteWords.join(', ')}` 
      : ''
  }. ${
    userPreferences?.preferredLength 
      ? `Aim for approximately ${userPreferences.preferredLength} words` 
      : ''
  }`;

  return prompt;
};

// Add interface for notification details
interface NotificationState {
  url?: string;
  token?: string;
}

// Add the sendFrameNotification type
interface SendFrameNotificationParams {
  fid: number;
  title: string;
  body: string;
}

interface SendFrameNotificationResult {
  state: 'success' | 'error' | 'rate_limit' | 'no_token';
  error?: string;
}

// Add the sendFrameNotification function
const sendFrameNotification = async ({ 
  fid, 
  title, 
  body 
}: SendFrameNotificationParams): Promise<SendFrameNotificationResult> => {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fid, title, body })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return { state: 'rate_limit' };
      }
      return { state: 'error', error: await response.text() };
    }

    const data = await response.json();
    if (data.error === 'no_token') {
      return { state: 'no_token' };
    }

    return { state: 'success' };
  } catch (error) {
    return { state: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
  const [context, setContext] = useState<FrameContext | undefined>(undefined);
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

  // Add new state for category quotes
  const [categoryQuotes, setCategoryQuotes] = useState<{text: string; author: string; source: string}[]>([]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState<number>(0);
  const [hasUserSwiped, setHasUserSwiped] = useState(false);

  // Add new state for music
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  // Add loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingGif, setIsLoadingGif] = useState(false);
  const [addFrameResult, setAddFrameResult] = useState("");

  // Add this near the other state declarations
  const [hasSeenSwipeTutorial, setHasSeenSwipeTutorial] = useState(false);

  // Add new state for tooltips
  const [showTooltips, setShowTooltips] = useState(false);
  const [hasSeenTooltips, setHasSeenTooltips] = useState(false);

  // First, add this state to track the animation
  const [isQuoteTransitioning, setIsQuoteTransitioning] = useState(false);

  // Add new state for swipe direction
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const { onboarding, setOnboarding } = useOnboarding(context, isFirebaseInitialized, setBgImage);

  // Add this state for navigation
  const [activeSection, setActiveSection] = useState('generate');

  // Add new state for preferences page
  const [showPreferences, setShowPreferences] = useState(false);

  // Add new states for quote style, areas to improve, and personal goals pages
  const [showQuoteStylePage, setShowQuoteStylePage] = useState(false);
  const [showAreasPage, setShowAreasPage] = useState(false);
  const [showGoalsPage, setShowGoalsPage] = useState(false);

  // Add new state for temporary quote styles
  const [tempQuoteStyles, setTempQuoteStyles] = useState<string | undefined>(undefined);

  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => {
    const initializeTooltips = async () => {
      // Check if user has seen tooltips before
      const tooltipsData = localStorage.getItem('hasSeenTooltips');
      if (!tooltipsData) {
        // Show tooltips after a short delay on first visit
        setTimeout(() => setShowTooltips(true), 1000);
      }
    };

    initializeTooltips();
  }, []);

  // Handle tooltip visibility
  useEffect(() => {
    if (showTooltips) {
      // Hide tooltips after showing all items (2 seconds per item * 4 items + 1 second buffer)
      const timer = setTimeout(() => {
        setShowTooltips(false);
        setHasSeenTooltips(true);
        localStorage.setItem('hasSeenTooltips', 'true');
      }, 9000);

      return () => clearTimeout(timer);
    }
  }, [showTooltips]);

  // Show tooltips after onboarding with a slight delay
  useEffect(() => {
    if (onboarding.hasCompletedOnboarding && !hasSeenTooltips) {
      setTimeout(() => setShowTooltips(true), 500);
    }
  }, [onboarding.hasCompletedOnboarding, hasSeenTooltips]);

  // Handle navigation with tooltip management
  const handleNavigation = (section: string) => {
    setActiveSection(section);
    
    // Hide tooltips when user starts navigating
    if (showTooltips) {
      setShowTooltips(false);
      setHasSeenTooltips(true);
      localStorage.setItem('hasSeenTooltips', 'true');
    }

    switch (section) {
      case 'generate':
        setShowCategories(false);
        setShowFavorites(false);
        setShowHistory(false);
        // Clear category quotes and current quote when switching to generate
        setCategoryQuotes([]);
        setCurrentQuoteIndex(0);
        if (activeSection === 'categories') {
          setQuote('');
          setGifUrl(null);
          setIsInitialState(true);
        }
        break;
      case 'categories':
        setShowCategories(true);
        setShowFavorites(false);
        setShowHistory(false);
        break;
      case 'favorites':
        setShowFavorites(true);
        setShowCategories(false);
        setShowHistory(false);
        break;
      case 'history':
        setShowHistory(true);
        setShowCategories(false);
        setShowFavorites(false);
        break;
    }
  };

  // 5. Analytics Functions
  const logAnalyticsEvent = useCallback((eventName: string, params: AnalyticsParams) => {
    if (analytics && context?.user?.fid) {
      logEvent(analytics, eventName, {
        ...params,
        user_id: context.user.fid.toString(),
        timestamp: Date.now()
      });
    }
  }, [analytics, context?.user?.fid]);

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
        
        setContext(frameContext as unknown as FrameContext);
        if (frameContext.client) {
          setAdded(frameContext.client.added);
        }

        // Frame added event
        sdk.on('frameAdded', ({ notificationDetails }) => {
          logAnalyticsEvent('frame_added', {
            fid: frameContext.user?.fid,
            has_notifications: !!notificationDetails
          });

          setAdded(true);
          if (notificationDetails) {
            setNotificationDetails(notificationDetails);
            // Save notification details to Firestore
            if (frameContext.user?.fid) {
              saveNotificationDetails(frameContext.user.fid, notificationDetails)
                .catch(err => {
                  console.error('Error saving notification details:', err);
                });
            }
          }
        });

        // Frame add rejected event
        sdk.on('frameAddRejected', ({ reason }) => {
          logAnalyticsEvent('frame_add_rejected', {
            fid: frameContext.user?.fid,
            reason
          });
          
          toast.error(`Failed to add frame: ${reason}`);
          setAdded(false);
        });

        // Frame removed event
        sdk.on('frameRemoved', () => {
          logAnalyticsEvent('frame_removed', {
            fid: frameContext.user?.fid
          });
          
          setAdded(false);
          setNotificationDetails(null);
          // Remove notification details from Firestore
          if (frameContext.user?.fid) {
            removeNotificationDetails(frameContext.user.fid)
              .catch(err => {
                console.error('Error removing notification details:', err);
              });
          }
        });

        // Notifications enabled event
        sdk.on('notificationsEnabled', ({ notificationDetails }) => {
          logAnalyticsEvent('notifications_enabled', {
            fid: frameContext.user?.fid
          });
          
          setNotificationDetails(notificationDetails);
          // Save notification details to Firestore
          if (frameContext.user?.fid) {
            saveNotificationDetails(frameContext.user.fid, notificationDetails)
              .then(() => {
                // Send welcome notification
                return sendFrameNotification({
                  fid: frameContext.user!.fid,
                  title: "Welcome to FunQuotes!",
                  body: "You'll now receive notifications for new quotes and features! 🎉"
                });
              })
              .catch(err => {
                console.error('Error handling notifications enabled:', err);
              });
          }
        });

        // Notifications disabled event
        sdk.on('notificationsDisabled', () => {
          logAnalyticsEvent('notifications_disabled', {
            fid: frameContext.user?.fid
          });
          
          setNotificationDetails(null);
          // Remove notification details from Firestore
          if (frameContext.user?.fid) {
            removeNotificationDetails(frameContext.user.fid)
              .catch(err => {
                console.error('Error removing notification details:', err);
              });
          }
        });

        sdk.actions.ready({});
      } catch (err) {
        console.error('Error in initializeFrameSDK:', err);
      }
    };

    if (!isSDKLoaded) {
      setIsSDKLoaded(true);
      initializeFrameSDK();
    }

    // Cleanup function to remove all event listeners
    return () => {
      sdk.removeAllListeners();
    };
  }, [isSDKLoaded, context?.user?.fid, logAnalyticsEvent, setAdded, setContext, setNotificationDetails]);

  // 7. Quote Generation Functions
  const handleGenerateQuote = useCallback(async () => {
    try {
      setIsGenerating(true);
      setIsInitialState(false);
      if (isLoading) return;
      setIsLoading(true);
      
      try {
        setGifUrl(null);
        // Clear category quotes when generating a new quote
        setCategoryQuotes([]);
        setCurrentQuoteIndex(0);
        
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

        const quoteResponse = await generateQuote(personalizedPrompt);
        
        if (quoteResponse) {
          const newQuote = quoteResponse.text.slice(0, MAX_CHARS);
          setQuote(newQuote);
          
          if (gifEnabled) {
            try {
              setIsLoadingGif(true);
              const gifUrl = await getGifForQuote(quoteResponse.text, quoteResponse.style);
              if (gifUrl) {
                setGifUrl(gifUrl);
              } else {
                console.warn('No GIF URL returned');
                toast.error('Could not generate a GIF for this quote');
              }
            } catch (gifError) {
              console.error('Error generating GIF:', gifError);
              toast.error('Failed to generate GIF');
              setGifUrl(null);
            } finally {
              setIsLoadingGif(false);
            }
          }
          
          // Add to history
          const newQuoteItem = {
            id: Date.now().toString(),
            text: newQuote,
            style: quoteResponse.style,
            gifUrl: gifEnabled ? gifUrl : null,
            timestamp: new Date(),
            bgColor
          };
          
          // Update local state
          setQuoteHistory(prev => [newQuoteItem, ...prev.slice(0, 9)]); // Keep last 10 quotes
          
          // Save to Firebase if user is logged in
          if (context?.user?.fid && isFirebaseInitialized) {
            try {
              console.log('Saving quote to Firebase:', newQuoteItem);
              await saveQuoteToHistory(context.user.fid, newQuoteItem);
              console.log('Quote saved successfully');
            } catch (error) {
              console.error('Error saving quote to history:', error);
              toast.error('Failed to save quote');
            }
          }
          
          logAnalyticsEvent('quote_generated_success', {
            prompt: userPrompt || 'empty_prompt',
            quote_length: quoteResponse.text.length,
            area_of_improvement: onboarding.personalInfo.areasToImprove.join(','),
            relationship_status: onboarding.personalInfo.relationshipStatus,
            has_personal_goals: !!onboarding.personalInfo.personalGoals
          });
        }
      } catch (error) {
        console.error('Error:', error);
        setQuote('Failed to generate quote. Please try again.');
        toast.error('Failed to generate quote');
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
  }, [isLoading, userPrompt, onboarding, gifEnabled, context?.user?.fid, isFirebaseInitialized]);

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
    setIsInitialState(false);
    setQuote(item.text);
    if (item.gifUrl) {
      setGifUrl(item.gifUrl);
    } else {
      setGifUrl(null);
    }
    setShowHistory(false);
    setShowFavorites(false);
    handleNavigation('generate');
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
    const initFirebase = async () => {
      if (!context?.user?.fid) {
        setIsFirebaseInitialized(true);
        return;
      }

      try {
        const firebaseApp = await initializeFirebase();
        
        if (!firebaseApp?.db) {
          console.warn('Firebase initialization returned no database instance');
          toast.error('Failed to initialize database');
          setIsFirebaseInitialized(true);
          return;
        }

        try {
          // Load all user data in parallel
          const [history, favs, gifPref, theme, onboardingData] = await Promise.all([
            getUserQuoteHistory(context.user.fid),
            getUserFavorites(context.user.fid),
            getGifPreference(context.user.fid),
            getThemePreference(context.user.fid),
            getOnboardingData(context.user.fid)
          ]);

          // Update all states with loaded data
          if (history) {
            const sortedHistory = history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            console.log('Loaded history:', sortedHistory);
            setQuoteHistory(sortedHistory);
          }
          if (favs) {
            setFavorites(favs);
          }
          if (typeof gifPref === 'boolean') setGifEnabled(gifPref);
          if (theme) setBgImage(theme);

          // Update onboarding state if we have data
          if (onboardingData) {
            setOnboarding((prev: OnboardingState) => ({
              ...prev,
              hasCompletedOnboarding: onboardingData.hasCompletedOnboarding,
              personalInfo: onboardingData.onboardingData || prev.personalInfo
            }));
          }

          setIsFirebaseInitialized(true);
          console.log('Firebase and user data initialized successfully');
        } catch (loadError) {
          console.error('Error loading user data:', loadError);
          toast.error('Failed to load your data');
          setIsFirebaseInitialized(true);
        }
      } catch (initError) {
        console.error('Firebase initialization error:', initError);
        toast.error('Failed to initialize app');
        setIsFirebaseInitialized(true);
      }
    };

    initFirebase();
  }, [context?.user?.fid, setBgImage, setOnboarding]);

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
  const toggleFavorite = useCallback(async (quote: QuoteHistoryItem) => {
    if (!context?.user?.fid) {
      toast.error('Please sign in to save favorites');
      return;
    }

    if (!isFirebaseInitialized) {
      toast.error('Please wait for app to initialize');
      return;
    }

    try {
      const isAlreadyFavorited = favorites.some(fav => fav.text === quote.text);
      
      if (isAlreadyFavorited) {
        // Remove from favorites
        const favoriteToRemove = favorites.find(fav => fav.text === quote.text);
        if (favoriteToRemove) {
          await removeFavoriteQuote(context.user.fid, favoriteToRemove.id);
          setFavorites(prev => prev.filter(fav => fav.id !== favoriteToRemove.id));
          toast.success('Removed from favorites');
        }
      } else {
        // Add to favorites
        const newFavorite: FavoriteQuote = {
          ...quote,
          id: generateRandomString(10),
          timestamp: new Date()
        };
        
        await saveFavoriteQuote(context.user.fid, newFavorite);
        setFavorites(prev => [newFavorite, ...prev]);
        toast.success('Added to favorites');
      }

      logUserAction('toggle_favorite', 'quote_interaction', isAlreadyFavorited ? 'remove' : 'add');
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      toast.error('Failed to update favorites');
    }
  }, [context?.user?.fid, favorites, isFirebaseInitialized, logUserAction]);

  // Update the background music effect
  useEffect(() => {
    const audio = new Audio('/Forest_Music.mp3');
    audio.loop = true;
    audio.volume = 0.2;
    setAudioPlayer(audio);

    // Don't try to play immediately, wait for user interaction
    const handleFirstInteraction = () => {
      if (isMusicEnabled && audio) {
        audio.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      }
      // Remove the event listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      // Clean up event listeners
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []); // Only run once on mount

  // Separate effect to handle music toggle
  useEffect(() => {
    if (audioPlayer) {
      if (isMusicEnabled) {
      const playPromise = audioPlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.error('Error playing audio:', error);
          });
        }
      } else {
        audioPlayer.pause();
      }
    }
  }, [isMusicEnabled, audioPlayer]);

  // Add this effect to load favorites when component mounts
  useEffect(() => {
    const loadFavorites = async () => {
      if (context?.user?.fid && isFirebaseInitialized) {
        try {
          console.log('Loading favorites for user:', context.user.fid);
          const userFavorites = await getUserFavorites(context.user.fid);
          console.log('Loaded favorites:', userFavorites);
          setFavorites(userFavorites);
        } catch (error) {
          console.error('Error loading favorites:', error);
        }
      }
    };

    loadFavorites();
  }, [context?.user?.fid, isFirebaseInitialized]);

  // Update the GIF toggle handler
  const handleGifToggle = async () => {
    const newState = !gifEnabled;
    setGifEnabled(newState);
    if (context?.user?.fid) {
      try {
        await saveGifPreference(context.user.fid, newState);
      } catch (error) {
        console.error('Error saving GIF preference:', error);
      }
    }
    logUserAction('toggle_gif', 'settings', newState ? 'enabled' : 'disabled');
  };

  // Add effect to load GIF preference
  useEffect(() => {
    const loadGifPreference = async () => {
      if (context?.user?.fid && isFirebaseInitialized) {
        try {
          const preference = await getGifPreference(context.user.fid);
          setGifEnabled(preference);
        } catch (error) {
          console.error('Error loading GIF preference:', error);
        }
      }
    };

    loadGifPreference();
  }, [context?.user?.fid, isFirebaseInitialized]);

  // Add effect to load theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      if (context?.user?.fid && isFirebaseInitialized) {
        try {
          const savedTheme = await getThemePreference(context.user.fid);
          if (savedTheme) {
            setBgImage(savedTheme);
          }
        } catch (error) {
          console.error('Error loading theme preference:', error);
        }
      }
    };

    loadThemePreference();
  }, [context?.user?.fid, isFirebaseInitialized]);

  // Add helper function for double tap/click
  const handleQuoteDoubleTap = () => {
    const quoteItem: QuoteHistoryItem = {
      id: crypto.randomUUID(), // Add required id field
      text: quote,
      style: 'default',
      gifUrl,
      timestamp: new Date(),
      bgColor
    };
    toggleFavorite(quoteItem);
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 1000);
  };

  // Add these functions inside the Demo component
  const generateQuoteImage = async (
    quote: string, 
    bgImage: string,
    isFromCategories: boolean = false // New parameter to differentiate the source
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        // Set canvas size - smaller for categories
        canvas.width = 800;
        canvas.height = isFromCategories ? 400 : 500; // Different height based on source

        // Handle gradient backgrounds
        if (bgImage?.includes('gradient')) {
          let gradient;
          switch (bgImage) {
            case 'gradient-pink':
              gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, 'rgb(192, 132, 252)');
              gradient.addColorStop(0.5, 'rgb(244, 114, 182)');
              gradient.addColorStop(1, 'rgb(239, 68, 68)');
              break;
            case 'gradient-black':
              gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, 'rgb(17, 24, 39)');
              gradient.addColorStop(0.5, 'rgb(55, 65, 81)');
              gradient.addColorStop(1, 'rgb(31, 41, 55)');
              break;
            case 'gradient-yellow':
              gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, 'rgb(251, 191, 36)');
              gradient.addColorStop(0.5, 'rgb(249, 115, 22)');
              gradient.addColorStop(1, 'rgb(239, 68, 68)');
              break;
            case 'gradient-green':
              gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, 'rgb(52, 211, 153)');
              gradient.addColorStop(0.5, 'rgb(16, 185, 129)');
              gradient.addColorStop(1, 'rgb(20, 184, 166)');
              break;
            case 'gradient-purple':
              gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, '#472A91');
              gradient.addColorStop(0.5, 'rgb(147, 51, 234)');
              gradient.addColorStop(1, 'rgb(107, 33, 168)');
              break;
            default:
              gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, '#9b5de5');
              gradient.addColorStop(0.5, '#f15bb5');
              gradient.addColorStop(1, '#ff6b6b');
          }
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bgImage === 'none') {
          // Create default gradient background
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#9b5de5');
          gradient.addColorStop(0.5, '#f15bb5');
          gradient.addColorStop(1, '#ff6b6b');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          // Handle image backgrounds
          const img = document.createElement('img');
          img.crossOrigin = 'anonymous';
          img.src = bgImage;
          img.onload = () => {
            // Calculate dimensions to cover the entire canvas while maintaining aspect ratio
            const imgAspectRatio = img.width / img.height;
            const canvasAspectRatio = canvas.width / canvas.height;
            let drawWidth = canvas.width;
            let drawHeight = canvas.height;
            let offsetX = 0;
            let offsetY = 0;

            if (imgAspectRatio > canvasAspectRatio) {
              drawHeight = canvas.height;
              drawWidth = drawHeight * imgAspectRatio;
              offsetX = (canvas.width - drawWidth) / 2;
            } else {
              drawWidth = canvas.width;
              drawHeight = drawWidth / imgAspectRatio;
              offsetY = (canvas.height - drawHeight) / 2;
            }

            // Fill background with black
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw background image centered
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            
            // Add semi-transparent overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Continue with text rendering
            addTextAndProfile();
          };
          return; // Return early as we'll resolve in the addTextAndProfile function
        }

        // If we didn't return early (for image backgrounds), add text immediately
        addTextAndProfile();

        function addTextAndProfile() {
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Extract quote text, author, and source
          const parts = quote.split('\n\n');
          const quoteText = parts[0];
          const authorText = parts[1] ? parts[1].replace('- ', '') : '';
          const sourceText = parts[2] || '';
          
          // Only add profile if NOT from categories
          if (!isFromCategories && context?.user?.pfpUrl) {
            // Create circular clipping path for profile image
            ctx.save();
            ctx.beginPath();
            ctx.arc(50, 50, 25, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();

            // Load and draw profile image
            const profileImg = document.createElement('img');
            profileImg.crossOrigin = 'anonymous';
            profileImg.src = context.user.pfpUrl;
            profileImg.onload = () => {
              ctx.drawImage(profileImg, 25, 25, 50, 50);
              ctx.restore();

              // Add username
              ctx.fillStyle = 'white';
              ctx.font = '16px Inter, sans-serif';
              ctx.textAlign = 'left';
              ctx.fillText(`@${context.user.username}`, 90, 55);

              // Continue with quote text
              addQuoteText();
            };
            profileImg.onerror = () => {
              ctx.restore();
              addQuoteText();
            };
          } else {
            addQuoteText();
          }

          function addQuoteText() {
            if (!ctx) return;  // Early return if ctx is null
            
            // Now TypeScript knows ctx is not null
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = 'bold 32px Inter, sans-serif';
            
            // Word wrap the quote text
            const words = quoteText.split(' ');
            const lines = [];
            let currentLine = '';
            const maxWidth = canvas.width - 100;

            words.forEach(word => {
              const testLine = currentLine + word + ' ';
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth) {
                lines.push(currentLine);
                currentLine = word + ' ';
              } else {
                currentLine = testLine;
              }
            });
            lines.push(currentLine);

            // Draw the wrapped text
            const lineHeight = 40;
            const totalHeight = lines.length * lineHeight;
            const startY = (canvas.height - totalHeight) / 2;

            lines.forEach((line, index) => {
              ctx.fillText(line.trim(), canvas.width / 2, startY + (index * lineHeight));
            });

            // Add author attribution
            if (authorText) {
              ctx.font = '24px Inter, sans-serif';
              ctx.fillStyle = 'white';
              ctx.textAlign = 'center';
              ctx.fillText(`- ${authorText}`, canvas.width / 2, canvas.height - 60);
              
              // Add source if available
              if (sourceText) {
                ctx.font = '18px Inter, sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(sourceText, canvas.width / 2, canvas.height - 30);
              }
            }

            resolve(canvas.toDataURL('image/png'));
          }
        }

      } catch (error) {
        reject(error);
      }
    });
  };

  const uploadImage = async (imageData: string): Promise<string> => {
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('No URL in response');
      }

      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const renderBackground = () => {
    if (bgImage.includes('TheMrSazon') || bgImage.includes('Background_Water')) {
      return (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(2px)',
            transform: 'scale(1.1)'
          }} />
        </div>
      );
    }
    
    // Handle gradient backgrounds
    if (bgImage.includes('gradient')) {
      return (
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: bgImage,
              opacity: 0.9  // Adjust opacity as needed
            }} 
          />
        </div>
      );
    }

    return null;
  };

  // Remove the onboarding data loading effect
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

  // Add keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !isGenerating) {
        handleGenerateQuote();
      } else if (e.key === 'r' && gifEnabled && !isLoadingGif) {
        handleRegenerateGif();
      } else if (e.key === 'f' && quote && !isSaving) {
        const currentQuote = {
          text: quote,
          style: onboarding.personalInfo.preferredQuoteStyle || 'casual',
          gifUrl: gifUrl,
          timestamp: new Date(),
          bgColor,
          id: Date.now().toString()
        };
        toggleFavorite(currentQuote);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerateQuote, handleRegenerateGif, gifEnabled, quote, toggleFavorite, onboarding.personalInfo.preferredQuoteStyle, gifUrl, bgColor, isGenerating, isLoadingGif, isSaving]);

  // Add this effect near the top of your component
  useEffect(() => {
    // Test analytics
    logAnalyticsEvent('app_loaded', {
      timestamp: Date.now(),
      user_logged_in: !!context?.user?.fid,
      screen_width: window.innerWidth,
      screen_height: window.innerHeight
    });
    
    if (context?.user?.fid) {
      logAnalyticsEvent('user_identified', {
        fid: context.user.fid,
        username: context.user.username || 'unknown'
      });
    }
  }, [context?.user]);

  // Add this effect near the top of your component
  useEffect(() => {
    const initializeUser = async () => {
      if (context?.user?.fid) {
        // Set analytics user
        await setAnalyticsUser(context.user.fid, {
          username: context.user.username || 'unknown',
          displayName: context.user.displayName || 'unknown',
          pfpUrl: context.user.pfpUrl || 'none'
        });
        
        // Log app loaded event
        logAnalyticsEvent('app_loaded', {
          timestamp: Date.now(),
          user_logged_in: true,
          screen_width: window.innerWidth,
          screen_height: window.innerHeight
        });
      } else {
        logAnalyticsEvent('app_loaded', {
          timestamp: Date.now(),
          user_logged_in: false,
          screen_width: window.innerWidth,
          screen_height: window.innerHeight
        });
      }
    };

    initializeUser();
  }, [context?.user]);

  // Add this effect near your other useEffect hooks
  useEffect(() => {
    const handleShowFavorites = () => {
      setShowFavorites(true);
      setShowHistory(false); // Ensure history is closed
    };
    const handleShowHistory = () => {
      setShowHistory(true);
      setShowFavorites(false); // Ensure favorites is closed
    };
    const handleCloseAllPages = () => {
      setShowFavorites(false);
      setShowHistory(false);
    };

    document.addEventListener('showFavorites', handleShowFavorites);
    document.addEventListener('showHistory', handleShowHistory);
    document.addEventListener('closeAllPages', handleCloseAllPages);

    return () => {
      document.removeEventListener('showFavorites', handleShowFavorites);
      document.removeEventListener('showHistory', handleShowHistory);
      document.removeEventListener('closeAllPages', handleCloseAllPages);
    };
  }, []);

  // Add frame event listeners
  useEffect(() => {
    const handleFrameEvent = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      try {
        const { type, data } = event.data;
        
        // Handle frame addition response
        if (type === 'frame.addResponse') {
          if (data?.success) {
            setAdded(true);
            // Note: Notification details will come either in the addFrame response
            // or via webhook, so we don't need to handle them here
            toast.success('Frame added successfully!');
          } else {
            toast.error(`Failed to add frame: ${data?.reason || 'Unknown error'}`);
          }
          return;
        }

        // Handle notification state changes
        if (type === 'frame.notificationsEnabled' && context?.user?.fid) {
          if (data?.url && data?.token) {
            await saveNotificationDetails(context.user.fid, {
              url: data.url,
              token: data.token
            });
            
            setNotificationDetails({
              url: data.url,
              token: data.token
            });
            
            toast.success('Notifications enabled!');
            logAnalyticsEvent('notifications_enabled', {
              fid: context.user.fid
            });
          }
          return;
        }

        if (type === 'frame.notificationsDisabled' && context?.user?.fid) {
          await removeNotificationDetails(context.user.fid);
          setNotificationDetails(null);
          toast.info('Notifications disabled');
          logAnalyticsEvent('notifications_disabled', {
            fid: context.user.fid
          });
        }
      } catch (err) {
        console.error('Frame event error:', err);
        toast.error('Error handling frame event');
      }
    };

    window.addEventListener('message', handleFrameEvent);
    return () => {
      window.removeEventListener('message', handleFrameEvent);
    };
  }, [context?.user?.fid]);

  // Function to navigate to previous or next quote
  const navigateQuote = async (direction: 'prev' | 'next') => {
    if (categoryQuotes.length === 0) return;
    
    setIsQuoteTransitioning(true);
    setSwipeDirection(direction === 'prev' ? 'right' : 'left');
    
    // Set hasUserSwiped with a slight delay to allow the fade-out animation
    setTimeout(() => {
      setHasUserSwiped(true);
    }, 100);
    
    // Calculate new index
    const newIndex = direction === 'prev'
      ? (currentQuoteIndex - 1 + categoryQuotes.length) % categoryQuotes.length
      : (currentQuoteIndex + 1) % categoryQuotes.length;
    
    // Get new quote data
    const { text, author, source } = categoryQuotes[newIndex];
    const newQuote = `${text}\n\n- ${author}\n${source}`;
    
    // Update everything at once
    setCurrentQuoteIndex(newIndex);
    setQuote(newQuote);
    setGifUrl(null);
    
    // Wait for animation to complete
    await sleep(300);
    setIsQuoteTransitioning(false);
  };

  return (
      <div className="relative min-h-screen">
        <main className="pb-16">
          {/* Fixed Navigation */}
          {activeSection !== 'categories' && (
            <nav className="fixed top-0 left-0 w-full bg-transparent/10 backdrop-blur-sm z-30 shadow-lg">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                <div className="flex justify-between items-center">
                  {/* Left side - Logo */}
                  <div className="flex-shrink-0">
                    <Image
                      src="/logo.png"
                      alt="Logo"
                      width={40}  // Changed from 60 to 40
                      height={40} // Changed from 60 to 40
                      priority
                      className="object-contain"
                    />
                  </div>

                  {/* Right side - Profile Image with Dropdown */}
                  <div className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="cursor-pointer transition-transform hover:scale-105">
                          <div className="relative w-[35px] h-[35px] rounded-full border-2 border-white shadow-lg overflow-hidden">  {/* Changed from 45px to 35px */}
                            <Image
                              src={context?.user?.pfpUrl || "/Profile_Image.jpg"}
                              alt={context?.user?.displayName || "Profile"}
                              width={35}  // Changed from 45 to 35
                              height={35} // Changed from 45 to 35
                              className="w-full h-full object-cover"
                              unoptimized
                              onError={(e) => {
                                console.error('Failed to load profile image:', context?.user?.pfpUrl);
                                const target = e.target as HTMLImageElement;
                                target.src = "/Profile_Image.jpg";
                              }}
                            />
                          </div>
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {context?.user && (
                          <div 
                            className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => {
                              setShowProfile(true);
                              // Close the dropdown menu
                              const dropdownTrigger = document.querySelector('[data-state="open"]');
                              if (dropdownTrigger instanceof HTMLElement) {
                                dropdownTrigger.click();
                              }
                            }}
                          >
                            <div className="font-medium">{context.user.displayName}</div>
                            <div className="text-xs text-muted-foreground">@{context.user.username}</div>
                          </div>
                        )}
                        <DropdownMenuItem 
                          className="flex items-center gap-2"
                          onClick={() => setShowPreferences(true)}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>User Preferences</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2"
                          onClick={() => setShowThemeMenu(true)}
                        >
                          <Palette className="w-4 h-4" />
                          <span>Theme</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2"
                          onClick={() => setShowSettings(true)}
                        >
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </nav>
          )}

          {/* Main Content - Centered */}
          <main 
            className={`min-h-screen w-full flex flex-col items-center p-4 pt-20 relative ${
              bgImage?.includes('gradient') ? '' : ''
            }`}
            style={bgImage?.includes('gradient') ? {
              backgroundImage: bgImage === 'gradient-pink' ? 'linear-gradient(to bottom right, rgb(192, 132, 252), rgb(244, 114, 182), rgb(239, 68, 68))' :
                              bgImage === 'gradient-black' ? 'linear-gradient(to bottom right, rgb(17, 24, 39), rgb(55, 65, 81), rgb(31, 41, 55))' :
                              bgImage === 'gradient-yellow' ? 'linear-gradient(to bottom right, rgb(251, 191, 36), rgb(249, 115, 22), rgb(239, 68, 68))' :
                              bgImage === 'gradient-green' ? 'linear-gradient(to bottom right, rgb(52, 211, 153), rgb(16, 185, 129), rgb(20, 184, 166))' :
                              bgImage === 'gradient-purple' ? 'linear-gradient(to bottom right, #472A91, rgb(147, 51, 234), rgb(107, 33, 168))' :
                              'none'
            } : bgImage !== 'none' && !bgImage?.includes('TheMrSazon') ? {
              backgroundImage: `linear-gradient(rgba(0, 0, 0, ${bgImage?.includes('Flower') ? '0.7' : '0.3'}), rgba(0, 0, 0, ${bgImage?.includes('Flower') ? '0.7' : '0.3'})), url(${bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            } : {}}
          >
            {renderBackground()}
            <div className="relative z-10 w-full flex flex-col items-center">
              {/* Welcome Message */}
              {isInitialState && (
                <div className="flex flex-col items-center gap-4 w-full max-w-[95%] sm:max-w-sm mb-12">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="text-2xl text-white font-medium text-center mt-8"
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                      >
                        Welcome {context?.user?.username ? `@${context.user.username}` : 'User'}
                      </motion.div>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                        className="text-base text-white/70 mt-2"
                      >
                        Get inspired with amazing quotes
                      </motion.p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}

              {/* Loading Skeleton */}
              <AnimatePresence>
                {!quote && !isInitialState && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full max-w-md mx-auto"
                  >
                    <div className="bg-white/5 rounded-lg p-6 space-y-4">
                      <div className="h-4 bg-white/10 rounded animate-pulse" />
                      <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-white/10 rounded animate-pulse w-1/2" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quote Display */}
              <AnimatePresence mode="wait">
                {quote && !isInitialState && (
                  <motion.div
                    className={`w-[95%] max-w-[500px] sm:max-w-sm overflow-hidden relative z-10 ${
                      categoryQuotes.length > 0 ? 'mt-20' : 'mt-4'
                    } ${categoryQuotes.length > 0 ? 'mb-4' : 'mb-32'} ${categoryQuotes.length > 0 ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    {...(categoryQuotes.length > 0 ? {
                      drag: "x",
                      dragConstraints: { left: 0, right: 0 },
                      dragElastic: 0.3,
                      whileDrag: { 
                        scale: 0.98,
                        boxShadow: "0 20px 40px rgba(255,255,255,0.2)"
                      },
                      dragTransition: { 
                        bounceStiffness: 400, 
                        bounceDamping: 30,
                        power: 0.2
                      },
                      onDragEnd: async (_, info) => {
                        const swipe = info.offset.x;
                        const threshold = 50;
                        
                        if (Math.abs(swipe) > threshold) {
                          setIsQuoteTransitioning(true);
                          setSwipeDirection(swipe > 0 ? 'right' : 'left');
                          
                          // Set hasUserSwiped with a slight delay to allow the fade-out animation
                          setTimeout(() => {
                            setHasUserSwiped(true);
                          }, 100);
                          
                          // Calculate new index
                          const newIndex = swipe > 0
                            ? (currentQuoteIndex - 1 + categoryQuotes.length) % categoryQuotes.length
                            : (currentQuoteIndex + 1) % categoryQuotes.length;
                          
                          // Get new quote data
                          const { text, author, source } = categoryQuotes[newIndex];
                          const newQuote = `${text}\n\n- ${author}\n${source}`;
                          
                          // Update everything at once
                          setCurrentQuoteIndex(newIndex);
                          setQuote(newQuote);
                          setGifUrl(null);
                          
                          // Wait for animation to complete
                          await sleep(300);
                          setIsQuoteTransitioning(false);
                        }
                      }
                    } : {})}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div 
                      key={`${quote}-${currentQuoteIndex}`}
                      initial={{ 
                        opacity: 0, 
                        x: isQuoteTransitioning ? (swipeDirection === 'right' ? 50 : -50) : 0 
                      }}
                      animate={{ 
                        opacity: 1, 
                        x: 0
                      }}
                      exit={{ 
                        opacity: 0, 
                        x: isQuoteTransitioning ? (swipeDirection === 'right' ? -50 : 50) : 0
                      }}
                      transition={{ 
                        duration: 0.8,
                        ease: "easeInOut"
                      }}
                      className="w-full max-w-md mx-auto rounded-lg p-6 shadow-[0_0_15px_rgba(255,255,255,0.15)] backdrop-blur-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255, 255, 255, 0.18)'
                      }}
                    >
                      <div className="flex flex-col items-center gap-2 w-full">
                        {quote.split('\n\n').map((part, index) => {
                          if (part.startsWith('- ')) {
                            return (
                              <motion.p 
                                key={`author-${index}-${currentQuoteIndex}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ 
                                  duration: 8.0,  // Increased from 4.0 to 8.0 seconds
                                  delay: 1.0,     // Kept same delay
                                  ease: "easeInOut"
                                }}
                                className="text-center text-white text-xl font-medium select-none break-words w-full"
                              >
                                {part}
                              </motion.p>
                            );
                          } else if (part.includes('\n')) {
                            return (
                              <motion.p 
                                key={`source-${index}-${currentQuoteIndex}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ 
                                  duration: 2.0, // Increased from 1.2
                                  delay: 1.4,    // Adjusted delay
                                  ease: "easeInOut"
                                }}
                                className="text-center text-white text-sm font-medium select-none break-words w-full opacity-80"
                              >
                                {part}
                              </motion.p>
                            );
                          } else {
                            return (
                              <motion.p 
                                key={`quote-${index}-${currentQuoteIndex}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ 
                                  duration: 5.0, // Increased from 1.0 to 5.0 seconds
                                  delay: 0.4,    // Kept same delay
                                  ease: "easeInOut"
                                }}
                                className="text-center text-white text-2xl font-medium select-none break-words w-full"
                              >
                                {part}
                              </motion.p>
                            );
                          }
                        })}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Swipe Indicator */}
              {categoryQuotes.length > 0 && (
                <div className="flex items-center justify-center mt-2 mb-4">
                  {/* Left Arrow - Always Visible */}
                  <motion.div 
                    className="text-white/60 text-sm flex items-center cursor-pointer p-2 hover:text-white/90 transition-colors"
                    animate={{ x: [-5, 0, -5] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    onClick={() => navigateQuote('prev')}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </motion.div>
                  
                  {/* Center Text - Fades Out */}
                  <AnimatePresence>
                    {!hasUserSwiped && (
                      <motion.div 
                        className="mx-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                          duration: 0.5,
                          ease: "easeInOut"
                        }}
                      >
                        <div className="bg-white/20 rounded-full px-3 py-1">
                          <span className="text-white text-xs">
                            Swipe to browse quotes
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Right Arrow - Always Visible */}
                  <motion.div 
                    className="text-white/60 text-sm flex items-center cursor-pointer p-2 hover:text-white/90 transition-colors"
                    animate={{ x: [5, 0, 5] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    onClick={() => navigateQuote('next')}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </motion.div>
                </div>
              )}

              {/* Card Component */}
              {categoryQuotes.length > 0 ? (
                <div className="w-full flex flex-col items-center">
                  <div className="fixed top-[3px] left-0 right-0 z-30 backdrop-blur-sm border-b border-white/10">
                    <div className="max-w-7xl mx-auto px-4">
                      <motion.button
                        onClick={() => {
                          setShowCategories(true);
                          setCategoryQuotes([]);
                          setCurrentQuoteIndex(0);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-white flex items-center gap-2 py-3"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        <span>Back to Categories</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Interactive Buttons - Now fixed at bottom */}
                  {categoryQuotes.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="fixed bottom-[72px] left-0 right-0 z-30 flex justify-center items-center p-4"
                    >
                      <div className="flex justify-center items-center gap-6 bg-black/30 backdrop-blur-sm py-2 px-6 rounded-full">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            const quoteItem: QuoteHistoryItem = {
                              text: quote,
                              style: 'default',
                              gifUrl,
                              timestamp: new Date(),
                              bgColor,
                              id: Date.now().toString()
                            };
                            toggleFavorite(quoteItem);
                            setShowHeartAnimation(true);
                            setTimeout(() => setShowHeartAnimation(false), 1000);
                          }}
                          className="relative"
                        >
                          <Heart 
                            className={`w-6 h-6 cursor-pointer transition-all duration-300 ${
                              favorites.some(fav => fav.text === quote)
                                ? 'fill-pink-500 text-pink-500' 
                                : 'text-white hover:text-pink-200'
                            }`}
                          />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={async () => {
                            try {
                              setIsGeneratingPreview(true);
                              const dataUrl = await generateQuoteImage(quote, bgImage, true);
                              setPreviewImage(dataUrl);
                              setShowPreview(true);
                            } catch (error) {
                              console.error('Error generating preview:', error);
                              toast.error('Failed to generate preview');
                            } finally {
                              setIsGeneratingPreview(false);
                            }
                          }}
                          className="relative"
                        >
                          <Share2 className="w-6 h-6 text-white hover:text-blue-200 cursor-pointer transition-all duration-300" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {/* Heart Animation */}
                  <AnimatePresence>
                    {showHeartAnimation && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      >
                        <Heart className="w-24 h-24 text-pink-500 fill-pink-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : null}
            </div>
          </main>

          {/* Fixed Action Buttons and Input */}
          {activeSection !== 'categories' && (
            <div className="fixed bottom-16 left-0 right-0 z-30 p-4 space-y-3">
              {/* Action Buttons */}
              <motion.div className="flex justify-center items-center gap-8 bg-black/30 backdrop-blur-sm py-2 px-4 rounded-full w-fit mx-auto">
                {quote && (
                  <motion.div
                    initial={false}
                    animate={{ 
                      scale: favorites.some(fav => fav.text === quote) ? [1, 1.2, 1] : 1
                    }}
                    transition={{ duration: 0.3 }}
                    className="relative"
                  >
                    <Heart 
                      onClick={() => {
                        const quoteItem: QuoteHistoryItem = {
                          text: quote,
                          style: 'default',
                          gifUrl,
                          timestamp: new Date(),
                          bgColor,
                          id: ''
                        };
                        toggleFavorite(quoteItem);
                        setShowHeartAnimation(true);
                        setTimeout(() => setShowHeartAnimation(false), 1000);
                      }}
                      className={`w-6 h-6 cursor-pointer hover:scale-125 transition-all duration-300 ${
                        favorites.some(fav => fav.text === quote)
                          ? 'fill-pink-500 text-pink-500' 
                          : 'text-white hover:text-pink-200'
                      }`}
                    />
                  </motion.div>
                )}
                <motion.div
                  whileTap={{ rotate: 360, scale: 0.8 }}
                  animate={isGenerating ? {
                    rotate: [0, 360],
                    scale: [1, 0.8, 1],
                    transition: {
                      rotate: {
                        duration: 1,
                        repeat: Infinity,
                        ease: [0.4, 0, 0.2, 1]
                      },
                      scale: {
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    }
                  } : undefined}
                >
                  <Dice3
                    onClick={async () => {
                      setIsGenerating(true);
                      try {
                        const response = await fetch('/api/openai', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            userPreferences: {
                              gender: onboarding.personalInfo.gender,
                              relationshipStatus: onboarding.personalInfo.relationshipStatus,
                              areasToImprove: onboarding.personalInfo.areasToImprove,
                              personalGoals: onboarding.personalInfo.personalGoals,
                              preferredStyles: onboarding.personalInfo.preferredStyles
                            }
                          }),
                        });

                        if (!response.ok) {
                          throw new Error('Failed to get AI suggestion');
                        }

                        const data = await response.json();
                        if (!data.result) {
                          throw new Error('No suggestion received');
                        }

                        setUserPrompt(data.result);
                        await handleGenerateQuote();
                        
                        toast.success('Generated a personalized quote based on AI suggestions!');
                      } catch (error) {
                        console.error('Error generating random quote:', error);
                        const randomPrompt = generateRandomPrompt(favorites);
                        setUserPrompt(randomPrompt);
                        await handleGenerateQuote();
                        toast.success('Generated a quote based on your preferences!');
                      } finally {
                        setIsGenerating(false);
                      }
                    }}
                    className="w-6 h-6 cursor-pointer hover:scale-125 transition-transform text-white"
                  />
                </motion.div>
                {quote && (
                  <Upload
                    onClick={async () => {
                      try {
                        setIsGeneratingPreview(true);
                        const dataUrl = await generateQuoteImage(quote, bgImage, true);
                        setPreviewImage(dataUrl);
                        setShowPreview(true);
                      } catch (error) {
                        console.error('Error generating preview:', error);
                        toast.error('Failed to generate preview');
                      } finally {
                        setIsGeneratingPreview(false);
                      }
                    }}
                    className="w-6 h-6 cursor-pointer hover:scale-125 transition-transform text-white hover:text-green-200"
                  />
                )}
              </motion.div>

              {/* Input Field */}
              <div className="relative w-full max-w-[500px] mx-auto">
                <Input
                  type="text"
                  placeholder="Enter a topic/word for your quote"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full text-lg placeholder:text-white/70 text-white bg-black/30 backdrop-blur-sm border-white/20 pr-12"
                />
                <div 
                  onClick={handleGenerateQuote}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
                >
                  <Image
                    src="/Submit_Icon.png"
                    alt="Submit"
                    width={20}
                    height={20}
                    className="invert brightness-0 object-contain"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          )}

          {/* History Page */}
          {showHistory && (
            <div className="fixed inset-0 bottom-16 bg-black z-40">
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center p-4 border-b border-white/10">
                  <h2 className="text-xl font-semibold text-white">History</h2>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-4"
                  >
                    {quoteHistory.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        No history yet
                      </div>
                    ) : (
                      quoteHistory.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="bg-white/10 rounded-lg p-4 cursor-pointer hover:bg-white/20 transition-colors relative group"
                          onClick={() => handleReuseQuote(item)}
                        >
                          {item.gifUrl ? (
                            <div className="flex gap-4">
                              <div className="w-24 h-24 flex-shrink-0 rounded-lg bg-black/50 overflow-hidden relative">
                                <Image
                                  src={item.gifUrl}
                                  alt="Quote GIF"
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                              </div>
                              <div className="flex-1 flex items-center">
                                <p className="text-white text-sm">{item.text}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-white text-sm">{item.text}</p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(item);
                            }}
                            className="absolute top-2 right-2 text-gray-400 hover:text-pink-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Heart className={`w-5 h-5 ${
                              favorites.some(fav => fav.text === item.text)
                                ? 'fill-pink-500 text-pink-500'
                                : ''
                            }`} />
                          </button>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          )}

          {/* Favorites Page */}
          {showFavorites && (
            <div className="fixed inset-0 bottom-16 bg-black z-40">
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center p-4 border-b border-white/10">
                  <h2 className="text-xl font-semibold text-white">Favorites</h2>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-4"
                  >
                    {favorites.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        No favorites yet
                      </div>
                    ) : (
                      favorites.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="bg-white/10 rounded-lg p-4 cursor-pointer hover:bg-white/20 transition-colors relative group"
                          onClick={() => {
                            setIsInitialState(false);
                            setQuote(item.text);
                            setGifUrl(item.gifUrl);
                            setShowFavorites(false);
                          }}
                        >
                          {item.gifUrl ? (
                            <div className="flex gap-4">
                              <div className="w-24 h-24 flex-shrink-0 rounded-lg bg-black/50 overflow-hidden relative">
                                <Image
                                  src={item.gifUrl}
                                  alt="Quote GIF"
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                              </div>
                              <div className="flex-1 flex items-center">
                                <p className="text-white text-sm">{item.text}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-white text-sm">{item.text}</p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(item);
                            }}
                            className="absolute top-2 right-2 text-gray-400 hover:text-pink-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Heart className="w-5 h-5 fill-current" />
                          </button>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          )}

          {/* Theme Page */}
          {showThemeMenu && (
            <div className="fixed inset-0 bottom-16 bg-black z-50">
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h2 className="text-xl font-semibold text-white">Theme</h2>
                  <button 
                    onClick={() => setShowThemeMenu(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      {
                        id: 'nature1',
                        name: 'Nature 1',
                        path: '/Background_Nature_1_pexels-asumaani-16545605.jpg'
                      },
                      {
                        id: 'urban',
                        name: 'Urban',
                        path: '/Background_Urban_1_pexels-kyle-miller-169884138-18893527.jpg'
                      },
                      {
                        id: 'nature2',
                        name: 'Nature 2',
                        path: '/Background_Nature_2pexels-manishjangid-30195420.jpg'
                      },
                      {
                        id: 'flower',
                        name: 'Flower',
                        path: '/Background_Flower_1_pexels-pixabay-262713.jpg'
                      },
                      {
                        id: 'opensea',
                        name: 'Open Sea',
                        path: '/Background_Water_pexels-jeremy-bishop-1260133-2397652.jpg'
                      },
                      {
                        id: 'sazon',
                        name: 'TheMrSazon',
                        path: '/Background_TheMrSazon_1.png'
                      },
                      {
                        id: 'gradient-pink',
                        name: 'Pink Gradient',
                        path: 'gradient-pink',
                        isGradient: true,
                        gradientClass: 'from-purple-400 via-pink-500 to-red-500'
                      },
                      {
                        id: 'gradient-black',
                        name: 'Black Gradient',
                        path: 'gradient-black',
                        isGradient: true,
                        gradientClass: 'from-gray-900 via-gray-700 to-gray-800'
                      },
                      {
                        id: 'gradient-yellow',
                        name: 'Yellow Gradient',
                        path: 'gradient-yellow',
                        isGradient: true,
                        gradientClass: 'from-yellow-400 via-orange-500 to-red-500'
                      },
                      {
                        id: 'gradient-green',
                        name: 'Green Gradient',
                        path: 'gradient-green',
                        isGradient: true,
                        gradientClass: 'from-green-400 via-emerald-500 to-teal-500'
                      },
                      {
                        id: 'gradient-purple',
                        name: 'Purple Gradient',
                        path: 'gradient-purple',
                        isGradient: true,
                        gradientClass: 'from-[#472A91] via-purple-600 to-purple-800'
                      }
                    ].map((bg) => (
                      <motion.div
                        key={bg.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        onClick={async () => {
                          const newTheme = bg.isGradient ? bg.path : bg.path;
                          setBgImage(newTheme);
                          if (context?.user?.fid) {
                            try {
                              await saveThemePreference(context.user.fid, newTheme);
                              toast.success('Theme updated');
                            } catch (error) {
                              console.error('Error saving theme preference:', error);
                            }
                          }
                        }}
                        className={`aspect-square rounded-lg overflow-hidden cursor-pointer relative ${
                          bgImage === bg.path ? 'ring-2 ring-white' : ''
                        }`}
                      >
                        {bg.isGradient ? (
                          <div className={`w-full h-full bg-gradient-to-br ${bg.gradientClass}`} />
                        ) : (
                          <>
                            <Image
                              src={bg.path}
                              alt={bg.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 150px, 200px"
                              priority={true}
                              loading="eager"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/20" />
                          </>
                        )}
                        {bgImage === bg.path && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                          <p className="text-white text-xs text-center">{bg.name}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Page */}
          {showSettings && (
            <div className="fixed inset-0 bottom-16 bg-black z-50">
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h2 className="text-xl font-semibold text-white">Settings</h2>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <div className="space-y-4">
                    {/* GIF Toggle */}
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-medium">GIF Generation</h3>
                          <p className="text-white/60 text-sm">Enable or disable GIF generation for quotes</p>
                        </div>
                        <button
                          onClick={() => {
                            handleGifToggle();
                            toast.success(`GIF Generation ${!gifEnabled ? 'Enabled' : 'Disabled'}`);
                          }}
                          className="toggle-container relative w-[60px] h-[32px] rounded-full cursor-pointer"
                          style={{
                            backgroundColor: gifEnabled ? 'rgb(59, 130, 246)' : 'rgb(107, 114, 128)',
                          }}
                        >
                          <motion.div
                            className="absolute top-[2px] left-[2px] w-[28px] h-[28px] bg-white rounded-full shadow-lg"
                            layout
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 35,
                              mass: 1
                            }}
                            animate={{
                              x: gifEnabled ? 28 : 0,
                              scale: gifEnabled ? 1.1 : 1
                            }}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Music Toggle */}
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-medium">Background Music</h3>
                          <p className="text-white/60 text-sm">Enable or disable background music</p>
                        </div>
                        <button
                          onClick={() => {
                            setIsMusicEnabled(!isMusicEnabled);
                            toast.success(`Background Music ${!isMusicEnabled ? 'Enabled' : 'Disabled'}`);
                          }}
                          className="toggle-container relative w-[60px] h-[32px] rounded-full cursor-pointer"
                          style={{
                            backgroundColor: isMusicEnabled ? 'rgb(59, 130, 246)' : 'rgb(107, 114, 128)',
                          }}
                        >
                          <motion.div
                            className="absolute top-[2px] left-[2px] w-[28px] h-[28px] bg-white rounded-full shadow-lg"
                            layout
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 35,
                              mass: 1
                            }}
                            animate={{
                              x: isMusicEnabled ? 28 : 0,
                              scale: isMusicEnabled ? 1.1 : 1
                            }}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Clear History */}
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-medium">Clear History</h3>
                          <p className="text-white/60 text-sm">Remove all quote history</p>
                        </div>
                        <button
                          onClick={() => {
                            handleClearHistory();
                            toast.success('History cleared');
                          }}
                          disabled={isClearing}
                          className="px-4 py-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Clear Favorites */}
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-medium">Clear Favorites</h3>
                          <p className="text-white/60 text-sm">Remove all favorite quotes</p>
                        </div>
                        <button
                          onClick={() => {
                            if (context?.user?.fid) {
                              setFavorites([]);
                              toast.success('Favorites cleared');
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Version Info */}
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-white font-medium">Version</h3>
                        <span className="text-white/60">1.2.2</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Share Preview Modal */}
          {showPreview && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
              onClick={() => {
                setShowPreview(false);
                setPreviewImage(null);
              }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 max-w-lg w-full m-4 shadow-lg border border-white/20"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-medium text-white">
                    Share Your Quote
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="rounded-full h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
                    onClick={() => {
                      setShowPreview(false);
                      setPreviewImage(null);
                    }}
                  >
                    <X className="h-4 w-4 text-white" />
                  </motion.button>
                </div>

                <div className="space-y-5">
                  {/* Preview Area */}
                  <div className="rounded-xl overflow-hidden bg-black/20 aspect-[2/1] relative border border-white/10">
                    {isGeneratingPreview ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-white/80 text-sm"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin h-6 w-6 border-2 border-white/60 border-t-transparent rounded-full" />
                            <span>Generating preview...</span>
                          </div>
                        </motion.div>
                      </div>
                    ) : previewImage ? (
                      <Image
                        src={previewImage}
                        alt="Share Preview"
                        width={800}
                        height={400}
                        className="w-full h-full object-contain"
                        unoptimized
                      />
                    ) : gifEnabled && gifUrl ? (
                      <Image
                        src={gifUrl || ''}
                        alt="GIF Preview"
                        width={800}
                        height={400}
                        className="w-full h-full object-contain"
                        unoptimized
                      />
                    ) : null}
                  </div>

                  {/* Share Buttons */}
                  <div className="flex justify-end">
                    <div className="flex gap-3 w-full">
                      <Button
                        onClick={async () => {
                          try {
                            const shareText = `"${quote}" - Join the Farcaster community /funquotes`;
                            
                            const baseUrl = 'https://warpcast.com/~/compose';
                            const textParam = `text=${encodeURIComponent(shareText)}`;
                            const appParam = `embeds[]=${encodeURIComponent('https://qg-frames.vercel.app')}`;
                            
                            // Build the URL based on GIF URL
                            let url;
                            if (gifUrl) {
                              const gifParam = `embeds[]=${encodeURIComponent(gifUrl)}`;
                              url = `${baseUrl}?${textParam}&${gifParam}&${appParam}`;
                            } else {
                              url = `${baseUrl}?${textParam}&${appParam}`;
                            }
                            
                            sdk.actions.openUrl(url);
                            
                            logAnalyticsEvent('cast_created', {
                              quote: quote,
                              hasMedia: !!gifUrl,
                              mediaType: 'gif'
                            });
                            
                            setShowPreview(false);
                            setPreviewImage(null);
                          } catch (error) {
                            console.error('Error sharing:', error);
                            toast.error('Failed to share. Please try again.');
                          }
                        }}
                        disabled={!gifUrl || isCasting}
                        className="!flex-1 !bg-white/20 !text-white py-2 rounded-xl transition-all flex items-center justify-center gap-2 !hover:bg-white/30 !disabled:opacity-30 !disabled:bg-white/10"
                      >
                        {isCasting ? (
                          <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            •••
                          </motion.span>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Share with GIF
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            setIsGeneratingPreview(true);
                            const dataUrl = await generateQuoteImage(quote, bgImage, true);
                            setPreviewImage(dataUrl);
                            setIsCasting(true);

                            // Convert data URL to blob
                            const base64Data = dataUrl.split(',')[1];
                            const byteCharacters = atob(base64Data);
                            const byteArrays = [];
                            
                            for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
                              const slice = byteCharacters.slice(offset, offset + 1024);
                              const byteNumbers = new Array(slice.length);
                              for (let i = 0; i < slice.length; i++) {
                                byteNumbers[i] = slice.charCodeAt(i);
                              }
                              const byteArray = new Uint8Array(byteNumbers);
                              byteArrays.push(byteArray);
                            }
                            
                            const blob = new Blob(byteArrays, { type: 'image/png' });

                            // Upload to Firebase Storage
                            const storage = getStorage();
                            const fileName = `quotes/${Date.now()}-${context?.user?.username || 'user'}.png`;
                            const storageRef = ref(storage, fileName);
                            
                            const metadata = {
                              contentType: 'image/png',
                              cacheControl: 'public, max-age=31536000',
                              customMetadata: {
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                                'Access-Control-Allow-Headers': 'Content-Type',
                                'Access-Control-Expose-Headers': 'Content-Length, Content-Type',
                                'Cache-Control': 'public, max-age=31536000'
                              }
                            };

                            // Upload and get URL
                            const uploadTask = await uploadBytes(storageRef, blob, metadata);
                            
                            // Get a clean, properly formatted download URL
                            // Setting custom authorization null will return a URL that doesn't require auth
                            const imageUrl = await getDownloadURL(uploadTask.ref);
                            console.log('Original Firebase URL:', imageUrl);
                            
                            // Generate a tokenless URL for maximum compatibility with Warpcast
                            // Firebase URLs typically follow this format: https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID].appspot.com/o/[FILE_PATH]?[TOKEN_PARAMS]
                            // We'll strip query parameters for cleaner embedding
                            // Generate a tokenless URL for maximum compatibility
                            // This can help avoid issues with social media platforms that might strip tokens
                            // The Firebase Storage URL format may vary, but this helps ensure it's clean
                            const firebaseStorageBaseUrl = imageUrl.split('?')[0]; // Remove any query params
                            console.log('Clean Firebase URL (no tokens):', firebaseStorageBaseUrl);
                            
                            // IMPORTANT: Keep the full Firebase URL with token for Warpcast
                            // Previous attempt to clean the URL was incorrect - we need the token
                            const warpcastOptimizedUrl = imageUrl; // Use the complete URL with token
                            
                            // Test direct image URL access - this helps diagnose issues
                            console.log('Testing direct image URL access...');
                            try {
                              // Create a test image element to verify the URL works
                              const testImg = document.createElement('img');
                              testImg.onload = () => console.log('✅ Image URL loads successfully');
                              testImg.onerror = () => console.error('❌ Image URL failed to load');
                              testImg.src = imageUrl;
                              
                              // Also log a direct access link for testing
                              console.log('Direct image access link (for testing):', 
                                `<a href="${imageUrl}" target="_blank">Test Direct Image Access</a>`);
                            } catch (imgTestErr) {
                              console.error('Image test error:', imgTestErr);
                            }
                            
                            // Create the share text and URL to Compose Message in Farcaster
                            const quoteParts = quote.split('\n\n');
                            const quoteText = quoteParts[0];
                            const shareText = `${quoteText}\n\nJoin the Farcaster community /funquotes`;

                            // Build Warpcast URL with both embeds
                            const params = new URLSearchParams();
                            params.append('text', shareText);

                            try {
                              // Simplest possible approach - minimal encoding
                              const baseUrl = 'https://warpcast.com/~/compose';
                              const textParam = `text=${encodeURIComponent(shareText)}`;
                              
                              // IMPORTANT: We need the full Firebase URL with the token for it to work
                              // The path part of the Firebase URL must keep its encoding (e.g., %2F instead of /)
                              
                              // Mobile vs Desktop Compatibility Issue:
                              // - Desktop processes URLs one way
                              // - Mobile app processes URLs differently (giving 404 errors)
                              console.log('Original Firebase URL:', imageUrl);
                              
                              // Multi-platform compatibility solution:
                              // 1. Parse the URL to understand its parts
                              // 2. Create a version that's resilient to different platform handling
                              
                              // BREAKTHROUGH: The GIF sharing works perfectly on both platforms!
                              // Let's simplify this to match the working GIF approach
                              
                              // The GIF approach just uses simple encodeURIComponent - nothing fancy
                              console.log('Original Firebase URL:', imageUrl);
                              
                              // Simple approach - just like the working GIF code
                              const imageParam = `embeds[]=${encodeURIComponent(imageUrl)}`;
                              const appParam = `embeds[]=${encodeURIComponent('https://qg-frames.vercel.app')}`;
                              
                              // Construct a simple URL just like the GIF version
                              const url = `${baseUrl}?${textParam}&${imageParam}&${appParam}`;
                              console.log('Final Warpcast URL (simple approach):', url);
                              
                              sdk.actions.openUrl(url);
                              
                              // For troubleshooting, log URLs for comparison
                              console.log('Original Firebase URL:', imageUrl);
                              console.log('Final URL sent to Warpcast:', url);
                            } catch (error) {
                              console.error('Error creating share URL:', error);
                              toast.error('Error creating share URL. Please try again.');
                            }
                            
                            logAnalyticsEvent('cast_created', {
                              quote: quote,
                              hasMedia: true,
                              mediaType: 'canvas'
                            });
                            
                            setShowPreview(false);
                            setPreviewImage(null);
                            setIsCasting(false);
                            
                          } catch (error) {
                            console.error('Error in share process:', error);
                            toast.error('Failed to share. Please try again.');
                            setIsCasting(false);
                          } finally {
                            setIsGeneratingPreview(false);
                          }
                        }}
                        disabled={isCasting}
                        className="!flex-1 !bg-white/20 !text-white py-2 rounded-xl transition-all flex items-center justify-center gap-2 !hover:bg-white/30 !disabled:opacity-30 !disabled:bg-white/10"
                      >
                        {isCasting ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <>
                            <Frame className="w-4 h-4" />
                            Share as Image
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Help text */}
                  <p className="text-xs text-center text-white/60 mt-2">
                    Your quote will be shared to Warpcast
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          {/* Profile Modal */}
          {showProfile && (
            <ProfileModal 
              onClose={() => setShowProfile(false)}
              context={context}
              favorites={favorites}
              quoteHistory={quoteHistory}
              sessionStartTime={sessionStartTime}
            />
          )}

          {/* Onboarding Modal */}
          {hasCheckedOnboarding && !onboarding.hasCompletedOnboarding && (
            <OnboardingFlow 
              onboarding={onboarding}
              setOnboarding={setOnboarding}
              onComplete={() => {
                setOnboarding(prev => ({ ...prev, hasCompletedOnboarding: true }));
              }}
              context={context}
              setBgImage={setBgImage}
            />
          )}

          {/* User Preferences Page */}
          {showPreferences && (
            <div className="fixed inset-0 bottom-16 bg-black z-40">
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h2 className="text-xl font-semibold text-white">User Preferences</h2>
                  <button 
                    onClick={() => setShowPreferences(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 pb-24 custom-scrollbar">
                  <div className="space-y-4">
                    {/* Quote Style */}
                    <button
                      onClick={() => setShowQuoteStylePage(true)}
                      className="w-full bg-white/10 rounded-lg p-4 text-left hover:bg-white/20 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <h3 className="text-white font-medium">Quote Style</h3>
                        <p className="text-white/60 text-sm">
                          {onboarding.personalInfo.preferredQuoteStyle ? 
                            `Current: ${onboarding.personalInfo.preferredQuoteStyle}` : 
                            'Choose your preferred quote style'}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/60" />
                    </button>

                    {/* Areas to Improve */}
                    <button
                      onClick={() => setShowAreasPage(true)}
                      className="w-full bg-white/10 rounded-lg p-4 text-left hover:bg-white/20 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <h3 className="text-white font-medium">Areas to Improve</h3>
                        <p className="text-white/60 text-sm">
                          {onboarding.personalInfo.areasToImprove?.length ? 
                            `${onboarding.personalInfo.areasToImprove.length} areas selected` : 
                            'Select areas you want to focus on'}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/60" />
                    </button>

                    {/* Personal Goals */}
                    <button
                      onClick={() => setShowGoalsPage(true)}
                      className="w-full bg-white/10 rounded-lg p-4 text-left hover:bg-white/20 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <h3 className="text-white font-medium">Personal Goals</h3>
                        <p className="text-white/60 text-sm">
                          {onboarding.personalInfo.personalGoals ? 
                            'Goals set' : 
                            'Set your personal goals'}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/60" />
                    </button>
                  </div>
                </div>
                {/* Remove the Fixed Save Button from User Preferences */}
              </div>
            </div>
          )}

          {/* Quote Style Page */}
          {showQuoteStylePage && (
            <div className="fixed inset-0 bottom-16 bg-black z-50">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (context?.user?.fid) {
                          saveOnboardingData(context.user.fid, {
                            preferredQuoteStyle: onboarding.personalInfo.preferredQuoteStyle,
                            gender: onboarding.personalInfo.gender,
                            relationshipStatus: onboarding.personalInfo.relationshipStatus,
                            selectedTheme: onboarding.personalInfo.selectedTheme,
                            areasToImprove: onboarding.personalInfo.areasToImprove,
                            personalGoals: onboarding.personalInfo.personalGoals,
                            preferredStyles: onboarding.personalInfo.preferredStyles
                          });
                        }
                        setShowQuoteStylePage(false);
                      }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <motion.h2 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="text-xl font-semibold text-white"
                    >
                      Quote Style
                    </motion.h2>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="space-y-4 mb-4">
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-white/70 text-sm"
                      >
                        Choose your preferred style for quotes.<br/><br/>
                        You can select up to 3 different styles to get a mix of quotes that match your personality.
                      </motion.p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {['casual', 'direct', 'eloquent', 'poetic', 'humorous', 'spiritual', 'philosophical'].map((style, index) => {
                        // Use temporary state for selection
                        const tempStyles = tempQuoteStyles || onboarding.personalInfo.preferredQuoteStyle || '';
                        const isSelected = tempStyles.includes(style);
                        const selectedCount = tempStyles.split(',').filter(s => s.length > 0).length || 0;
                        
                        return (
                          <motion.button
                            key={style}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                            onClick={() => {
                              const currentStyles = tempStyles.split(',').filter(s => s.length > 0) || [];
                              let newStyles;
                              
                              if (isSelected) {
                                // Remove style if already selected
                                newStyles = currentStyles.filter(s => s !== style);
                              } else if (currentStyles.length < 3) {
                                // Add style if under the limit
                                newStyles = [...currentStyles, style];
                              } else {
                                toast.error('Maximum 3 styles allowed');
                                return;
                              }
                              
                              // Update temporary state instead of onboarding state
                              setTempQuoteStyles(newStyles.join(','));
                            }}
                            className={`px-4 py-3 rounded-lg capitalize flex items-center justify-between ${
                              isSelected
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/10 text-white hover:bg-white/20'
                            } ${selectedCount >= 3 && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span>{style}</span>
                            {isSelected && (
                              <Check className="w-5 h-5" />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
                {/* Fixed Save Button */}
                <div className="fixed bottom-16 left-0 right-0 p-4 bg-black">
                  <button
                    onClick={() => {
                      if (context?.user?.fid && tempQuoteStyles !== undefined) {
                        // Update onboarding state
                        const updatedPersonalInfo = {
                          ...onboarding.personalInfo,
                          preferredQuoteStyle: tempQuoteStyles
                        };
                        
                        setOnboarding(prev => ({
                          ...prev,
                          personalInfo: updatedPersonalInfo
                        }));
                        
                        // Save to backend
                        saveOnboardingData(context.user.fid, {
                          preferredQuoteStyle: tempQuoteStyles,
                          gender: onboarding.personalInfo.gender,
                          relationshipStatus: onboarding.personalInfo.relationshipStatus,
                          selectedTheme: onboarding.personalInfo.selectedTheme,
                          areasToImprove: onboarding.personalInfo.areasToImprove,
                          personalGoals: onboarding.personalInfo.personalGoals,
                          preferredStyles: onboarding.personalInfo.preferredStyles
                        });
                        
                        toast.success('Styles saved successfully');
                        setShowQuoteStylePage(false);
                        // Reset temporary state
                        setTempQuoteStyles(undefined);
                      }
                    }}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Areas to Improve Page */}
          {showAreasPage && (
            <div className="fixed inset-0 bottom-16 bg-black z-50">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (context?.user?.fid) {
                          saveOnboardingData(context.user.fid, {
                            preferredQuoteStyle: onboarding.personalInfo.preferredQuoteStyle,
                            gender: onboarding.personalInfo.gender,
                            relationshipStatus: onboarding.personalInfo.relationshipStatus,
                            selectedTheme: onboarding.personalInfo.selectedTheme,
                            areasToImprove: onboarding.personalInfo.areasToImprove,
                            personalGoals: onboarding.personalInfo.personalGoals,
                            preferredStyles: onboarding.personalInfo.preferredStyles
                          });
                        }
                        setShowAreasPage(false);
                      }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <motion.h2 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="text-xl font-semibold text-white"
                    >
                      Areas to Improve
                    </motion.h2>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="space-y-4 mb-4">
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-white/70 text-sm"
                      >
                        Select the areas in your life you&apos;d like to focus on.<br/><br/>
                        We&apos;ll generate quotes that inspire and motivate you in these specific areas.
                      </motion.p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        'confidence', 'motivation', 'relationships', 'career',
                        'health', 'creativity', 'leadership', 'mindfulness'
                      ].map((area, index) => (
                        <motion.button
                          key={area}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                          onClick={() => {
                            setOnboarding(prev => {
                              const areas = prev.personalInfo.areasToImprove || [];
                              const newAreas = areas.includes(area)
                                ? areas.filter(a => a !== area)
                                : [...areas, area];
                              return {
                                ...prev,
                                personalInfo: {
                                  ...prev.personalInfo,
                                  areasToImprove: newAreas
                                }
                              };
                            });
                            toast.success('Areas updated');
                          }}
                          className={`px-4 py-3 rounded-lg capitalize flex items-center justify-between ${
                            onboarding.personalInfo.areasToImprove?.includes(area)
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          <span>{area}</span>
                          {onboarding.personalInfo.areasToImprove?.includes(area) && (
                            <Check className="w-5 h-5" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </div>
                {/* Fixed Save Button */}
                <div className="fixed bottom-16 left-0 right-0 p-4 bg-black">
                  <button
                    onClick={() => {
                      if (context?.user?.fid) {
                        saveOnboardingData(context.user.fid, {
                          preferredQuoteStyle: onboarding.personalInfo.preferredQuoteStyle,
                          gender: onboarding.personalInfo.gender,
                          relationshipStatus: onboarding.personalInfo.relationshipStatus,
                          selectedTheme: onboarding.personalInfo.selectedTheme,
                          areasToImprove: onboarding.personalInfo.areasToImprove,
                          personalGoals: onboarding.personalInfo.personalGoals,
                          preferredStyles: onboarding.personalInfo.preferredStyles
                        });
                        toast.success('Areas saved successfully');
                      }
                    }}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Save Areas
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Personal Goals Page */}
          {showGoalsPage && (
            <div className="fixed inset-0 bottom-16 bg-black z-50">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (context?.user?.fid) {
                          saveOnboardingData(context.user.fid, {
                            preferredQuoteStyle: onboarding.personalInfo.preferredQuoteStyle,
                            gender: onboarding.personalInfo.gender,
                            relationshipStatus: onboarding.personalInfo.relationshipStatus,
                            selectedTheme: onboarding.personalInfo.selectedTheme,
                            areasToImprove: onboarding.personalInfo.areasToImprove,
                            personalGoals: onboarding.personalInfo.personalGoals,
                            preferredStyles: onboarding.personalInfo.preferredStyles
                          });
                        }
                        setShowGoalsPage(false);
                      }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <motion.h2 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="text-xl font-semibold text-white"
                    >
                      Personal Goals
                    </motion.h2>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="space-y-4">
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-white/70 text-sm mb-4"
                      >
                        Write down your personal goals and dreams.
                      </motion.p>
                      <motion.textarea
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        value={onboarding.personalInfo.personalGoals || ''}
                        onChange={(e) => {
                          setOnboarding(prev => ({
                            ...prev,
                            personalInfo: {
                              ...prev.personalInfo,
                              personalGoals: e.target.value
                            }
                          }));
                        }}
                        placeholder="Enter your personal goals..."
                        className="w-full h-48 bg-white/10 text-white rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </motion.div>
                </div>
                {/* Fixed Save Button */}
                <div className="fixed bottom-16 left-0 right-0 p-4 bg-black">
                  <button
                    onClick={() => {
                      if (context?.user?.fid) {
                        saveOnboardingData(context.user.fid, {
                          preferredQuoteStyle: onboarding.personalInfo.preferredQuoteStyle,
                          gender: onboarding.personalInfo.gender,
                          relationshipStatus: onboarding.personalInfo.relationshipStatus,
                          selectedTheme: onboarding.personalInfo.selectedTheme,
                          areasToImprove: onboarding.personalInfo.areasToImprove,
                          personalGoals: onboarding.personalInfo.personalGoals,
                          preferredStyles: onboarding.personalInfo.preferredStyles
                        });
                        toast.success('Goals saved successfully');
                      }
                    }}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Save Goals
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
        {/* Categories Page */}
        {showCategories && (
          <Categories 
            onSelectQuote={(text, author, source, gifUrl) => {
              setIsInitialState(false);
              setQuote(`${text}\n\n- ${author}\n${source}`);
              setGifUrl(gifUrl);
              setShowCategories(false);
            }}
            onSelectCategory={(quotes, initialIndex) => {
              setCategoryQuotes(quotes);
              setCurrentQuoteIndex(initialIndex);
              setHasUserSwiped(false); // Reset when new category is selected
            }}
            onToggleFavorite={(quote: CategoryQuote) => {
              const quoteItem: QuoteHistoryItem = {
                text: `${quote.text}\n\n- ${quote.author}\n${quote.source}`,
                style: 'default',
                gifUrl: null,
                timestamp: new Date(),
                bgColor,
                id: Date.now().toString()
              };
              toggleFavorite(quoteItem);
              setShowHeartAnimation(true);
              setTimeout(() => setShowHeartAnimation(false), 1000);
            }}
            onShare={(quote: CategoryQuote) => {
              setIsInitialState(false);
              setQuote(`${quote.text}\n\n- ${quote.author}\n${quote.source}`);
              setGifUrl(null);
              setShowPreview(true);
            }}
            favorites={favorites}
          />
        )}
        <BottomNav 
          activeSection={activeSection} 
          onNavigate={handleNavigation} 
          className="bg-black shadow-lg"
          showTooltips={showTooltips}
        />
      </div>
  );
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Update the ProfileModal interface
interface ProfileModalProps {
  onClose: () => void;
  context: FrameContext | undefined;  // Update this type
  favorites: FavoriteQuote[];
  quoteHistory: QuoteHistoryItem[];
  sessionStartTime: number;
}

// Update the ProfileModal component
const ProfileModal: React.FC<ProfileModalProps> = ({ 
  onClose, 
  context, 
  favorites, 
  quoteHistory, 
  sessionStartTime
}) => (
  <div 
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    onClick={onClose}
  >
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-xl p-6 max-w-lg w-full m-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Profile
        </h2>
        <Button
          className="rounded-full h-7 w-7 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4 text-black" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Profile Image and Basic Info */}
        <div 
          className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
          onClick={() => {
            if (context?.user?.username) {
              sdk.actions.openUrl(`https://warpcast.com/${context.user.username}`);
            }
          }}
        >
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-purple-600">
            <Image
              src={context?.user?.pfpUrl || "/Profile_Image.jpg"}
              alt="Profile"
              fill
              className="object-cover"
              unoptimized
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/Profile_Image.jpg";
              }}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {context?.user?.displayName || "User"}
              <span className="text-sm text-gray-500">↗</span>
            </h3>
            <p className="text-gray-600">@{context?.user?.username}</p>
          </div>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Favorites</p>
            <p className="text-2xl font-semibold text-gray-900">{favorites.length}</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Account Info</h4>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              FID: {context?.user?.fid}
            </p>
            <p className="text-sm text-gray-600">
              Joined: {formatDate(sessionStartTime)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  </div>
);