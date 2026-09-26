--- name: monad-hackathon-development description: Monad Blitz Hackathon projeleri için proje oluşturma, commit standartları, README güncelleme ve Dockerize otomasyonu sağlar. Hackathon kurallarına uygun commit mesajları, release yönetimi ve frontend/backend (Next.js + Nginx) Dockerize işlemlerini otomatikleştirir. ---

# Ne Zaman Kullanılır
- **Yeni bir Monad projesi oluştururken** (foundry.toml, Dockerfile, README gibi temel dosyaları ekler).
- **Commit mesajlarını standartlaştırmak istediğinizde** (feat/fix/docs gibi prefix'ler zorunlu kılar).
- **Her release'de README'yi otomatik güncellemek istediğinizde**.
- **Projeyi frontend (Next.js) ve backend (Nginx) olarak Dockerize etmek istediğinizde**.

# Ne Zaman Kullanılmaz
- **Monad dışındaki blockchain projeleri için** (Ethereum, Solana, vb.).
- **Hackathon dışındaki genel geliştirme süreçleri için** (bu durumda `monad-development` skill'ini kullanın).
- **Manuel müdahale gerektiren özel Docker konfigürasyonlarında**.

# Girdi Gereksinimleri
- **Proje adı**: Yeni proje için benzersiz bir isim (örn: `my-monad-dapp`).
- **GitHub repository URL'si**: Proje dosyalarını çekmek için.

# İş Akışı
1. **Proje Oluşturma**:
   - Temel proje dosyalarını (`foundry.toml`, `Dockerfile.frontend`, `Dockerfile.backend`, `docker-compose.yml`, `README.md`) oluşturur.
   - `scripts/setup-project.sh` script'ini çalıştırır.

2. **Commit Mesajı Doğrulama**:
   - Commit mesajlarını Conventional Commits standardına göre doğrular.
   - `scripts/validate-commit.sh` script'ini çalıştırır.

3. **README Güncelleme**:
   - Her release'de `CHANGELOG.md` ve `README.md`'yi otomatik günceller.
   - `scripts/update-readme.sh` script'ini çalıştırır.

4. **Dockerize**:
   - Frontend (Next.js) ve backend (Nginx) için Docker imajlarını build eder.
   - `scripts/dockerize-project.sh` script'ini çalıştırır.

# Dosyalar
- [`scripts/validate-commit.sh`](scripts/validate-commit.sh): Commit mesajlarını doğrular.
- [`scripts/update-readme.sh`](scripts/update-readme.sh): README ve CHANGELOG'u günceller.
- [`scripts/dockerize-project.sh`](scripts/dockerize-project.sh): Frontend ve backend Docker imajlarını build eder.
- [`references/hackathon-rules.md`](references/hackathon-rules.md): Monad Blitz Hackathon kuralları.

# Örnekler
## Yeni Proje Oluşturma
```bash
# Proje adı: my-monad-dapp
./scripts/setup-project.sh my-monad-dapp
```

## Commit Mesajı Doğrulama
```bash
# Commit mesajını doğrular
./scripts/validate-commit.sh "feat: add new payment contract"
```

## Dockerize
```bash
# Frontend ve backend Docker imajlarını build eder
./scripts/dockerize-project.sh
```

## Responsive Tasarım Desteği
Bu skill, **mobil ve masaüstü cihazlarda tam uyumluluk** sağlar.
- **Tailwind CSS** ile responsive tasarım.
- **Test Edilen Cihazlar**:
  - Mobil: iPhone 12+, Samsung Galaxy S21+
  - Masaüstü: 13" - 27" ekranlar
- **Ekran Görüntüleri**:
  - [`assets/mobile-screenshot.png`](assets/mobile-screenshot.png)
  - [`assets/desktop-screenshot.png`](assets/desktop-screenshot.png)
- **Viewport Testi**:
  ```bash
  ./scripts/check-responsive.sh