/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

// 1. Imports
import { Share2, Sparkles, Heart, History, X, Palette, Check, Settings, Download } from 'lucide-react';
import { useEffect, useCallback, useState, useRef } from "react";
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import sdk, { FrameNotificationDetails, type FrameContext } from "@farcaster/frame-sdk";
import { logEvent, setUserProperties } from "firebase/analytics";
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
  getGifPreference
} from '../lib/firestore';

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

interface QuoteHistoryItem {
  text: string;
  style: string;
  gifUrl: string | null;
  timestamp: Date;
  bgColor: string;
}

interface FavoriteQuote extends QuoteHistoryItem {
  id: string;
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
const getStorageKey = (fid: number) => `funquotes_history_${fid}`;
const getFavoritesKey = (fid: number) => `funquotes_favorites_${fid}`;

// Add these interfaces at the top with other interfaces
interface StoredQuoteHistoryItem extends Omit<QuoteHistoryItem, 'timestamp'> {
  timestamp: string;
}

interface StoredFavoriteQuote extends Omit<FavoriteQuote, 'timestamp'> {
  timestamp: string;
}

// Add this function before the Demo component
const generateQuoteImage = async (quote: string, bgImage: string, userContext?: FrameContext): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Set canvas size
      canvas.width = 800;
      canvas.height = 400;

      // Create and load background image
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';

      // Create profile image element
      const profileImg = document.createElement('img');
      profileImg.crossOrigin = 'anonymous';
      profileImg.src = userContext?.user?.pfpUrl || "/Profile_Image.jpg";

      const handleLoad = () => {
        if (bgImage === 'none') {
          // Create gradient background
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#9b5de5');
          gradient.addColorStop(0.5, '#f15bb5');
          gradient.addColorStop(1, '#ff6b6b');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          // Calculate dimensions to cover the entire canvas while maintaining aspect ratio
          const imgAspectRatio = img.width / img.height;
          const canvasAspectRatio = canvas.width / canvas.height;
          let drawWidth = canvas.width;
          let drawHeight = canvas.height;
          let offsetX = 0;
          let offsetY = 0;

          if (imgAspectRatio > canvasAspectRatio) {
            // Image is wider - scale based on height and center horizontally
            drawHeight = canvas.height;
            drawWidth = drawHeight * imgAspectRatio;
            offsetX = (canvas.width - drawWidth) / 2;
          } else {
            // Image is taller - scale based on width and center vertically
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
        }

        // Add quote text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 32px Inter, sans-serif';
        
        // Word wrap the text
        const words = quote.split(' ');
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
        const startY = (canvas.height - totalHeight) / 2 - 20; // Move quote up to make room for profile

        lines.forEach((line, index) => {
          ctx.fillText(line.trim(), canvas.width / 2, startY + (index * lineHeight));
        });

        // Draw profile image and username
        const profileSize = 40;
        const profileY = canvas.height - 70; // Position from bottom
        const username = `@${userContext?.user?.username || 'user'}`;
        
        // Measure text width to calculate total width of profile + username
        ctx.font = '20px Inter, sans-serif';
        const textMetrics = ctx.measureText(username);
        const totalWidth = profileSize + 15 + textMetrics.width; // profile width + gap + text width
        
        // Calculate starting X position to center everything
        const startX = (canvas.width - totalWidth) / 2;
        const profileX = startX;
        const usernameX = startX + profileSize + 15;

        // Draw circular profile image
        ctx.save();
        ctx.beginPath();
        ctx.arc(profileX + profileSize / 2, profileY + profileSize / 2, profileSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        // Draw the profile image
        ctx.drawImage(profileImg, profileX, profileY, profileSize, profileSize);
        ctx.restore();

        // Draw white border around profile image
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(profileX + profileSize / 2, profileY + profileSize / 2, profileSize / 2 + 1, 0, Math.PI * 2, true);
        ctx.stroke();

        // Add username next to profile image
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.fillText(username, usernameX, profileY + (profileSize / 2) + 7);

        resolve(canvas.toDataURL('image/png'));
      };

      // Load profile image first, then proceed with the rest
      profileImg.onload = () => {
        if (bgImage === 'none') {
          handleLoad();
        } else {
          img.onload = handleLoad;
          img.src = bgImage;
        }
      };

      profileImg.onerror = () => {
        // If profile image fails, use default image
        profileImg.src = "/Profile_Image.jpg";
      };

      img.onerror = (_event: string | Event) => {
        reject(new Error('Failed to load image'));
      };
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

  // Add new state for download preview
  const [showDownloadPreview, setShowDownloadPreview] = useState(false);
  const [downloadPreviewImage, setDownloadPreviewImage] = useState<string | null>(null);
  const [isGeneratingDownloadPreview, setIsGeneratingDownloadPreview] = useState(false);

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
  }, [isSDKLoaded, setAdded, setNotificationDetails, setLastEvent]);

