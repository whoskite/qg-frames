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

const MAX_CHARS = 280 // Maximum character limit for the quote

const getRandomColor = () => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F06292', '#AEC6CF', '#836FFF', '#77DD77', '#FFB347']
  return colors[Math.floor(Math.random() * colors.length)]
}

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
      const context = await sdk.context;
      setContext(context);
      setAdded(context.client.added);

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
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded]);

  const openUrl = useCallback(() => {
    sdk.actions.openUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  }, []);

  const openWarpcastUrl = useCallback(() => {
    sdk.actions.openUrl("https://warpcast.com/~/compose?text=%{encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}");
  }, []);

  const close = useCallback(() => {
    sdk.actions.close();
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

  const sendTx = useCallback(() => {
    sendTransaction(
      {
        // call yoink() on Yoink contract
        to: "0x4bBFD120d9f352A0BEd7a014bd67913a2007a878",
        data: "0x9846cd9efc000023c0",
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
        },
      }
    );
  }, [sendTransaction]);

  const signTyped = useCallback(() => {
    signTypedData({
      domain: {
        name: "Frames v2 Demo",
        version: "1",
        chainId,
      },
      types: {
        Message: [{ name: "content", type: "string" }],
      },
      message: {
        content: "Hello from Frames v2!",
      },
      primaryType: "Message",
    });
  }, [chainId, signTypedData]);

  const toggleContext = useCallback(() => {
    setIsContextOpen((prev) => !prev);
  }, []);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  const handleGenerateQuote = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      // First generate the quote
      const generatedQuote = await generateQuote(userPrompt)
      if (!generatedQuote) {
        throw new Error('Failed to generate quote')
      }
      
      setQuote(generatedQuote.slice(0, MAX_CHARS))
      setBgColor(getRandomColor())
      
      // Then fetch the GIF
      const searchQuery = encodeURIComponent(generatedQuote.slice(0, 30)) // Use first 30 chars for better GIF matching
      const response = await fetch(`/api/giphy?search=${searchQuery}`)
      
      if (!response.ok) {
        throw new Error(`GIF API error: ${response.status}`)
      }
      
      const data = await response.json()
      const gifUrl = data.data[0]?.images?.fixed_height?.url
      setGifUrl(gifUrl || null)
      
    } catch (error) {
      console.error('Error:', error)
      setQuote('Failed to generate quote. Please try again.')
      setGifUrl(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerateQuote()
    }
  }

  return (
    <div className="mx-auto">
      {/* <h1 className="text-2xl font-bold text-center mb-4">{title}</h1>

      <div className="mb-4">
        <h2 className="font-2xl font-bold">Context</h2>
        <button
          onClick={toggleContext}
          className="flex items-center gap-2 transition-colors"
        >
          <span
            className={`transform transition-transform ${
              isContextOpen ? "rotate-90" : ""
            }`}
          >
            ➤
          </span>
          Tap to expand
        </button>

        {isContextOpen && (
          <div className="p-4 mt-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px] overflow-x-">
              {JSON.stringify(context, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-2xl font-bold">Actions</h2>

        <div className="mb-4">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg my-2">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px] overflow-x-">
              sdk.actions.signIn
            </pre>
          </div>
          <SignIn />
        </div>

        <div className="mb-4">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg my-2">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px] overflow-x-">
              sdk.actions.openUrl
            </pre>
          </div>
          <Button onClick={openUrl}>Open Link</Button>
        </div>

        <div className="mb-4">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg my-2">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px] overflow-x-">
              sdk.actions.openUrl
            </pre>
          </div>
          <Button onClick={openWarpcastUrl}>Open Warpcast Link</Button>
        </div>

        <div className="mb-4">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg my-2">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px] overflow-x-">
              sdk.actions.close
            </pre>
          </div>
          <Button onClick={close}>Close Frame</Button>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-2xl font-bold">Last event</h2>

        <div className="p-4 mt-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px] overflow-x-">
            {lastEvent || "none"}
          </pre>
        </div>
      </div>

      <div>
        <h2 className="font-2xl font-bold">Add to client & notifications</h2>

        <div className="mt-2 mb-4 text-sm">
          Client fid {context?.client.clientFid},
          {added ? " frame added to client," : " frame not added to client,"}
          {notificationDetails
            ? " notifications enabled"
            : " notifications disabled"}
        </div>

        <div className="mb-4">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg my-2">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px] overflow-x-">
              sdk.actions.addFrame
            </pre>
          </div>
          {addFrameResult && (
            <div className="mb-2 text-sm">
              Add frame result: {addFrameResult}
            </div>
          )}
          <Button onClick={addFrame} disabled={added}>
            Add frame to client
          </Button>
        </div>

        {sendNotificationResult && (
          <div className="mb-2 text-sm">
            Send notification result: {sendNotificationResult}
          </div>
        )}
        <div className="mb-4">
          <Button onClick={sendNotification} disabled={!notificationDetails}>
            Send notification
          </Button>
        </div>
      </div>

      <div>
        <h2 className="font-2xl font-bold">Wallet</h2>

        {address && (
          <div className="my-2 text-xs">
            Address: <pre className="inline">{truncateAddress(address)}</pre>
          </div>
        )}

        {chainId && (
          <div className="my-2 text-xs">
            Chain ID: <pre className="inline">{chainId}</pre>
          </div>
        )}

        <div className="mb-4">
          <Button
            onClick={() =>
              isConnected
                ? disconnect()
                : connect({ connector: config.connectors[0] })
            }
          >
            {isConnected ? "Disconnect" : "Connect"}
          </Button>
        </div>

        <div className="mb-4">
          <SignMessage />
        </div>

        {isConnected && (
          <>
            <div className="mb-4">
              <SendEth />
            </div>
            <div className="mb-4">
              <Button
                onClick={sendTx}
                disabled={!isConnected || isSendTxPending}
                isLoading={isSendTxPending}
              >
                Send Transaction (contract)
              </Button>
              {isSendTxError && renderError(sendTxError)}
              {txHash && (
                <div className="mt-2 text-xs">
                  <div>Hash: {truncateAddress(txHash)}</div>
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
            </div>
            <div className="mb-4">
              <Button
                onClick={signTyped}
                disabled={!isConnected || isSignTypedPending}
                isLoading={isSignTypedPending}
              >
                Sign Typed Data
              </Button>
              {isSignTypedError && renderError(signTypedError)}
            </div>
            <div className="mb-4">
              <Button
                onClick={handleSwitchChain}
                disabled={isSwitchChainPending}
                isLoading={isSwitchChainPending}
              >
                Switch to {chainId === base.id ? "Optimism" : "Base"}
              </Button>
              {isSwitchChainError && renderError(switchChainError)}
            </div>
          </>
        )}
      </div> */}
      

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
                className="mb-6 rounded-lg overflow-hidden"
              >
                <div className="relative w-full h-[200px]">
                  <Image
                    src={gifUrl}
                    alt="Quote-related GIF"
                    fill
                    sizes="(max-width: 600px) 100vw, 50vw"
                    className="object-cover rounded-lg"
                  />
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
                const shareText = 'Create "Fun Quotes" by @KITE and /thepod team 👽';
                const shareUrl = 'https://qg-frames.vercel.app';
                const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
                sdk.actions.openUrl(url);
              }}
              className="w-full text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center"
            >
              {isLoading ? (
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
