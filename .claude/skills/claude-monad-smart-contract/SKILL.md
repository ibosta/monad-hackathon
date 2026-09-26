--- name: claude-monad-smart-contract description: Claude Code ile Monad üzerinde akıllı kontrat geliştirme ve deploy etme adımlarını sağlar. Foundry ve Hardhat entegrasyonu ile kontrat testleri yapar. Monad testnet/mainnet'e deploy eder. ---

# Ne Zaman Kullanılır
- **Monad üzerinde akıllı kontrat geliştirmek istediğinizde**.
- **Kontratları testnet/mainnet'e deploy etmek istediğinizde**.
- **Foundry veya Hardhat kullanarak kontrat testleri yapmak istediğinizde**.
- **Monad'ın 256KB kontrat boyutu sınırından yararlanmak istediğinizde**.

# Ne Zaman Kullanılmaz
- **Frontend entegrasyonları için** (bu durumda `monad-wallet-integration` kullanın).
- **Monad dışındaki blockchain'ler için kontrat geliştirme** (Ethereum, Solana, vb.).
- **Hackathon projesi yönetimi için** (bu durumda `monad-hackathon-development` kullanın).

# İş Akışı
1. **Kontrat Geliştirme**: Solidity ile akıllı kontrat yazın.
2. **Test**: Foundry/Hardhat ile testleri çalıştırın.
3. **Deploy**: Kontratı Monad testnet/mainnet'e deploy edin.

# Dosyalar
- [`scripts/deploy-contract.sh`](scripts/deploy-contract.sh): Kontratı deploy eder.
- [`scripts/test-contract.sh`](scripts/test-contract.sh): Kontrat testlerini çalıştırır.
- [`references/contract-examples.md`](references/contract-examples.md): Örnek akıllı kontratlar.

# Örnekler
## Kontrat Deploy Etme
```bash
# Monad testnet'e kontrat deploy eder
./scripts/deploy-contract.sh "MyContract.sol" "0x1a4" "https://rpc.testnet.monad.xyz"
```

## Kontrat Testleri
```bash
# Foundry ile kontrat testlerini çalıştırır
./scripts/test-contract.sh "MyContract.t.sol"