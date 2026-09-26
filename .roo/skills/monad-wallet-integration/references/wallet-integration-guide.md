# Monad Cüzdan Entegrasyonu Rehberi

## MetaMask Entegrasyonu
1. **Ağ Ayarlarını Ekleyin**:
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
2. **MetaMask Eklentisini Kullanın**: Ayarlar > Ağlar > "Ağ Ekle".

## WalletConnect Entegrasyonu
1. **WalletConnect v2 Kütüphanesini Kurun**:
   ```bash
   npm install @walletconnect/client
   ```
2. **Bağlantı Kodu**:
   ```javascript
   import { WalletConnect } from "@walletconnect/client";
   
   const connector = new WalletConnect({
     bridge: "https://bridge.walletconnect.org",
   });
   ```

## MPC Cüzdanlar (ZenGo, Fireblocks)
- **Monad RPC Desteği**: MPC sağlayıcının Monad ağını desteklediğinden emin olun.
- **Özel Anahtar Yönetimi**: Özel anahtarları parçalara ayırarak güvenlik sağlayın.

---

### Kaynaklar
- [Monad Docs - Cüzdanlar](https://docs.monad.xyz)
- [WalletConnect Docs](https://docs.walletconnect.com)