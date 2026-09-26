#!/bin/bash

# WalletConnect ile Monad bağlantısı kurar
echo "🔗 WalletConnect ile Monad bağlantısı kuruluyor..."

# WalletConnect v2 için örnek kod
WALLETCONNECT_CODE='
import { WalletConnect } from "@walletconnect/client";

const connector = new WalletConnect({
  bridge: "https://bridge.walletconnect.org",
  qrcodeModal: QRCodeModal,
});

// Monad ağına bağlan
connector.on("connect", (error, payload) => {
  if (error) throw error;
  console.log("✅ WalletConnect ile bağlantı kuruldu:", payload);
});

// Bağlantıyı başlat
connector.createSession();
'

echo "WalletConnect entegrasyonu için örnek kod:"
echo "$WALLETCONNECT_CODE"
echo -e "\nDaha fazla bilgi için: https://docs.walletconnect.com"