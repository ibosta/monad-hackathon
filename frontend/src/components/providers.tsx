"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { WagmiProvider } from "wagmi";
import { Toaster } from "sonner";
import { useState, type ReactNode } from "react";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } } })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          toastOptions={{
            classNames: {
              toast: "!rounded-2xl !border !border-monad-700 !bg-[#1a0f3d] !text-monad-50 !shadow-2xl !shadow-monad/30 !font-bold",
              description: "!text-monad-200",
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
