#!/bin/bash

# README.md ve CHANGELOG.md'yi günceller
PROJECT_NAME="$1"
VERSION="$2"
GITHUB_URL="$3"

# README.md güncelleme
cat > README.md <<EOL
# $PROJECT_NAME

**Monad Blitz Hackathon Projesi**

## Açıklama
Bu proje, Monad blockchain üzerinde geliştirilmiştir.

## Kurulum
"`"`bash
git clone $GITHUB_URL
cd $PROJECT_NAME
docker-compose up -d
"""

## Son Değişiklikler
- **v$VERSION**: $(date +"%Y-%m-%d")
EOL

# CHANGELOG.md güncelleme
cat > CHANGELOG.md <<EOL
# Changelog

## v$VERSION - $(date +"%Y-%m-%d")
- İlk release
EOL

echo "✅ README.md ve CHANGELOG.md güncellendi."