# Monad Teknik Mimarisi

Hiçbiri kontrat değişikliği gerektirmez. Mevcut Solidity kodu aynen deploy edilir.

## Asynchronous Execution
- **Nedir?**: Consensus (işlemlerin sırasına karar vermek) ile execution (işlemleri çalıştırmak) birbirini beklemez. Slaytlardaki benzetmeyle: garson sipariş almaya devam ederken mutfak bir önceki siparişleri pişirir.
- **Avantajı**: Her iki iş de bloğun tamamını kendine ayırabilir. Blok süresi aynı kalırken (0.3 s) blok başına çok daha fazla iş yapılır.
- **Karşılaştırma**: Ethereum'da execution, consensus sürecinin içine sıkışır (12 s blok).

## Optimistic Parallel Execution
- **Nedir?**: Bir bloktaki işlemler "çakışmıyor" varsayımıyla paralel çalıştırılır. Aynı state'e dokunan az sayıdaki işlem, doğru sırayla **yeniden çalıştırılır**.
- **Sonuç**: Çıktı, işlemlerin tek tek sırayla çalıştırılmasıyla birebir aynıdır. Sıralama semantiği değişmez.
- **Geliştirici ipucu**: Tek bir global sayaç veya slot'a herkesin yazdığı "hot slot" tasarımlarından kaçının. Kullanıcı başına mapping kullanmak paralelliği artırır.

## MonadBFT
- **Nedir?**: Monad'ın BFT consensus'u. Validator'lar tek turda anlaşır ve blok **600 ms**'de final olur.
- **Ölçek**: ~200 aktif validator, sıradan donanım.
- **Yakında**: *Cadence*, yani birden fazla eşzamanlı proposer ve yoğun pipelining.

## Raptorcast
- Bloklar parçalara bölünür ve ağa paralel olarak yayılır.

## MonadDB
- Blockchain state'i için özel olarak yazılmış bir veritabanı. State okuma darboğazını ortadan kaldırır.

## JIT Compilation
- Kontrat bytecode'u bir kez native koda derlenir ve sonraki çalıştırmalarda cache'ten çalışır.

## Rakamlar (Monad vs Ethereum L1)
| | Monad | Ethereum |
|---|---|---|
| Throughput | 500M gas/s | 5M gas/s |
| Block time | 0.3 s | 12 s |
| Finality | 0.6 s | ~13 dk |
| TPS | 10.000 | ~28 |

---

### Kaynaklar
- [Monad Docs](https://docs.monad.xyz)
- [Monad 101 Slides](../../../../Monad%20Blitz%20İstanbul%20Sept%202026%20-%20Monad101%20Slides.md)
