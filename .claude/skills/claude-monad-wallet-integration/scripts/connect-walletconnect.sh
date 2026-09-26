#!/bin/bash
# wagmi + WalletConnect (Reown) ile Monad bağlantısı için örnek kod yazdırır.
# Not: WalletConnect v1 (@walletconnect/client + bridge) kapatılmıştır, kullanmayın.
cat <<'CODE'
// npm install wagmi viem@^2.40 @tanstack/react-query
import { createConfig, http } from "wagmi";
import { monadTestnet } from "viem/chains";
import { injected, walletConnect } from "wagmi/connectors";

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID }), // cloud.reown.com
  ],
  transports: { [monadTestnet.id]: http("https://testnet-rpc.monad.xyz") },
});
CODE
echo -e "\nDaha fazla bilgi: https://wagmi.sh · https://docs.reown.com"
