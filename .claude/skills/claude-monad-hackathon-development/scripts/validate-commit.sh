#!/bin/bash

# Commit mesajını doğrular (Conventional Commits standardı)
COMMIT_MSG="$1"

# Regex: feat|fix|docs|style|refactor|perf|test|chore prefix'leri
COMMIT_REGEX='^(feat|fix|docs|style|refactor|perf|test|chore)(\([a-zA-Z0-9-]+\))?: .{1,50}$'

if [[ ! $COMMIT_MSG =~ $COMMIT_REGEX ]]; then
  echo "❌ Hata: Commit mesajı Conventional Commits standardına uymuyor."
  echo "Örnek: 'feat: yeni ödeme kontraktı ekle' veya 'fix(api): kullanıcı girişi düzeltildi'"
  exit 1
else
  echo "✅ Commit mesajı doğrulandı."
  exit 0
fi