# Monad Dökümanları ve Kaynakları

> Ağ bilgileri için tek doğru kaynak bu dosyadır. Diğer skill'ler buraya referans verir.
> Şüphe durumunda: https://docs.monad.xyz/developer-essentials ve https://docs.monad.xyz/llms-full.txt

## Ağ Bilgileri

| Alan | Testnet | Mainnet |
|---|---|---|
| Chain ID | `10143` (hex `0x279f`) | `143` (hex `0x8f`) |
| RPC | `https://testnet-rpc.monad.xyz` | `https://rpc.monad.xyz` |
| Native token | `MON` (18 decimals) | `MON` (18 decimals) |
| Explorer | `https://testnet.monadexplorer.com` · `https://testnet.monadvision.com` | `https://monadvision.com` · `https://monadscan.com` |
| Faucet | `https://faucet.monad.xyz` (tarayıcıdan, cüzdan adresiyle) | — |

- Hackathon token'ları ve submission: **https://blitz.devnads.com**
- viem `2.40+` sürümünde `monadTestnet` ve `monad` chain tanımları hazır gelir:
  ```ts
  import { monadTestnet } from "viem/chains";
  ```

## Performans (Monad 101 slaytları, Eylül 2026)
- Block time: **0.3 s** · Finality: **0.6 s** (MonadBFT, tek tur)
- Throughput: **500M gas/s** · Sürekli ~**10.000 TPS**
- ~**200** aktif validator
- Kontrat boyut limiti: **256 KB** (Ethereum: 24 KB)

## Geliştiriciye Özel Farklar
- **Gas limit üzerinden ücret**: Monad'da işlem ücreti *kullanılan gas'a* değil *gas limitine* göre alınır. Gas limitini gereksiz yüksek vermeyin (estimateGas + küçük pay yeterli).
- **`eth_sendRawTransactionSync`**: İşlemi gönderir ve receipt'i senkron döner. Onay beklemek için polling gerekmez, arayüz anında güncellenir.
- **Execution events**: Yüksek throughput isteyen uygulamalar event'leri indexer'a gitmeden doğrudan node'dan stream edebilir.
- **MIP-8**: Cold slot erişim maliyetini düşürür.
- **Kontrat değişikliği gerekmez**: Mevcut Solidity kodu aynen deploy edilir (aynı compiler, aynı JSON-RPC ve WebSocket).

## Geliştirici Araçları
- **Monad Foundry**: Monad precompile'ları, doğru trace decoding ve simülasyonda gas desteği olan Foundry fork'u. Kurulum için docs.monad.xyz'teki Monad Foundry rehberine bakın. Standart Foundry ve Hardhat de sorunsuz çalışır.
- **Şablonlar**: GitHub'daki `monad-developers` organizasyonu (Foundry/Hardhat şablonları)
- **Viem / wagmi / ethers**: Standart EVM kütüphaneleri doğrudan kullanılır.
- **Kontrat doğrulama**: MonadVision üzerinden Sourcify ile.
- **skills.devnads.com**: Coding asistanları için Monad skill paketi (faucet, deploy, indexer).
- **app.monad.xyz/agents**: Ekosistem projelerinin agent skill'leri (Uniswap, Morpho, Kuru, Nad.fun, ...).
- **x402 facilitator**: https://x402-facilitator.molandak.org (rehber: docs.monad.xyz/guides/x402-guide)
- **MPP**: `@monad-crypto/mpp` paketi (Machine Payments Protocol)
- **ERC-8004**: AI agent'lar için onchain kimlik kaydı
- **mera** (Category Labs): Passkey'den (Face ID / Touch ID) EVM hesabı türetir.
- **Mobil**: React Native (Privy, Thirdweb) ve Next.js PWA şablonları

## Faucet Kullanımı
Faucet tarayıcı üzerinden çalışır: https://faucet.monad.xyz adresine gidin ve cüzdan adresinizi girin. Belgelenmiş bir `curl` API'si yoktur. Hackathon token'ları için blitz.devnads.com'u kullanın.

---

### Kaynaklar
- [Monad Docs](https://docs.monad.xyz)
- [Monad 101 Slides](../../../../Monad%20Blitz%20İstanbul%20Sept%202026%20-%20Monad101%20Slides.md)
