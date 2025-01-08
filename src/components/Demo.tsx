/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Share2 } from 'lucide-react'
import { useEffect, useCallback, useState, useMemo, KeyboardEvent } from "react";
import { signIn, signOut, getCsrfToken } from "next-auth/react";
import sdk, {
  FrameNotificationDetails,
  type FrameContext,
} from "@farcaster/frame-sdk";
import {
  useAccount,
  useSendTransaction,
  useSignMessage,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useDisconnect,
  useConnect,
  useSwitchChain,
  useChainId,
} from "wagmi";

import { Input } from "../components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { generateQuote } from '../app/actions'
import { Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getGifForQuote } from '../app/utils/giphy'
import Image from 'next/image'

import { config } from "~/components/providers/WagmiProvider";
import { Button } from "~/components/ui/Button";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { BaseError, UserRejectedRequestError } from "viem";
import { useSession } from "next-auth/react"
import { SignIn as SignInCore } from "@farcaster/frame-core";
import { SignInResult } from "@farcaster/frame-core/dist/actions/signIn";
import { app, analytics } from '~/lib/firebase';
import { logEvent, setUserProperties } from "firebase/analytics";

const MAX_CHARS = 280 // Maximum character limit for the quote

const getRandomColor = () => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F06292', '#AEC6CF', '#836FFF', '#77DD77', '#FFB347']
  return colors[Math.floor(Math.random() * colors.length)]
}

// Add type for analytics events
type AnalyticsParams = {
  [key: string]: string | number | boolean | undefined;
};

