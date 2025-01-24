/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

// 1. Imports
import { Share2, Sparkles, Heart, History, X, Palette, Check, Settings, ChevronDown, Frame, Shuffle, Upload, Dice3, ChevronRight, ChevronLeft } from 'lucide-react';
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
  getOnboardingData
} from '../lib/firestore';
import type { OnboardingState } from '../types/onboarding';
import { OnboardingFlow } from './OnboardingFlow';
import { useOnboarding } from '../hooks/useOnboarding';
import { ErrorBoundary } from './ErrorBoundary';
import type { QuoteHistoryItem, FavoriteQuote } from '../types/quotes';
import { logAnalyticsEvent, logUserAction, setAnalyticsUser } from '../lib/analytics';
import { BottomNav } from './BottomNav';

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

  // Add new state for music
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  // Add loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingGif, setIsLoadingGif] = useState(false);

  const { onboarding, setOnboarding } = useOnboarding(context, isFirebaseInitialized, setBgImage);

  // Add this state for navigation
  const [activeSection, setActiveSection] = useState('generate');

  // Add new state for preferences page
  const [showPreferences, setShowPreferences] = useState(false);

  // Add new states for quote style, areas to improve, and personal goals pages
  const [showQuoteStylePage, setShowQuoteStylePage] = useState(false);
  const [showAreasPage, setShowAreasPage] = useState(false);
  const [showGoalsPage, setShowGoalsPage] = useState(false);

  const handleNavigation = (section: string) => {
    // Close all profile menu pages
    setShowPreferences(false);
    setShowThemeMenu(false);
    setShowSettings(false);
    setShowQuoteStylePage(false);
    setShowAreasPage(false);
    setShowGoalsPage(false);

    // Close all pages and set new section immediately
    setShowFavorites(false);
    setShowHistory(false);

    if (section === 'generate') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'favorites') {
      setShowFavorites(true);
    } else if (section === 'history') {
      setShowHistory(true);
    }
    setActiveSection(section);
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
  }, [isLoading, userPrompt, onboarding, gifEnabled]);

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
      logUserAction('toggle_favorite', 'quote_interaction', isAlreadyFavorited ? 'remove' : 'add');
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

  // Update the background music effect
  useEffect(() => {
    const audio = new Audio('/ES_Calm_Cadence_ChillCole.mp3');
    audio.loop = true;
    audio.volume = 0.3;
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
  const generateQuoteImage = async (quote: string, bgImage: string, userContext?: FrameContext): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        // Ensure ctx is treated as CanvasRenderingContext2D
        const context = ctx as CanvasRenderingContext2D;

        // Set canvas size
        canvas.width = 800;
        canvas.height = 400;

        // Handle gradient backgrounds
        if (bgImage?.includes('gradient')) {
          let gradient;
          switch (bgImage) {
            case 'gradient-pink':
              gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, 'rgb(192, 132, 252)');
              gradient.addColorStop(0.5, 'rgb(244, 114, 182)');
              gradient.addColorStop(1, 'rgb(239, 68, 68)');
              break;
            case 'gradient-black':
              gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, 'rgb(17, 24, 39)');
              gradient.addColorStop(0.5, 'rgb(55, 65, 81)');
              gradient.addColorStop(1, 'rgb(31, 41, 55)');
              break;
            case 'gradient-yellow':
              gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, 'rgb(251, 191, 36)');
              gradient.addColorStop(0.5, 'rgb(249, 115, 22)');
              gradient.addColorStop(1, 'rgb(239, 68, 68)');
              break;
            case 'gradient-green':
              gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, 'rgb(52, 211, 153)');
              gradient.addColorStop(0.5, 'rgb(16, 185, 129)');
              gradient.addColorStop(1, 'rgb(20, 184, 166)');
              break;
            case 'gradient-purple':
              gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, '#472A91');
              gradient.addColorStop(0.5, 'rgb(147, 51, 234)');
              gradient.addColorStop(1, 'rgb(107, 33, 168)');
              break;
            default:
              gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, '#9b5de5');
              gradient.addColorStop(0.5, '#f15bb5');
              gradient.addColorStop(1, '#ff6b6b');
          }
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bgImage === 'none') {
          // Create default gradient background
          const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#9b5de5');
          gradient.addColorStop(0.5, '#f15bb5');
          gradient.addColorStop(1, '#ff6b6b');
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
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
            context.fillStyle = '#000000';
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Draw background image centered
            context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            
            // Add semi-transparent overlay
            context.fillStyle = 'rgba(0, 0, 0, 0.3)';
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Continue with text and profile rendering
            addTextAndProfile();
          };
          return; // Return early as we'll resolve in the addTextAndProfile function
        }

        // If we didn't return early (for image backgrounds), add text and profile immediately
        addTextAndProfile();

        function addTextAndProfile() {
          if (!context) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Add quote text
          context.fillStyle = 'white';
          context.textAlign = 'center';
          context.font = 'bold 32px Inter, sans-serif';
          
          // Word wrap the text
          const words = quote.split(' ');
          const lines = [];
          let currentLine = '';
          const maxWidth = canvas.width - 100;

          words.forEach(word => {
            const testLine = currentLine + word + ' ';
            const metrics = context.measureText(testLine);
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
          const startY = (canvas.height - totalHeight) / 2 - 20;

          lines.forEach((line, index) => {
            context.fillText(line.trim(), canvas.width / 2, startY + (index * lineHeight));
          });

          // Create profile image element
          const profileImg = document.createElement('img');
          profileImg.crossOrigin = 'anonymous';
          profileImg.src = userContext?.user?.pfpUrl || "/Profile_Image.jpg";

          profileImg.onload = () => {
            // Draw profile section
            const profileSize = 40;
            const profileY = canvas.height - 70;
            const username = `@${userContext?.user?.username || 'user'}`;
            
            context.font = '20px Inter, sans-serif';
            const textMetrics = context.measureText(username);
            const totalWidth = profileSize + 15 + textMetrics.width;
            const startX = (canvas.width - totalWidth) / 2;
            const profileX = startX;
            const usernameX = startX + profileSize + 15;

            // Draw circular profile image
            context.save();
            context.beginPath();
            context.arc(profileX + profileSize / 2, profileY + profileSize / 2, profileSize / 2, 0, Math.PI * 2, true);
            context.closePath();
            context.clip();

            context.drawImage(profileImg, profileX, profileY, profileSize, profileSize);
            context.restore();

            // Draw white border around profile image
            context.strokeStyle = 'white';
            context.lineWidth = 2;
            context.beginPath();
            context.arc(profileX + profileSize / 2, profileY + profileSize / 2, profileSize / 2 + 1, 0, Math.PI * 2, true);
            context.stroke();

            // Add username
            context.fillStyle = 'white';
            context.textAlign = 'left';
            context.fillText(username, usernameX, profileY + (profileSize / 2) + 7);

            resolve(canvas.toDataURL('image/png'));
          };

          // Handle profile image load error
          profileImg.onerror = () => {
            profileImg.src = "/Profile_Image.jpg";
          };
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

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen">
        <main className="pb-16">
          {/* Fixed Navigation */}
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

          {/* Main Content - Centered */}
          <main 
            className={`min-h-screen w-full flex flex-col items-center justify-center p-4 pt-28 relative ${
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
            {bgImage.includes('TheMrSazon') && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0" style={{ 
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${bgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  filter: 'blur(2px)',
                  transform: 'scale(1.1)'  // Prevent blur edges from showing
                }} />
              </div>
            )}
            <div className="relative z-10 w-full flex flex-col items-center">
              <div className="flex flex-col items-center gap-4 mb-8 w-full max-w-[95%] sm:max-w-sm">
                <AnimatePresence mode="wait">
                  {isInitialState && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="text-2xl text-white font-medium text-center"
                    >
                      Welcome {context?.user?.username ? `@${context.user.username}` : 'User'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Card Component */}
              <Card className="w-[95%] max-w-[500px] sm:max-w-sm overflow-hidden shadow-2xl bg-transparent relative z-10">
                <CardContent className="p-6 sm:p-4">
                  {/* GIF Display */}
                  <AnimatePresence mode="wait">
                    {gifUrl && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mb-6 rounded-lg overflow-hidden cursor-pointer relative group"
                        onClick={handleRegenerateGif}
                      >
                        <div className="relative w-full h-[250px] sm:h-[200px]">
                          <Image
                            src={gifUrl}
                            alt="Quote-related GIF"
                            fill
                            unoptimized
                            sizes="(max-width: 600px) 100vw, 50vw"
                            className={`object-cover rounded-lg transition-opacity duration-200 ${
                              isLoading ? 'opacity-50' : 'opacity-100'
                            }`}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              Click to regenerate GIF
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Quote Display */}
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={quote}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -50 }}
                      transition={{ duration: 0.5 }}
                      className="rounded-lg p-6 mb-6 min-h-[150px] flex items-center justify-center relative"
                      onDoubleClick={handleQuoteDoubleTap}
                      onTouchStart={(e) => {
                        const now = Date.now();
                        if (now - lastTapTime < 300) {  // 300ms between taps
                          handleQuoteDoubleTap();
                        }
                        setLastTapTime(now);
                      }}
                    >
                      <p className="text-center text-white text-2xl font-medium select-none">
                        {quote || ""}
                      </p>
                      <AnimatePresence>
                        {showHeartAnimation && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          >
                            <Heart className="w-24 h-24 text-pink-500 fill-pink-500" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </AnimatePresence>

                  {/* Action Buttons */}
                  <motion.div 
                    className="mb-4 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-4">
                      {quote && (
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
                          className={`w-5 h-5 cursor-pointer hover:scale-125 transition-transform ${
                            favorites.some(fav => fav.text === quote)
                              ? 'fill-pink-500 text-pink-500' 
                              : 'text-white hover:text-pink-200'
                          }`}
                        />
                      )}
                      <motion.div
                        whileTap={{ rotate: 360, scale: 0.8 }}
                        transition={{ 
                          type: "spring",
                          duration: 0.5,
                          bounce: 0.5
                        }}
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
                          className={`w-5 h-5 cursor-pointer hover:scale-125 transition-transform ${
                            isGenerating ? 'opacity-50' : 'text-white hover:text-blue-200'
                          }`}
                        />
                      </motion.div>
                    </div>
                    {quote && (
                      <Upload
                        onClick={async () => {
                          try {
                            setIsGeneratingPreview(true);
                            const dataUrl = await generateQuoteImage(quote, bgImage, context);
                            setPreviewImage(dataUrl);
                            setShowPreview(true);
                          } catch (error) {
                            console.error('Error generating preview:', error);
                            toast.error('Failed to generate preview');
                          } finally {
                            setIsGeneratingPreview(false);
                          }
                        }}
                        className="w-5 h-5 cursor-pointer hover:scale-125 transition-transform text-white hover:text-green-200"
                      />
                    )}
                  </motion.div>

                  {/* Input Field */}
                  <div className="mb-6 relative">
                    <Input
                      type="text"
                      placeholder="Enter a topic/word for your quote"
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full text-lg placeholder:text-white/70 text-white bg-transparent border-white/20 pr-12"
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
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  {/* Remove the Cast Away button section entirely */}
                </CardFooter>
              </Card>
            </div>
          </main>

          {/* History Page */}
          {showHistory && (
            <div className="fixed inset-0 bg-black z-40">
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
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="bg-white/10 rounded-lg p-4 cursor-pointer hover:bg-white/20 transition-colors"
                          onClick={() => {
                            setQuote(item.text);
                            setGifUrl(item.gifUrl);
                            setShowHistory(false);
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
            <div className="fixed inset-0 bg-black z-40">
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
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 120 }}
              className="fixed inset-0 bg-black z-50"
            >
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
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
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
                          <Image
                            src={bg.path}
                            alt={bg.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 33vw"
                            unoptimized
                          />
                        )}
                        {bgImage === bg.path && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
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
            </motion.div>
          )}

          {/* Settings Page */}
          {showSettings && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 120 }}
              className="fixed inset-0 bg-black z-50"
            >
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
                        <span className="text-white/60">1.1.1</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Share Preview Modal */}
          {showPreview && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => {
                setShowPreview(false);
                setPreviewImage(null);
              }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl p-6 max-w-lg w-full m-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Preview Share
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      className="rounded-full h-7 w-7 p-0"
                      onClick={() => {
                        setShowPreview(false);
                        setPreviewImage(null);
                      }}
                    >
                      <X className="h-4 w-4 text-black" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Preview Area */}
                  <div className="rounded-lg overflow-hidden bg-gray-100 aspect-[2/1] relative">
                    {isGeneratingPreview ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-purple-600 text-sm"
                        >
                          Generating preview...
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

                  {/* Share Button */}
                  <div className="flex justify-end">
                    <div className="flex gap-2 w-full">
                      <Button
                        onClick={async () => {
                          setIsCasting(true);
                          try {
                            const shareText = `"${quote}" - Created by @kite /thepod`;
                            const shareUrl = 'https://qg-frames.vercel.app';
                            let mediaUrl = '';
                            
                            if (gifUrl) {
                              mediaUrl = gifUrl;
                            }

                            const params = new URLSearchParams();
                            params.append('text', shareText);
                            params.append('embeds[]', shareUrl);
                            if (mediaUrl) {
                              params.append('embeds[]', mediaUrl);
                            }
                            
                            const url = `https://warpcast.com/~/compose?${params.toString()}`;
                            
                            logAnalyticsEvent('cast_created', {
                              quote: quote,
                              hasMedia: !!mediaUrl,
                              mediaType: 'gif'
                            });
                            
                            sdk.actions.openUrl(url);
                            setShowPreview(false);
                            setPreviewImage(null);
                          } catch (error) {
                            console.error('Error sharing:', error);
                          } finally {
                            setIsCasting(false);
                          }
                        }}
                        disabled={!gifUrl || isCasting}
                        className="!flex-1 !bg-purple-600 !text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2 !hover:scale-100 !hover:bg-purple-700 !hover:bg-opacity-100 !hover:bg-purple-700"
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
                            Share GIF
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            setIsGeneratingPreview(true);
                            // Generate the image first
                            const dataUrl = await generateQuoteImage(quote, bgImage, context);
                            // Show the preview immediately
                            setPreviewImage(dataUrl);
                            
                            // Then start the upload process
                            setIsCasting(true);
                            const uploadedUrl = await uploadImage(dataUrl);
                            const shareText = `"${quote}" - Created by @kite /thepod`;
                            const shareUrl = 'https://qg-frames.vercel.app';
                            
                            const params = new URLSearchParams();
                            params.append('text', shareText);
                            params.append('embeds[]', shareUrl);
                            params.append('embeds[]', uploadedUrl);
                            
                            const url = `https://warpcast.com/~/compose?${params.toString()}`;
                            
                            logAnalyticsEvent('cast_created', {
                              quote: quote,
                              hasMedia: true,
                              mediaType: 'canvas'
                            });
                            
                            sdk.actions.openUrl(url);
                            setShowPreview(false);
                            setPreviewImage(null);
                          } catch (error) {
                            console.error('Error sharing:', error);
                            toast.error('Failed to share quote. Please try again.');
                          } finally {
                            setIsGeneratingPreview(false);
                            setIsCasting(false);
                          }
                        }}
                        disabled={isCasting}
                        className="!flex-1 !bg-purple-600 !text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2 !hover:scale-100 !hover:bg-purple-700 !hover:bg-opacity-100 !hover:bg-purple-700"
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
                            <Frame className="w-4 h-4" />
                            Share Image
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
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
            <div className="fixed inset-0 bg-black z-40">
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
            <div className="fixed inset-0 bg-black z-50">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (context?.user?.fid) {
                          saveOnboardingData(context.user.fid, onboarding.personalInfo);
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
                        This helps us generate quotes that matches your taste and personality.
                      </motion.p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {['casual', 'direct', 'eloquent', 'poetic', 'humorous', 'spiritual', 'philosophical'].map((style, index) => (
                        <motion.button
                          key={style}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                          onClick={() => {
                            setOnboarding(prev => ({
                              ...prev,
                              personalInfo: {
                                ...prev.personalInfo,
                                preferredQuoteStyle: style
                              }
                            }));
                            toast.success('Quote style updated');
                          }}
                          className={`px-4 py-3 rounded-lg capitalize flex items-center justify-between ${
                            onboarding.personalInfo.preferredQuoteStyle === style
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          <span>{style}</span>
                          {onboarding.personalInfo.preferredQuoteStyle === style && (
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
                        saveOnboardingData(context.user.fid, onboarding.personalInfo);
                        toast.success('Style saved successfully');
                      }
                    }}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Save Style
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Areas to Improve Page */}
          {showAreasPage && (
            <div className="fixed inset-0 bg-black z-50">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (context?.user?.fid) {
                          saveOnboardingData(context.user.fid, onboarding.personalInfo);
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
                        Select the areas in your life you'd like to focus on.<br/><br/>
                        We'll generate quotes that inspire and motivate you in these specific areas.
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
                        saveOnboardingData(context.user.fid, onboarding.personalInfo);
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
            <div className="fixed inset-0 bg-black z-50">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (context?.user?.fid) {
                          saveOnboardingData(context.user.fid, onboarding.personalInfo);
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
                        saveOnboardingData(context.user.fid, onboarding.personalInfo);
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
        <BottomNav 
          activeSection={activeSection} 
          onNavigate={handleNavigation} 
        />
      </div>
    </ErrorBoundary>
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
  context: FrameContext | undefined;
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