  // 7. Quote Generation Functions
  const handleGenerateQuote = async () => {
    setIsInitialState(false);
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      setGifUrl(null);
      const quoteResponse = await generateQuote(userPrompt);
      
      if (quoteResponse) {
        const newQuote = quoteResponse.text.slice(0, MAX_CHARS);
        setQuote(newQuote);
        
        if (gifEnabled) {
          const gifUrl = await getGifForQuote(quoteResponse.text, quoteResponse.style);
          setGifUrl(gifUrl);
        }
        
        // Add to history
        setQuoteHistory(prev => [{
          text: newQuote,
          style: quoteResponse.style,
          gifUrl: gifEnabled ? gifUrl : null,
          timestamp: new Date(),
          bgColor
        }, ...prev.slice(0, 9)]); // Keep last 10 quotes
        
        logAnalyticsEvent('quote_generated_success', {
          prompt: userPrompt || 'empty_prompt',
          quote_length: quoteResponse.text.length
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
  };

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

  const handleRegenerateGif = async () => {
    if (!quote || isLoading) return;
    setIsLoading(true);
    
    try {
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
      console.error('Error regenerating GIF:', error);
      logAnalyticsEvent('gif_regenerated_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReuseQuote = (item: QuoteHistoryItem) => {
    setQuote(item.text);
    setBgColor(item.bgColor);
    setGifUrl(item.gifUrl);
    setShowHistory(false);
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

  // Replace localStorage save effects with Firestore saves
  useEffect(() => {
    const saveQuote = async () => {
      if (context?.user?.fid && quoteHistory.length > 0) {
        const latestQuote = quoteHistory[0];
        await saveQuoteToHistory(context.user.fid, latestQuote);
      }
    };

    saveQuote();
  }, [quoteHistory, context?.user?.fid]);

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

  // 10. Main Render
  return (
    <div className="relative min-h-screen">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 w-full bg-transparent/10 backdrop-blur-sm z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Left side - Logo */}
            <div className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="FunQuoteLogo"
                width={60}
                height={60}
                className="object-contain"
              />
            </div>

            {/* Right side - Profile Image with Dropdown */}
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="cursor-pointer transition-transform hover:scale-105">
                    <div className="relative w-[45px] h-[45px] rounded-full border-2 border-white shadow-lg overflow-hidden">
                      <Image
                        src={context?.user?.pfpUrl || "/Profile_Image.jpg"}
                        alt={context?.user?.displayName || "Profile"}
                        width={45}
                        height={45}
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
                    <div className="px-2 py-1.5 text-sm">
                      <div className="font-medium">{context.user.displayName}</div>
                      <div className="text-xs text-muted-foreground">@{context.user.username}</div>
                    </div>
                  )}
                  <DropdownMenuItem 
                    className="flex items-center gap-2"
                    onClick={() => setShowFavorites(true)}
                  >
                    <Heart className="w-4 h-4 text-pink-500" />
                    <div className="flex flex-col">
                      <span>Favorites</span>
                      <span className="text-[10px] text-gray-400">
                        {favorites.length} saved
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center gap-2"
                    onClick={() => setShowHistory(true)}
                  >
                    <History className="w-4 h-4" />
                    <span>History</span>
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
        className={`min-h-screen w-full flex flex-col items-center justify-center p-4 pt-24 relative ${
          bgImage === 'none' ? 'bg-gradient-to-br from-purple-400 via-pink-500 to-red-500' : ''
        }`}
        style={bgImage !== 'none' ? {
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {}}
      >
        <AnimatePresence mode="wait">
          {isInitialState && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-8 text-2xl text-white font-medium text-center"
            >
              Welcome {context?.user?.username ? `@${context.user.username}` : 'User'}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Card Component */}
        <Card className="w-full max-w-sm overflow-hidden shadow-2xl bg-transparent relative z-10">
          <CardContent className="p-4">
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
                  <div className="relative w-full h-[200px]">
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
                className="rounded-lg p-6 mb-6 min-h-[150px] flex items-center justify-center"
              >
                <p className="text-center text-white text-2xl font-medium">
                  {quote || "Click the magic button to generate an inspiring quote!"}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Action Buttons */}
            {quote && (
              <motion.div 
                className="mb-4 flex justify-between items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Heart 
                  onClick={() => {
                    const quoteItem: QuoteHistoryItem = {
                      text: quote,
                      style: 'default',
                      gifUrl,
                      timestamp: new Date(),
                      bgColor
                    };
                    toggleFavorite(quoteItem);
                  }}
                  className={`w-5 h-5 transition-transform hover:scale-125 cursor-pointer ${
                    favorites.some(fav => fav.text === quote)
                      ? 'fill-pink-500 text-pink-500' 
                      : 'text-white hover:text-pink-200'
                  }`}
                />
                <div className="flex gap-4">
                  {quote && (
                    <Download
                      onClick={async () => {
                        setShowDownloadPreview(true);
                        setIsGeneratingDownloadPreview(true);
                        try {
                          const dataUrl = await generateQuoteImage(quote, bgImage, context);
                          setDownloadPreviewImage(dataUrl);
                        } catch (error) {
                          console.error('Error generating preview:', error);
                        } finally {
                          setIsGeneratingDownloadPreview(false);
                        }
                      }}
                      className="h-5 w-5 text-white transition-transform hover:scale-125 cursor-pointer"
                    />
                  )}
                  {isCasting ? (
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="text-white"
                    >
                      •••
                    </motion.span>
                  ) : (
                    <Share2 
                      onClick={async () => {
                        setShowPreview(true);
                        if (!gifEnabled) {
                          setIsGeneratingPreview(true);
                          try {
                            const dataUrl = await generateQuoteImage(quote, bgImage, context);
                            setPreviewImage(dataUrl);
                          } catch (error) {
                            console.error('Error generating preview:', error);
                          } finally {
                            setIsGeneratingPreview(false);
                          }
                        }
                      }}
                      className="h-5 w-5 text-white transition-transform hover:scale-125 cursor-pointer"
                    />
                  )}
                </div>
              </motion.div>
            )}

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
                  className="invert brightness-0"
                  unoptimized
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {/* Remove the Cast Away button section entirely */}
          </CardFooter>
        </Card>
      </main>

      {/* History Modal */}
      {showHistory && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowHistory(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Quote History
              </h2>
              <div className="flex items-center gap-1">
                {quoteHistory.length > 0 && (
                  <Button
                    onClick={handleClearHistory}
                    disabled={isClearing}
                    className="text-purple-600 hover:text-red-500 transition-colors text-xs min-w-[32px] h-5 px-1 flex items-center justify-center"
                  >
                    {isClearing ? (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-xs text-purple-600"
                      >
                        •••
                      </motion.span>
                    ) : (
                      <span className="text-purple-600">
                        Clear
                      </span>
                    )}
                  </Button>
                )}
                <Button
                  className="rounded-full h-7 w-3 p-0 flex items-center justify-center"
                  onClick={() => setShowHistory(false)}
                >
                  <X className="h-4 w-4 text-black" />
                </Button>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-4 pr-2">
              {quoteHistory.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-gray-500 py-12"
                >
                  <div className="mb-4">✨</div>
                  <p className="font-medium">No quotes generated yet</p>
                  <p className="text-sm mt-2 text-gray-400">
                    Your generated quotes will appear here
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {quoteHistory.map((item, index) => (
                    <motion.div
                      key={item.timestamp.toString()}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="group rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300"
                      onClick={() => handleReuseQuote(item)}
                    >
                      <div 
                        className="p-4 cursor-pointer"
                        style={{ backgroundColor: item.bgColor }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-white font-medium flex-1">{item.text}</p>
                          <span className="text-xs text-white/70 ml-2">
                            {formatTimestamp(item.timestamp)}
                          </span>
                        </div>
                        
                        {item.gifUrl && (
                          <div className="relative h-32 mt-3 rounded-md overflow-hidden">
                            <Image
                              src={item.gifUrl}
                              alt="Quote GIF"
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                              unoptimized
                            />
                          </div>
                        )}
                        
                        <div className="mt-3 flex items-center gap-2 text-white/80">
                          <span className="text-xs">Click to reuse</span>
                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            →
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Favorites Modal */}
      {showFavorites && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowFavorites(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Favorite Quotes
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  className="rounded-full h-7 w-3 p-0 flex items-center justify-center"
                  onClick={() => setShowFavorites(false)}
                >
                  <X className="h-4 w-4 text-black" />
                </Button>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-4 pr-2">
              {favorites.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-gray-500 py-12"
                >
                  <div className="mb-4">💖</div>
                  <p className="font-medium">No favorites yet</p>
                  <p className="text-sm mt-2 text-gray-400">
                    Your favorite quotes will appear here
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {favorites.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="group rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300"
                      onClick={() => handleReuseQuote(item)}
                    >
                      <div 
                        className="p-4 cursor-pointer"
                        style={{ backgroundColor: item.bgColor }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-white font-medium flex-1">{item.text}</p>
                          <span className="text-xs text-white/70 ml-2">
                            {formatTimestamp(item.timestamp)}
                          </span>
                        </div>
                        
                        {item.gifUrl && (
                          <div className="relative h-32 mt-3 rounded-md overflow-hidden">
                            <Image
                              src={item.gifUrl}
                              alt="Quote GIF"
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                              unoptimized
                            />
                          </div>
                        )}
                        
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-white/80">
                            <span className="text-xs">Click to reuse</span>
                            <motion.div
                              animate={{ x: [0, 5, 0] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              →
                            </motion.div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(item);
                            }}
                            className="text-white/80 hover:text-pink-500 transition-colors"
                          >
                            <Heart className="w-5 h-5 fill-current" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Theme Menu Modal */}
      {showThemeMenu && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowThemeMenu(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Choose Background
              </h2>
              <Button
                className="rounded-full h-7 w-7 p-0 flex items-center justify-center"
                onClick={() => setShowThemeMenu(false)}
              >
                <X className="h-4 w-4 text-black" />
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
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
                  id: 'gradient',
                  name: 'Gradient',
                  path: 'gradient',
                  isGradient: true
                }
              ].map((bg) => (
                <div
                  key={bg.id}
                  onClick={() => {
                    if (bg.isGradient) {
                      setBgImage('none');
                    } else {
                      setBgImage(bg.path);
                    }
                  }}
                  className={`relative h-40 rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 overflow-hidden ${
                    (bg.isGradient ? bgImage === 'none' : bgImage === bg.path) ? 'ring-4 ring-purple-600 ring-offset-2' : ''
                  }`}
                >
                  {bg.isGradient ? (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 via-pink-500 to-red-500" />
                  ) : (
                    <Image
                      src={bg.path}
                      alt={bg.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized
                    />
                  )}
                  {(bg.isGradient ? bgImage === 'none' : bgImage === bg.path) && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-center text-sm">
                    {bg.name}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowSettings(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Settings
              </h2>
              <Button
                className="rounded-full h-7 w-7 p-0 flex items-center justify-center"
                onClick={() => setShowSettings(false)}
              >
                <X className="h-4 w-4 text-black" />
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* GIF Toggle Option */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 mr-4">
                  <h3 className="font-medium text-gray-900">GIF Generation</h3>
                  <p className="text-sm text-gray-500">Toggle automatic GIF generation</p>
                </div>
                <Button
                  onClick={handleGifToggle}
                  className={`${
                    gifEnabled 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-gray-400 hover:bg-gray-500'
                  } text-white w-20 text-sm flex items-center justify-center`}
                >
                  {gifEnabled ? 'On' : 'Off'}
                </Button>
              </div>

              <div className="h-px bg-gray-200" />

              {/* Clear History Option */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 mr-4">
                  <h3 className="font-medium text-gray-900">Clear History</h3>
                  <p className="text-sm text-gray-500">Remove all generated quotes</p>
                </div>
                <Button
                  onClick={handleClearHistory}
                  disabled={isClearing}
                  className="bg-red-500 hover:bg-red-600 text-white w-20 text-sm"
                >
                  Clear
                </Button>
              </div>

              {/* Clear Favorites Option */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 mr-4">
                  <h3 className="font-medium text-gray-900">Clear Favorites</h3>
                  <p className="text-sm text-gray-500">Remove all favorite quotes</p>
                </div>
                <Button
                  onClick={() => {
                    if (context?.user?.fid) {
                      setFavorites([]);
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white w-20 text-sm"
                >
                  Clear
                </Button>
              </div>

              {/* Version Info */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 mr-4">
                  <h3 className="font-medium text-gray-900">Version</h3>
                  <p className="text-sm text-gray-500">Current app version</p>
                </div>
                <span className="text-sm text-gray-500 w-20 text-right">1.0.0</span>
              </div>
            </div>
          </motion.div>
        </div>
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
              <Button
                className="rounded-full h-7 w-7 p-0 flex items-center justify-center"
                onClick={() => {
                  setShowPreview(false);
                  setPreviewImage(null);
                }}
              >
                <X className="h-4 w-4 text-black" />
              </Button>
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
                <Button
                  onClick={async () => {
                    setIsCasting(true);
                    try {
                      const shareText = `"${quote}" - Created by @kite /thepod`;
                      const shareUrl = 'https://qg-frames.vercel.app';
                      let mediaUrl = '';

                      if (gifEnabled && gifUrl) {
                        // If GIF is enabled and available, use it
                        mediaUrl = gifUrl;
                      } else if (quote) {
                        // Generate and upload the canvas image
                        try {
                          const dataUrl = await generateQuoteImage(quote, bgImage, context);
                          mediaUrl = await uploadImage(dataUrl);
                        } catch (error) {
                          console.error('Error generating/uploading image:', error);
                        }
                      }

                      const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}${mediaUrl ? `&embeds[]=${encodeURIComponent(mediaUrl)}` : ''}`;
                      
                      logAnalyticsEvent('cast_created', {
                        quote: quote,
                        hasMedia: !!mediaUrl,
                        mediaType: gifEnabled && gifUrl ? 'gif' : 'canvas'
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
                  disabled={false}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                >
                  {isCasting ? (
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      •••
                    </motion.span>
                  ) : 'Share'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Download Preview Modal */}
      {showDownloadPreview && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => {
            setShowDownloadPreview(false);
            setDownloadPreviewImage(null);
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
                Download Preview
              </h2>
              <Button
                className="rounded-full h-7 w-7 p-0 flex items-center justify-center"
                onClick={() => {
                  setShowDownloadPreview(false);
                  setDownloadPreviewImage(null);
                }}
              >
                <X className="h-4 w-4 text-black" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Preview Area */}
              <div className="rounded-lg overflow-hidden bg-gray-100 aspect-[2/1] relative">
                {isGeneratingDownloadPreview ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-purple-600 text-sm"
                    >
                      Generating preview...
                    </motion.div>
                  </div>
                ) : downloadPreviewImage ? (
                  <Image
                    src={downloadPreviewImage}
                    alt="Download Preview"
                    width={800}
                    height={400}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                ) : null}
              </div>

              {/* Download Button */}
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    try {
                      if (downloadPreviewImage) {
                        // Convert base64 to blob with explicit MIME type
                        const base64Response = await fetch(downloadPreviewImage);
                        const blob = await base64Response.blob();
                        
                        // Create a Blob URL
                        const blobUrl = URL.createObjectURL(
                          new Blob([blob], { type: 'image/png' })
                        );
                        
                        // For mobile devices, open in new tab
                        if (/Mobi|Android/i.test(navigator.userAgent)) {
                          window.open(blobUrl, '_blank');
                        } else {
                          // For desktop, trigger download
                          const a = document.createElement('a');
                          a.href = blobUrl;
                          a.download = 'quote-image.png';
                          a.style.display = 'none';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }
                        
                        // Cleanup
                        setTimeout(() => {
                          URL.revokeObjectURL(blobUrl);
                        }, 100);
                        
                        // Close modal after download
                        setShowDownloadPreview(false);
                        setDownloadPreviewImage(null);
                      }
                    } catch (error) {
                      console.error('Error downloading:', error);
                    }
                  }}
                  disabled={!downloadPreviewImage}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                >
                  Download
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
