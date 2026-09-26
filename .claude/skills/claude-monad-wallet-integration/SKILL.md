---
name: claude-monad-wallet-integration
description: "Claude Code ile Monad projelerine cüzdan entegrasyonu sağlar. MetaMask, WalletConnect ve MPC cüzdanlarla bağlantı kurma adımlarını otomatikleştirir. Monad testnet/mainnet ağ ayarlarını yapılandırır."
---
# Ne Zaman Kullanılır
- **Monad projesine MetaMask entegre etmek istediğinizde**.
- **WalletConnect ile mobil cüzdan bağlantısı kurmak istediğinizde**.
- **MPC cüzdanlar (ZenGo, Fireblocks) ile Monad entegrasyonu yapmak istediğinizde**.
- **Monad testnet/mainnet ağ ayarlarını otomatik yapılandırmak istediğinizde**.

# Ne Zaman Kullanılmaz
- **Monad dışındaki blockchain'ler için cüzdan entegrasyonu** (Ethereum, Solana, vb.).
- **Backend entegrasyonları için** (bu durumda `claude-monad-smart-contract` kullanın).
- **Akıllı kontrat geliştirme sürecinde** (bu durumda `claude-monad-smart-contract` kullanın).

# İş Akışı
1. **Cüzdan Seçimi**: MetaMask, WalletConnect veya MPC cüzdan seçin.
2. **Ağ Ayarları**: Monad testnet/mainnet RPC ayarlarını otomatik yapılandırın.
3. **Entegrasyon**: Cüzdan bağlantısını projenize ekleyin.

# Dosyalar
- [`scripts/setup-metamask.sh`](scripts/setup-metamask.sh): MetaMask entegrasyonu için gerekli adımları otomatikleştirir.
- [`scripts/connect-walletconnect.sh`](scripts/connect-walletconnect.sh): WalletConnect entegrasyonu sağlar.
- [`references/wallet-integration-guide.md`](references/wallet-integration-guide.md): Cüzdan entegrasyonu rehberi.

# Örnekler
## MetaMask Entegrasyonu
```bash
# MetaMask için Monad ağını otomatik ekler
./scripts/setup-metamask.sh
```

## WalletConnect Entegrasyonu
```bash
# WalletConnect ile Monad bağlantısı kurar
./scripts/connect-walletconnect.sh
```
