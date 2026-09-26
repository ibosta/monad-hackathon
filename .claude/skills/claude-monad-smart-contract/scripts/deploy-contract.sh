#!/bin/bash
# Kontratı Foundry ile Monad'a deploy eder.
# Kullanım: PRIVATE_KEY=0x... ./deploy-contract.sh "src/MyContract.sol:MyContract" [rpc_url] [constructor args...]
set -euo pipefail
CONTRACT="$1"                                   # path:ContractName
RPC_URL="${2:-https://testnet-rpc.monad.xyz}"   # Testnet (chain 10143)
shift $(( $# >= 2 ? 2 : 1 ))
: "${PRIVATE_KEY:?PRIVATE_KEY ortam değişkeni gerekli}"

echo "🚀 Deploy: $CONTRACT -> $RPC_URL"
ARGS=()
if [[ $# -gt 0 ]]; then ARGS=(--constructor-args "$@"); fi
forge create "$CONTRACT" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  "${ARGS[@]+"${ARGS[@]}"}"

echo "✅ Deploy tamamlandı. Explorer: https://testnet.monadexplorer.com"
echo "   Doğrulama: forge verify-contract <adres> $CONTRACT --chain 10143 --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org"
