#!/bin/bash

# Foundry ile kontrat testlerini çalıştırır
TEST_FILE="$1"

echo "🧪 Kontrat testleri çalıştırılıyor: $TEST_FILE"

# Foundry test komutu
forge test --match-path "$TEST_FILE"

echo "✅ Testler tamamlandı."