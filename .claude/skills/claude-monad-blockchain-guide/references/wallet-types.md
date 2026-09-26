# Cüzdan Türleri ve Monad Entegrasyonu

## MetaMask
- **Nedir?**: En popüler Ethereum ve EVM uyumlu cüzdan.
- **Monad Entegrasyonu**:
  - Monad testnet/mainnet ağını ekleyin:
    ```json
    {
      "chainId": "0x1a4",
      "chainName": "Monad Testnet",
      "rpcUrls": ["https://rpc.testnet.monad.xyz"],
      "nativeCurrency": {
        "name": "MONAD",
        "symbol": "MONAD",
        "decimals": 18
      }
    }
    ```

## WalletConnect
- **Nedir?**: Mobil cüzdanlar için köprü protokolü.
- **Monad Entegrasyonu**:
  - WalletConnect v2 kullanarak Monad ağını destekleyin.
  - Örnek bağlantı kodu:
    ```javascript
    import { WalletConnect } from "@walletconnect/client";
    
    const connector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
      qrcodeModal: QRCodeModal,
    });
    ```

## MPC Cüzdanlar (Multi-Party Computation)
- **Nedir?**: Özel anahtarları parçalara ayırarak güvenlik sağlayan cüzdanlar.
- **Örnekler**: ZenGo, Fireblocks, Coinbase WaaS.
- **Monad Entegrasyonu**: MPC sağlayıcıların Monad RPC'lerini desteklemesi gerekir.

## Passkey Cüzdanlar
- **Nedir?**: Biyometrik kimlik doğrulama (Face ID, Touch ID) ile çalışan cüzdanlar.
- **Monad'da Kullanım**: `mera` (Monad'ın passkey tabanlı cüzdanı).

---

### Kaynaklar
- [Monad Docs - Cüzdanlar](https://docs.monad.xyz)
- [WalletConnect Docs](https://docs.walletconnect.com)