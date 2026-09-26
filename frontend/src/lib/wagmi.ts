import { http, createConfig, createStorage } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/**
 * Monad Testnet chain definition.
 * Backend (backend/src/chain.js) uses viem's monadTestnet with chainId 10143.
 */
export const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
} as const;

export const wagmiConfig = createConfig({
  chains: [monadTestnet, mainnet],
  connectors: [injected({ shimDisconnect: true })],
  ssr: true,
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  }),
  transports: {
    [monadTestnet.id]: http(
      process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"
    ),
    [mainnet.id]: http(),
  },
  multiInjectedProviderDiscovery: true,
});

export const MONAD_CHAIN_ID = 10143;
export const MONAD_EXPLORER = "https://testnet.monadexplorer.com";
export const MONAD_RPC = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
