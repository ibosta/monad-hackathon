---
name: claude-monad-blockchain-guide
description: "Claude Code ile Monad blockchain ve genel blockchain kavramları hakkında bilgi sağlar. Cüzdanlar, RPC, akıllı kontratlar, gas ücretleri ve Monad'ın teknik detaylarını (async execution, parallel execution, MonadBFT) açıklar."
---
# Ne Zaman Kullanılır
- **Monad'ın teknik detaylarını öğrenmek istediğinizde** (async execution, parallel execution, MonadBFT).
- **Blockchain temel kavramlarını anlamak istediğinizde** (cüzdanlar, gas, akıllı kontratlar, consensus mekanizmaları).
- **Monad ve Ethereum farklarını öğrenmek istediğinizde**.
- **Monad'ın performans avantajlarını (10,000 TPS, 0.3s block time) araştırmak istediğinizde**.

# Ne Zaman Kullanılmaz
- **Monad dışındaki blockchain'ler için** (Solana, Bitcoin, Cosmos, vb.).
- **Hackathon projesi geliştirme sürecinde** (bu durumda `claude-monad-hackathon-development` kullanın).
- **Akıllı kontrat veya cüzdan entegrasyonu için** (bu durumda `claude-monad-smart-contract` veya `claude-monad-wallet-integration` kullanın).

# İş Akışı
1. **Konu Seçimi**: Öğrenmek istediğiniz konuyu belirtin (örn: "Monad'ın async execution özelliği nedir?").
2. **Bilgi Sağlama**: İlgili referans dosyasından veya Monad dökümanlarından bilgi çekilir.
3. **Örnekler**: Konuyla ilgili örnekler ve karşılaştırmalar sunulur.

# Dosyalar
- [`references/monad-architecture.md`](references/monad-architecture.md): Monad'ın teknik mimarisi (async execution, parallel execution, MonadBFT).
- [`references/blockchain-basics.md`](references/blockchain-basics.md): Blockchain temel kavramları (cüzdanlar, gas, akıllı kontratlar, consensus).
- [`references/wallet-types.md`](references/wallet-types.md): Farklı cüzdan türleri (MetaMask, WalletConnect, MPC cüzdanlar).
- [`scripts/explain-concept.sh`](scripts/explain-concept.sh): Belirtilen konu hakkında bilgi verir.

# Örnekler
## Monad'ın Async Execution Özelliği
```bash
# Monad'ın async execution özelliği hakkında bilgi al
./scripts/explain-concept.sh "Monad async execution"
```

## Blockchain Temel Kavramları
```bash
# Gas ücretleri hakkında bilgi al
./scripts/explain-concept.sh "blockchain gas fees"
```

## Cüzdan Türleri
```bash
# MPC cüzdanlar hakkında bilgi al
./scripts/explain-concept.sh "MPC wallets"
```
