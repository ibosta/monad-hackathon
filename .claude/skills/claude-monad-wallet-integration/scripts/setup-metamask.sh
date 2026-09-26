başk#!/bin/bash

# MetaMask için Monad ağını otomatik ekler
echo "🦊 MetaMask için Monad ağını ekliyor..."

# Monad Testnet ayarları
MONAD_TESTNET='{
  "chainId": "0x1a4",
  "chainName": "Monad Testnet",
  "rpcUrls": ["https://rpc.testnet.monad.xyz"],
  "nativeCurrency": {
    "name": "MONAD",
    "symbol": "MONAD",
    "decimals": 18
  },
  "blockExplorerUrls": ["https://explorer.testnet.monad.xyz"]
}'

# MetaMask'a ağ ekleme (Chrome/Firefox)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # MacOS için
  osascript -e 'tell application "Google Chrome" to execute front window active tab javascript "ethereum.request({ method: \"wallet_addEthereumChain\", params: ['"$MONAD_TESTNET"'] })"'
  echo "✅ MetaMask'e Monad Testnet ağı eklendi (Chrome)."
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux için
  echo "Lütfen MetaMask eklentisini açın ve aşağıdaki ağ ayarlarını manuel ekleyin:"
  echo "$MONAD_TESTNET" | jq .
else
  echo "❌ Bu işletim sistemi için otomatik entegrasyon desteklenmiyor."
  echo "Lütfen MetaMask eklentisini açın ve aşağıdaki ağ ayarlarını manuel ekleyin:"
  echo "$MONAD_TESTNET" | jq .
fi