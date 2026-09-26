#!/bin/bash

# Frontend ve backend Docker imajlarını build eder
echo "🚀 Frontend (Next.js) Docker imajı build ediliyor..."
docker build -f Dockerfile.frontend -t monad-frontend .

echo "🚀 Backend (Nginx) Docker imajı build ediliyor..."
docker build -f Dockerfile.backend -t monad-backend .

echo "✅ Docker imajları başarıyla oluşturuldu."

# Responsive kontrolü
echo "🔍 Responsive tasarım testi yapılıyor..."
if ./scripts/check-responsive.sh; then
  echo "✅ Responsive tasarım testi başarılı."
else
  echo "❌ Responsive tasarım testi başarısız. Lütfen viewport ayarlarını kontrol edin."
  exit 1
fi