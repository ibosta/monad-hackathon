#!/bin/bash

# Responsive tasarım kontrolü
echo "📱 Responsive tasarım kontrolü başlatılıyor..."

# Mobil ve masaüstü için viewport testleri
MOBILE_USER_AGENT="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
DESKTOP_USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

# curl ile test (örnek)
echo "🔍 Mobil görünüm testi..."
curl -A "$MOBILE_USER_AGENT" http://localhost:3000 | grep -q "viewport" && echo "✅ Mobil görünüm destekleniyor" || echo "❌ Mobil görünüm hatası"

echo "🖥️ Masaüstü görünüm testi..."
curl -A "$DESKTOP_USER_AGENT" http://localhost:3000 | grep -q "viewport" && echo "✅ Masaüstü görünüm destekleniyor" || echo "❌ Masaüstü görünüm hatası"

echo "✅ Responsive kontrolü tamamlandı."
