# Cüzdan Türleri ve Monad Entegrasyonu

## MetaMask (ve diğer injected cüzdanlar: Rabby, Phantom, OKX)
Monad Testnet ağ parametreleri (`wallet_addEthereumChain`):
```json
{
  "chainId": "0x279f",
  "chainName": "Monad Testnet",
  "rpcUrls": ["https://testnet-rpc.monad.xyz"],
  "nativeCurrency": { "name": "Monad", "symbol": "MON", "decimals": 18 },
  "blockExplorerUrls": ["https://testnet.monadexplorer.com"]
}
```
Mainnet için `chainId: "0x8f"` (143) ve RPC olarak `https://rpc.monad.xyz` kullanılır.

## WalletConnect (Reown)
- Mobil cüzdanları QR kod veya deep link ile bağlar.
- WalletConnect v1 (`@walletconnect/client`, bridge sunucusu) **kapatıldı**, kullanmayın.
- Güncel yol: **wagmi + viem** ile `walletConnect` connector'ı veya **Reown AppKit**. `projectId` için cloud.reown.com'dan ücretsiz kayıt gerekir.

## MPC Cüzdanlar (Multi-Party Computation)
- Özel anahtar hiçbir zaman tek parça halinde bir araya gelmez. İmza, parçaları tutan taraflar tarafından birlikte hesaplanır.
- **Örnekler**: ZenGo, Fireblocks, Coinbase WaaS.
- **Monad**: EVM uyumlu olduğu için özel chain ID ve RPC tanımlamak genellikle yeterlidir.

## Embedded ve Passkey Cüzdanlar
- **mera** (Category Labs): EVM hesaplarını passkey'den türetir. Aynı passkey her girişte aynı hesabı üretir.
- **Privy / Thirdweb**: E-posta veya sosyal girişle embedded cüzdan. Monad'ın React Native ve PWA şablonlarında hazır gelir.

---

### Kaynaklar
- [Monad Docs](https://docs.monad.xyz)
- [wagmi](https://wagmi.sh) · [Reown AppKit](https://docs.reown.com)