export default function Demo(
  { title }: { title?: string } = { title: "Fun Quotes" }
) {
  const [quote, setQuote] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [bgColor, setBgColor] = useState(getRandomColor())
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<FrameContext>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const [added, setAdded] = useState(false);
  const [notificationDetails, setNotificationDetails] =
    useState<FrameNotificationDetails | null>(null);

  const [lastEvent, setLastEvent] = useState("");
  const [addFrameResult, setAddFrameResult] = useState("");
  const [sendNotificationResult, setSendNotificationResult] = useState("");

  const [isCasting, setIsCasting] = useState(false);

  const [sessionStartTime, setSessionStartTime] = useState(Date.now());

  const logAnalyticsEvent = (eventName: string, params: AnalyticsParams) => {
    if (analytics) {
      logEvent(analytics, eventName, params);
      console.log('Analytics Event:', { eventName, params });
    } else {
      console.warn('Analytics not initialized for event:', eventName);
    }
  };

  useEffect(() => {
    if (analytics) {
      // Set user properties with typed parameters
      setUserProperties(analytics, {
        app_version: '1.0.0',
        user_type: 'web'
      });
      
      // Track session start
      logAnalyticsEvent('session_start', {
        timestamp: new Date().toISOString(),
        referrer: document.referrer || 'direct'
      });
    }
  }, [analytics]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (analytics) {
        logAnalyticsEvent('session_duration', {
          duration_seconds: Math.floor((Date.now() - sessionStartTime) / 1000)
        });
      }
    }, 60000); // Log every minute

    return () => clearInterval(interval);
  }, [analytics, sessionStartTime]);

  useEffect(() => {
    setNotificationDetails(context?.client.notificationDetails ?? null);
  }, [context]);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const {
    sendTransaction,
    error: sendTxError,
    isError: isSendTxError,
    isPending: isSendTxPending,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

  const {
    signTypedData,
    error: signTypedError,
    isError: isSignTypedError,
    isPending: isSignTypedPending,
  } = useSignTypedData();

  const { disconnect } = useDisconnect();
  const { connect } = useConnect();

  const {
    switchChain,
    error: switchChainError,
    isError: isSwitchChainError,
    isPending: isSwitchChainPending,
  } = useSwitchChain();

  const handleSwitchChain = useCallback(() => {
    switchChain({ chainId: chainId === base.id ? optimism.id : base.id });
  }, [switchChain, chainId]);

  useEffect(() => {
    const load = async () => {
      try {
        const context = await sdk.context;
        if (!context) {
          console.log('No context available');
          return;
        }
        
        setContext(context);
        // Only set added if context and client exist
        if (context.client) {
          setAdded(context.client.added);
        }

        sdk.on("frameAdded", ({ notificationDetails }) => {
          setLastEvent(
            `frameAdded${!!notificationDetails ? ", notifications enabled" : ""}`
          );

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

        sdk.on("notificationsEnabled", ({ notificationDetails }) => {
          setLastEvent("notificationsEnabled");
          setNotificationDetails(notificationDetails);
        });
        sdk.on("notificationsDisabled", () => {
          setLastEvent("notificationsDisabled");
          setNotificationDetails(null);
        });

        sdk.on("primaryButtonClicked", () => {
          console.log("primaryButtonClicked");
        });

        sdk.actions.ready({});
      } catch (error) {
        console.error('Error loading Frame SDK context:', error);
      }
    };

    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded]);

  const openWarpcastUrl = useCallback(() => {
    sdk.actions.openUrl("https://warpcast.com/~/compose?text=%{encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}");
  }, []);

  const addFrame = useCallback(async () => {
    try {
      setNotificationDetails(null);

      const result = await sdk.actions.addFrame();

      if (result.added) {
        if (result.notificationDetails) {
          setNotificationDetails(result.notificationDetails);
        }
        setAddFrameResult(
          result.notificationDetails
            ? `Added, got notificaton token ${result.notificationDetails.token} and url ${result.notificationDetails.url}`
            : "Added, got no notification details"
        );
      } else {
        setAddFrameResult(`Not added: ${result.reason}`);
      }
    } catch (error) {
      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  const sendNotification = useCallback(async () => {
    setSendNotificationResult("");
    if (!notificationDetails || !context) {
      return;
    }

    try {
      const response = await fetch("/api/send-notification", {
        method: "POST",
        mode: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: context.user.fid,
          notificationDetails,
        }),
      });

      if (response.status === 200) {
        setSendNotificationResult("Success");
        return;
      } else if (response.status === 429) {
        setSendNotificationResult("Rate limited");
        return;
      }

      const data = await response.text();
      setSendNotificationResult(`Error: ${data}`);
    } catch (error) {
      setSendNotificationResult(`Error: ${error}`);
    }
  }, [context, notificationDetails]);

  const toggleContext = useCallback(() => {
    setIsContextOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && analytics) {
      logAnalyticsEvent('page_view', {
        page_title: title || 'Fun Quotes',
        page_location: window.location.href
      });
    }
  }, [title]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  const handleGenerateQuote = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    // Track quote generation attempt
    if (analytics) {
      logAnalyticsEvent('generate_quote_click', {
        prompt: userPrompt || 'empty_prompt'
      });
    }

    try {
      // Reset the previous GIF while loading
      setGifUrl(null);

      // First generate the quote with retry logic
      let generatedQuote = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!generatedQuote && attempts < maxAttempts) {
        try {
          generatedQuote = await generateQuote(userPrompt);
          attempts++;
        } catch (error) {
          if (attempts === maxAttempts) throw error;
          // Wait 1 second before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!generatedQuote) {
        throw new Error('Failed to generate quote after multiple attempts');
      }
      
      setQuote(generatedQuote.slice(0, MAX_CHARS));
      setBgColor(getRandomColor());

      // Track successful quote generation
      if (analytics) {
        logAnalyticsEvent('quote_generated_success', {
          prompt: userPrompt || 'empty_prompt',
          quote_length: generatedQuote.length,
          attempts: attempts
        });
      }

      // GIF fetching with retry logic
      try {
        const moodWords = ['happy', 'excited', 'fun', 'cool', 'amazing', 'awesome', 'wonderful', 'great'];
        const randomMood = moodWords[Math.floor(Math.random() * moodWords.length)];
        const searchQuery = encodeURIComponent(`${generatedQuote.slice(0, 30)} ${randomMood}`);
        
        const fetchGif = async () => {
          const response = await fetch(`/api/giphy?search=${searchQuery}&timestamp=${Date.now()}`, {
            // Add fetch options
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            // Add timeout
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });
          
          if (!response.ok) {
            throw new Error(`GIF API error: ${response.status}`);
          }
          return response.json();
        };

        // Try to fetch GIF with retries
        let gifData = null;
        attempts = 0;
        
        while (!gifData && attempts < maxAttempts) {
          try {
            gifData = await fetchGif();
            attempts++;
          } catch (error) {
            if (attempts === maxAttempts) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (gifData?.data && gifData.data.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(5, gifData.data.length));
          const gifUrl = gifData.data[randomIndex]?.images?.fixed_height?.url;
          setGifUrl(gifUrl || null);
        }
      } catch (gifError) {
        console.error('GIF fetch error:', gifError);
        // Don't throw here - we still have a quote to show
        if (analytics) {
          logAnalyticsEvent('gif_fetch_error', {
            error: gifError instanceof Error ? gifError.message : 'Unknown error'
          });
        }
      }
      
    } catch (error) {
      console.error('Error:', error);
      setQuote('Failed to generate quote. Please try again.');
      setGifUrl(null);
      
      // Track generation failure
      if (analytics) {
        logAnalyticsEvent('quote_generated_error', {
          prompt: userPrompt || 'empty_prompt',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateGif = async () => {
    if (!quote || isLoading) return;
    setIsLoading(true);
    
    // Track GIF regeneration attempt
    if (analytics) {
      logAnalyticsEvent('gif_regenerate_click', {
        quote_text: quote.slice(0, 30) + '...', // First 30 chars of quote for context
        current_gif_url: gifUrl || 'none'
      });
    }

    try {
      // Add randomness to GIF search by including a random word from a curated list
      const moodWords = ['happy', 'excited', 'fun', 'cool', 'amazing', 'awesome', 'wonderful', 'great'];
      const randomMood = moodWords[Math.floor(Math.random() * moodWords.length)];

      // Then fetch the GIF
      const searchQuery = encodeURIComponent(`${quote.slice(0, 30)} ${randomMood}`);
      const response = await fetch(`/api/giphy?search=${searchQuery}&timestamp=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`GIF API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        // Get a random GIF from the first 5 results
        const randomIndex = Math.floor(Math.random() * Math.min(5, data.data.length));
        const gifUrl = data.data[randomIndex]?.images?.fixed_height?.url;
        setGifUrl(gifUrl || null);
      }

      // Track successful GIF regeneration
      if (analytics && gifUrl) {
        logAnalyticsEvent('gif_regenerated_success', {
          quote_text: quote.slice(0, 30) + '...',
          new_gif_url: gifUrl
        });
      }
    } catch (error) {
      console.error('Error:', error);
      // Track GIF regeneration failure
      if (analytics) {
        logAnalyticsEvent('gif_regenerated_error', {
          quote_text: quote.slice(0, 30) + '...',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerateQuote()
    }
  }

  return (
    <div className="mx-auto">
      {/* Main Content */}
      <div className="min-h-screen flex flex-col">
        <div className="min-h-screen w-full grid place-items-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-3">
          {/* Navigation Bar */}
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
        
        {/* Card Content */}
        <Card className="w-full max-w-md mx-4 overflow-hidden shadow-2xl">
          <CardHeader className="bg-white">
            <CardTitle className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Fun Quote Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            
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
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        Click to regenerate GIF
                      </span>
                    </div>
                    {/* Loading overlay */}
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                        <motion.span
                          className="text-white"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        >
                          Loading...
                        </motion.span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
          <CardFooter>
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

          </CardFooter>
          
          <CardFooter>
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
                    
                    if (analytics) {
                      logAnalyticsEvent('cast_created', {
                        quote: quote
                      });
                    }
                    
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
          </CardFooter>
        </Card>
      </div>
    </div>
    </div>
  );
}

function SignMessage() {
  const { isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const {
    signMessage,
    data: signature,
    error: signError,
    isError: isSignError,
    isPending: isSignPending,
  } = useSignMessage();

  const handleSignMessage = useCallback(async () => {
    if (!isConnected) {
      await connectAsync({
        chainId: base.id,
        connector: config.connectors[0],
      });
    }

    signMessage({ message: "Hello from Frames v2!" });
  }, [connectAsync, isConnected, signMessage]);

  return (
    <>
      <Button
        onClick={handleSignMessage}
        disabled={isSignPending}
        isLoading={isSignPending}
      >
        Sign Message
      </Button>
      {isSignError && renderError(signError)}
      {signature && (
        <div className="mt-2 text-xs">
          <div>Signature: {signature}</div>
        </div>
      )}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SendEth() {
  const { isConnected, chainId } = useAccount();
  const {
    sendTransaction,
    data,
    error: sendTxError,
    isError: isSendTxError,
    isPending: isSendTxPending,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: data,
    });

  const toAddr = useMemo(() => {
    // Protocol guild address
    return chainId === base.id
      ? "0x32e3C7fD24e175701A35c224f2238d18439C7dBC"
      : "0xB3d8d7887693a9852734b4D25e9C0Bb35Ba8a830";
  }, [chainId]);

  const handleSend = useCallback(() => {
    sendTransaction({
      to: toAddr,
      value: 1n,
    });
  }, [toAddr, sendTransaction]);

  return (
    <>
      <Button
        onClick={handleSend}
        disabled={!isConnected || isSendTxPending}
        isLoading={isSendTxPending}
      >
        Send Transaction (eth)
      </Button>
      {isSendTxError && renderError(sendTxError)}
      {data && (
        <div className="mt-2 text-xs">
          <div>Hash: {truncateAddress(data)}</div>
          <div>
            Status:{" "}
            {isConfirming
              ? "Confirming..."
              : isConfirmed
              ? "Confirmed!"
              : "Pending"}
          </div>
        </div>
      )}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SignIn() {
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signInResult, setSignInResult] = useState<SignInResult>();
  const [signInFailure, setSignInFailure] = useState<string>();
  const { data: session, status } = useSession()

  const getNonce = useCallback(async () => {
    const nonce = await getCsrfToken();
    if (!nonce) throw new Error("Unable to generate nonce");
    return nonce;
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      setSigningIn(true);
      setSignInFailure(undefined);
      const nonce = await getNonce();
      const result = await sdk.actions.signIn({ nonce });
      setSignInResult(result);

      await signIn("credentials", {
        message: result.message,
        signature: result.signature,
        redirect: false,
      });
    } catch (e) {
      if (e instanceof SignInCore.RejectedByUser) {
        setSignInFailure("Rejected by user");
        return;
      }

      setSignInFailure("Unknown error");
    } finally {
      setSigningIn(false);
    }
  }, [getNonce]);

  const handleSignOut = useCallback(async () => {
    try {
      setSigningOut(true);
      await signOut({ redirect: false }) 
      setSignInResult(undefined);
    } finally {
      setSigningOut(false);
    }
  }, []);

  return (
    <>
      {status !== "authenticated" &&
        <Button
          onClick={handleSignIn}
          disabled={signingIn}
        >
          Sign In with Farcaster
        </Button>
      }
      {status === "authenticated" &&
        <Button
          onClick={handleSignOut}
          disabled={signingOut}
        >
          Sign out
        </Button>
      }
      {session &&
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-gray-100 rounded-lg font-mono">
          <div className="font-semibold text-gray-500 mb-1">Session</div>
          <div className="whitespace-pre">{JSON.stringify(session, null, 2)}</div>
        </div>
      }
      {signInFailure && !signingIn && (
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-gray-100 rounded-lg font-mono">
          <div className="font-semibold text-gray-500 mb-1">SIWF Result</div>
          <div className="whitespace-pre">{signInFailure}</div>
        </div>
      )}
      {signInResult && !signingIn && (
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-gray-100 rounded-lg font-mono">
          <div className="font-semibold text-gray-500 mb-1">SIWF Result</div>
          <div className="whitespace-pre">{JSON.stringify(signInResult, null, 2)}</div>
        </div>
      )}
    </>
  );
}


const renderError = (error: Error | null) => {
  if (!error) return null;
  if (error instanceof BaseError) {
    const isUserRejection = error.walk(
      (e) => e instanceof UserRejectedRequestError
    );

    if (isUserRejection) {
      return <div className="text-red-500 text-xs mt-1">Rejected by user.</div>;
    }
  }

  return <div className="text-red-500 text-xs mt-1">{error.message}</div>;
};
