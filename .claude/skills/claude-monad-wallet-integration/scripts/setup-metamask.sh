#!/bin/bash
# MetaMask'e Monad ağı eklemek için gereken parametreleri yazdırır.
# Kullanım: ./setup-metamask.sh [testnet|mainnet]
NET="${1:-testnet}"

if [[ "$NET" == "mainnet" ]]; then
  PARAMS='{
  "chainId": "0x8f",
  "chainName": "Monad",
  "rpcUrls": ["https://rpc.monad.xyz"],
  "nativeCurrency": { "name": "Monad", "symbol": "MON", "decimals": 18 },
  "blockExplorerUrls": ["https://monadvision.com"]
}'
else
  PARAMS='{
  "chainId": "0x279f",
  "chainName": "Monad Testnet",
  "rpcUrls": ["https://testnet-rpc.monad.xyz"],
  "nativeCurrency": { "name": "Monad", "symbol": "MON", "decimals": 18 },
  "blockExplorerUrls": ["https://testnet.monadexplorer.com"]
}'
fi

echo "🦊 Monad $NET ağ parametreleri (MetaMask > Ağ Ekle > Manuel):"
echo "$PARAMS"
echo
echo "Frontend'den programatik ekleme:"
echo "await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [$(echo "$PARAMS" | tr -d '\n')] })"
