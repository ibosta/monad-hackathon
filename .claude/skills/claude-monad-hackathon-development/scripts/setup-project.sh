#!/bin/bash

# Yeni Monad projesi oluşturur
PROJECT_NAME="$1"
GITHUB_URL="$2"

# Proje klasörünü oluştur
mkdir -p "$PROJECT_NAME" && cd "$PROJECT_NAME"

# Temel dosyaları oluştur
cat > foundry.toml <<EOL
[profile.default]
src = 'src'
out = 'out'
libs = ['lib']
EOL

cat > package.json <<EOL
{
  "name": "$PROJECT_NAME",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
EOL

# Dockerfile ve docker-compose.yml dosyalarını kopyala
cp "../Dockerfile.frontend" ./
cp "../Dockerfile.backend" ./
cp "../docker-compose.yml" ./
cp "../assets/nginx.conf" ./nginx.conf

# README.md ve CHANGELOG.md oluştur
../scripts/update-readme.sh "$PROJECT_NAME" "1.0.0" "$GITHUB_URL"

echo "✅ Proje '$PROJECT_NAME' başarıyla oluşturuldu."