"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";

const WagmiProvider = dynamic(
  () => import("~/components/providers/WagmiProvider"),
  {
    ssr: false,
  }
);

export function Providers({ 
  children,
  session
}: { 
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <WagmiProvider>
        {children}
      </WagmiProvider>
    </SessionProvider>
  );
}