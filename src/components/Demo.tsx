/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

// 1. Imports
import { Share2, Sparkles } from 'lucide-react';
import { useEffect, useCallback, useState } from "react";
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import sdk, { FrameNotificationDetails, type FrameContext } from "@farcaster/frame-sdk";
import { signIn, signOut, getCsrfToken, useSession } from "next-auth/react";
import { SignIn as SignInCore } from "@farcaster/frame-core";
import type { SignInResult } from "@farcaster/frame-core/dist/actions/signIn";
import { logEvent, setUserProperties } from "firebase/analytics";

// UI Components
import { Input } from "../components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "~/components/ui/Button";

// Utils and Services
import { generateQuote } from '../app/actions';
import { getGifForQuote } from '../app/utils/giphy';
import { app, analytics } from '~/lib/firebase';

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

// 4. Main Component
export default function Demo({ title = "Fun Quotes" }) {
  // State declarations
  const [quote, setQuote] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bgColor, setBgColor] = useState(getRandomColor());
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<FrameContext>();
  const [isCasting, setIsCasting] = useState(false);
  const [sessionStartTime] = useState(Date.now());

  // Frame-specific state
  const [added, setAdded] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState<FrameNotificationDetails | null>(null);
  const [lastEvent, setLastEvent] = useState("");
  const [addFrameResult, setAddFrameResult] = useState("");
  const [sendNotificationResult, setSendNotificationResult] = useState("");

  // 5. Analytics Functions
  const logAnalyticsEvent = useCallback((eventName: string, params: AnalyticsParams) => {
    if (analytics) {
      logEvent(analytics, eventName, params);
      console.log('Analytics Event:', { eventName, params });
    }
  }, []);

  // 6. Frame SDK Functions
  const initializeFrameSDK = useCallback(async () => {
    try {
      const context = await sdk.context;
      if (!context) {
        console.log('No context available');
        return;
      }
      
      setContext(context);
      if (context.client) {
        setAdded(context.client.added);
      }

      // Setup Frame event listeners
      sdk.on("frameAdded", ({ notificationDetails }) => {
        setLastEvent(`frameAdded${!!notificationDetails ? ", notifications enabled" : ""}`);
        setAdded(true);
        if (notificationDetails) {
          setNotificationDetails(notificationDetails);
        }
      });

      // ... rest of your event listeners

      sdk.actions.ready({});
    } catch (error) {
      console.error('Error loading Frame SDK context:', error);
    }
  }, []);

  // 7. Quote Generation Functions
  const handleGenerateQuote = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      // Reset states and generate quote
      setGifUrl(null);
      const quoteResponse = await generateQuote(userPrompt);
      
      if (quoteResponse) {
        setQuote(quoteResponse.text.slice(0, MAX_CHARS));
        setBgColor(getRandomColor());
        
        // Get matching GIF
        const gifUrl = await getGifForQuote(quoteResponse.text, quoteResponse.style);
        setGifUrl(gifUrl);
        
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
      initializeFrameSDK();
    }
  }, [isSDKLoaded, initializeFrameSDK]);

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

  // 9. Render Loading State
  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  // 10. Main Render
  return (
    <div className="mx-auto">
      <div className="min-h-screen flex flex-col">
        <div className="min-h-screen w-full grid place-items-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-3">
          {/* Navigation */}
          <nav className="top-0 left-0 w-full bg-transparent">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-center items-center">
                <div className="flex-shrink-0">
                  <Image
                    src="/logo.png"
                    alt="FunQuoteLogo"
                    width={60}
                    height={60}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </nav>

          {/* Main Card */}
          <Card className="w-full max-w-md mx-4 overflow-hidden shadow-2xl">
            <CardHeader className="bg-white">
              <CardTitle className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                Fun Quote Generator
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6">
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
                  className="rounded-lg p-6 mb-6 shadow-inner min-h-[150px] flex items-center justify-center"
                  style={{ backgroundColor: bgColor }}
                >
                  <p className="text-center text-white text-lg font-medium">
                    {quote || "Click the magic button to generate an inspiring quote!"}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Input Field */}
              <div className="mb-6">
                <Input
                  type="text"
                  placeholder="Enter a topic/word for your quote"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full text-lg"
                />
              </div>
            </CardContent>

            {/* Action Buttons */}
            <CardFooter className="flex flex-col gap-4">
              <motion.div className="w-full"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={handleGenerateQuote} 
                  disabled={isLoading}
                  className="w-full text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      Generating
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="ml-2"
                      >
                        ...
                      </motion.span>
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Generate Magic Quote <Sparkles className="ml-2" size={20} />
                    </span>
                  )}
                </Button>
              </motion.div>

              {/* Cast Button */}
              {quote && (
                <motion.div className="w-full"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={() => {
                      setIsCasting(true);
                      try {
                        const shareText = `"${quote}" - Created by @kite /thepod`;
                        const shareUrl = 'https://qg-frames.vercel.app';
                        const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}${gifUrl ? `&embeds[]=${encodeURIComponent(gifUrl)}` : ''}`;
                        
                        logAnalyticsEvent('cast_created', {
                          quote: quote
                        });
                        
                        sdk.actions.openUrl(url);
                      } finally {
                        setIsCasting(false);
                      }
                    }}
                    className="w-full text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center"
                  >
                    {isCasting ? (
                      <span className="flex items-center">
                        Casting
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          className="ml-2"
                        >
                          ...
                        </motion.span>
                      </span>
                    ) : (
                      <span className="flex items-center">
                        Cast Away <Share2 className="ml-2" size={20} />
                      </span>
                    )}
                  </Button>
                </motion.div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
