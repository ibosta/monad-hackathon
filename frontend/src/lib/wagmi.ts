import { http, createConfig, createStorage } from "wagmi";
import { monadTestnet as viemMonadTestnet } from "viem/chains";
import { injected } from "wagmi/connectors";

const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

/** viem's Monad Testnet definition (includes multicall3) with our RPC/explorer. */
export const monadTestnet = {
  ...viemMonadTestnet,
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" } },
} as const;

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected({ shimDisconnect: true })],
  ssr: true,
  storage: createStorage({ storage: typeof window !== "undefined" ? window.localStorage : undefined }),
  // The public Monad RPC is rate limited (HTTP 429): merge reads into multicalls and
  // JSON-RPC batches, poll gently and back off on errors.
  batch: { multicall: { wait: 32 } },
  pollingInterval: 2_000,
  transports: {
    [monadTestnet.id]: http(RPC_URL, { batch: { wait: 20, batchSize: 20 }, retryCount: 4, retryDelay: 600 }),
  },
  multiInjectedProviderDiscovery: true,
});

export const MONAD_CHAIN_ID = monadTestnet.id;
export const MONAD_EXPLORER = "https://testnet.monadexplorer.com";
export const MONAD_RPC = RPC_URL;
