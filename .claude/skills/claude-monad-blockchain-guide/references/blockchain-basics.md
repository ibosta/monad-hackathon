# Blockchain Temel Kavramları

## Cüzdanlar (Wallets)
- **Sıcak Cüzdan (Hot Wallet)**: İnternete bağlı cüzdanlar (örn. MetaMask, Rabby, Phantom).
- **Soğuk Cüzdan (Cold Wallet)**: Anahtarı çevrimdışı saklayan donanım cüzdanları (örn. Ledger, Trezor).
- **MPC Cüzdan (Multi-Party Computation)**: Özel anahtar hiçbir zaman tek parça halinde oluşmaz. Parçalar farklı taraflarda durur ve imza birlikte hesaplanır (örn. ZenGo, Fireblocks). *Multisig'ten farklıdır*: Multisig birden fazla ayrı anahtar ve onchain bir kontrat kullanır (örn. Safe).
- **Passkey / Smart Account**: Face ID veya Touch ID ile oluşturulan hesaplar (Monad'da örneği: `mera`).

## Gas Ücretleri
- **Nedir?**: İşlemi yürütmek için ödenen ücrettir (Monad'da `MON`, Ethereum'da `ETH`).
- **Ethereum'da**: `ücret = kullanılan gas × (base fee + priority fee)` (EIP-1559).
- **Monad'da fark**: Ücret **gas limitine** göre alınır, kullanılan gas'a göre değil. Gas limitini abartmayın.
- Örnek: 21.000 gas × 50 gwei = 0,00105 MON.

## Akıllı Kontratlar (Smart Contracts)
- **Nedir?**: Blockchain üzerinde çalışan programlar. Genellikle Solidity veya Vyper ile yazılır.
- **Monad'da**: Tam EVM uyumludur, aynı compiler ve bytecode kullanılır. Kontrat boyut limiti **256 KB** (Ethereum'da 24 KB).

## Consensus Mekanizmaları
- **PoW (Proof of Work)**: Madencilikle blok üretimi (Bitcoin; Ethereum 2022'deki Merge'e kadar).
- **PoS (Proof of Stake)**: Stake eden validator'lar blok üretir (Ethereum, Monad).
- **MonadBFT**: Monad'ın PoS tabanlı BFT consensus'u. Tek turda anlaşma sağlar: **0.3 s blok, 0.6 s finality**.

---

### Kaynaklar
- [Ethereum Docs](https://ethereum.org/en/developers/docs)
- [Monad 101 Slides](../../../../Monad%20Blitz%20İstanbul%20Sept%202026%20-%20Monad101%20Slides.md)
