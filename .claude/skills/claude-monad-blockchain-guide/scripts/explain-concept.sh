#!/bin/bash

# Belirtilen konu hakkında bilgi verir
CONCEPT="$1"

case "$CONCEPT" in
  "Monad async execution")
    echo "📖 Monad Async Execution:"
    echo "- Monad, consensus ve execution katmanlarını ayırarak işlemleri paralel yürütür."
    echo "- Block time: 0.3 saniye (Ethereum'da 12 saniye)."
    echo "- Avantaj: Yüksek throughput (10,000+ TPS)."
    echo -e "\nKaynak: [references/monad-architecture.md](references/monad-architecture.md)"
    ;;
  
  "blockchain gas fees")
    echo "📖 Blockchain Gas Ücretleri:"
    echo "- Gas, işlemleri yürütmek için ödenen ücrettir."
    echo "- Formül: Gas Limit * Gas Price (örn: 21,000 * 100 gwei = 0.0021 ETH)."
    echo "- Monad'da gas ücretleri Ethereum'a göre ~10x daha ucuz."
    echo -e "\nKaynak: [references/blockchain-basics.md](references/blockchain-basics.md)"
    ;;
  
  "MPC wallets")
    echo "📖 MPC Cüzdanlar:"
    echo "- Özel anahtarları parçalara ayırarak güvenlik sağlar."
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