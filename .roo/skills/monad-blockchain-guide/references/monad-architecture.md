# Monad Teknik Mimarisi

## Async Execution
- **Nedir?**: Monad, consensus ve execution katmanlarını ayırarak işlemleri paralel olarak yürütür.
- **Avantajı**: Block time'ı 0.3 saniyeye düşürür ve throughput'u artırır.
- **Karşılaştırma**: Ethereum'da consensus ve execution sırayla çalışır (12s block time).

## Parallel Execution
- **Nedir?**: Aynı blok içindeki bağımsız işlemler paralel olarak yürütülür.
- **Avantajı**: Aynı anda 10,000+ TPS işlenebilir.
- **Örnek**: İki farklı cüzdanın transfer işlemleri aynı anda yürütülür.

## MonadBFT
- **Nedir?**: Monad'ın consensus mekanizması (Byzantine Fault Tolerance).
- **Avantajı**: 200+ validator ile yüksek güvenlik ve hız sağlar.
- **Karşılaştırma**: Ethereum ~27,000 validator kullanır (daha yavaş finality).

## MonadDB
- **Nedir?**: Blockchain verilerini optimize eden özel veritabanı.
- **Avantajı**: Okuma/yazma işlemleri hızlanır, state büyümesi kontrol altında tutulur.

---

### Kaynaklar
- [Monad Docs](https://docs.monad.xyz)
- [Monad 101 Slides](Monad%20Blitz%20İstanbul%20Sept%202026%20-%20Monad101%20Slides.md)