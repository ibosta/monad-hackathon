--- name: claude-monad-research-assistant description: Claude Code ile Monad dökümanları ve kaynaklarına hızlı erişim sağlar. Monad Blitz Hackathon için gerekli bilgileri içerir. Monad RPC, faucet, akıllı kontrat örnekleri ve hackathon kuralları hakkında bilgi verir. ---

# Ne Zaman Kullanılır
- **Monad dökümanlarına hızlı erişim istediğinizde**.
- **Hackathon kuralları ve kaynakları hakkında bilgi almak istediğinizde**.
- **Monad'ın RPC, faucet ve diğer geliştirici araçları hakkında bilgi edinmek istediğinizde**.
- **Akıllı kontrat örneklerine ihtiyaç duyduğunuzda**.

# Ne Zaman Kullanılmaz
- **Proje geliştirme sürecinde** (bu durumda `monad-hackathon-development` kullanın).
- **Cüzdan veya akıllı kontrat entegrasyonu için** (bu durumda ilgili skill'leri kullanın).

# İş Akışı
1. **Soru Sorun**: Monad veya hackathon hakkında sorunuzu belirtin.
2. **Bilgi Sağlama**: İlgili referans dosyasından yanıt alınır.

# Dosyalar
- [`references/monad-docs.md`](references/monad-docs.md): Monad dökümanları ve kaynakları.
- [`references/hackathon-resources.md`](references/hackathon-resources.md): Hackathon kuralları ve öneriler.

# Örnekler
## Monad RPC Bilgisi
```bash
# Monad testnet RPC bilgilerini göster
cat references/monad-docs.md | grep -A 5 "RPC"
```

## Hackathon Kuralları
```bash
# Hackathon kurallarını göster
cat references/hackathon-resources.md | grep -A 10 "Zorunlu Kurallar"