#!/bin/bash
# Foundry ile kontrat testlerini çalıştırır.
# Kullanım: ./test-contract.sh [test/MyContract.t.sol]
set -e
if [[ -n "$1" ]]; then
  echo "🧪 Testler: $1"
  forge test --match-path "$1" -vv
else
  echo "🧪 Tüm testler"
  forge test -vv
fi
