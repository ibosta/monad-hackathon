#!/bin/bash

# Kontratı Monad ağına deploy eder
CONTRACT_FILE="$1"
CHAIN_ID="$2"  # 0x1a4 (Monad Testnet)
RPC_URL="$3"  # https://rpc.testnet.monad.xyz

echo "🚀 Kontrat deploy ediliyor: $CONTRACT_FILE"

# Foundry kullanarak deploy
forge create "$CONTRACT_FILE" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --chain-id "$CHAIN_ID"

echo "✅ Kontrat başarıyla deploy edildi."