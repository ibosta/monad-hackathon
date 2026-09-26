#!/bin/bash

# Belirtilen konu hakkında bilgi verir
CONCEPT="$1"

case "$CONCEPT" in
  "Monad async execution")
    echo "📖 Monad Async Execution:"
    echo "- Consensus ile execution birbirini beklemez; her biri bloğun tamamını kullanır."
    echo "- Block time: 0.3 s, finality: 0.6 s (Ethereum: 12 s / ~13 dk)."
    echo "- Avantaj: Yüksek throughput (10,000+ TPS)."
    echo -e "\nKaynak: [references/monad-architecture.md](references/monad-architecture.md)"
    ;;
  
  "blockchain gas fees")
    echo "📖 Blockchain Gas Ücretleri:"
    echo "- Gas, işlemleri yürütmek için ödenen ücrettir."
    echo "- Ethereum: kullanılan gas × gas price. Monad: gas LİMİTİ × gas price (limiti abartmayın)."
    echo "- Monad 500M gas/s kapasiteyle ücretleri düşük tutar."
    echo -e "\nKaynak: [references/blockchain-basics.md](references/blockchain-basics.md)"
    ;;
  
  "MPC wallets")
    echo "📖 MPC Cüzdanlar:"
    echo "- Özel anahtar hiç tek parça oluşmaz; parçalar birlikte imza hesaplar (multisig değildir)."
    echo "- Örnekler: ZenGo, Fireblocks, Coinbase WaaS."
    echo "- Monad entegrasyonu: MPC sağlayıcıların Monad RPC'lerini desteklemesi gerekir."
    echo -e "\nKaynak: [references/wallet-types.md](references/wallet-types.md)"
    ;;
  
  *)
    echo "❌ Bilinmeyen konu: $CONCEPT"
    echo "Kullanabileceğiniz konular:"
    echo "- Monad async execution"
    echo "- blockchain gas fees"
    echo "- MPC wallets"
    exit 1
    ;;
esac