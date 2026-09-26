# Monad Cüzdan Entegrasyonu Rehberi

## Önerilen Stack: wagmi + viem
```bash
npm install wagmi viem@^2.40 @tanstack/react-query
```
```ts
import { createConfig, http } from "wagmi";
import { monadTestnet } from "viem/chains"; // chainId 10143
import { injected, walletConnect } from "wagmi/connectors";

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! }),
  ],
  transports: { [monadTestnet.id]: http("https://testnet-rpc.monad.xyz") },
});
```

## MetaMask'e Ağ Ekleme (tarayıcıda)
```ts
await window.ethereum.request({
  method: "wallet_addEthereumChain",
  params: [{
    chainId: "0x279f",
    chainName: "Monad Testnet",
    rpcUrls: ["https://testnet-rpc.monad.xyz"],
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
    blockExplorerUrls: ["https://testnet.monadexplorer.com"],
  }],
});
```
wagmi kullanıyorsanız `useSwitchChain()` bunu otomatik yapar.

## Cüzdanla Giriş (Sign-In)
- Adres bağlamak kimlik doğrulamak için tek başına yetmez. Backend tarafında **imzalı mesaj** doğrulaması yapın (SIWE / EIP-4361 ya da basit bir nonce imzası).
- Viem ile doğrulama: `verifyMessage({ address, message, signature })`.

## Hızlı UX: senkron receipt
Monad'daki `eth_sendRawTransactionSync` metodu receipt'i doğrudan döner. Bu metot kullanılamadığında `waitForTransactionReceipt` kullanın; 0.3 s blok süresi sayesinde bekleme yine kısa olur.

## MPC ve Embedded Cüzdanlar
- Privy / Thirdweb embedded wallet ve mera (passkey) seçenekleri için docs.monad.xyz'teki mobil ve PWA şablonlarına bakın.

---

### Kaynaklar
- [Monad Docs](https://docs.monad.xyz) · [wagmi](https://wagmi.sh) · [Reown](https://docs.reown.com)
