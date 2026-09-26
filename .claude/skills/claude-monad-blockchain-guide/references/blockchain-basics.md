# Blockchain Temel Kavramları

## Cüzdanlar (Wallets)
- **Sıcak Cüzdan (Hot Wallet)**: İnternet bağlantısı olan cüzdanlar (örn: MetaMask, Trust Wallet).
- **Soğuk Cüzdan (Cold Wallet)**: İnternet bağlantısı olmayan cüzdanlar (örn: Ledger, Trezor).
- **MPC Cüzdan**: Çoklu imza (Multi-Party Computation) ile güvenlik sağlayan cüzdanlar (örn: ZenGo, Fireblocks).

## Gas Ücretleri
- **Nedir?**: İşlemleri yürütmek için ödenen ücret (ETH, MONAD, vb.).
- **Nasıl Hesaplanır?**: `Gas Limit * Gas Price` (örn: 21,000 gas * 100 gwei = 0.0021 ETH).
- **Monad'da Gas**: Ethereum'a göre ~10x daha ucuz.

## Akıllı Kontratlar (Smart Contracts)
- **Nedir?**: Blockchain üzerinde çalışan otomatik anlaşmalar (Solidity/Vyper ile yazılır).
- **Monad'da Kontratlar**: 256KB boyut sınırı (Ethereum'da 24KB).

## Consensus Mekanizmaları
- **PoW (Proof of Work)**: Madencilik ile blok doğrulama (Bitcoin, Ethereum 1.0).
- **PoS (Proof of Stake)**: Validator'lar ile blok doğrulama (Ethereum 2.0, Monad).
- **MonadBFT**: Monad'ın PoS tabanlı consensus mekanizması (0.3s block time).

---

### Kaynaklar
- [Ethereum Docs](https://ethereum.org/en/developers/docs)
- [Monad 101 Slides](Monad%20Blitz%20İstanbul%20Sept%202026%20-%20Monad101%20Slides.md)