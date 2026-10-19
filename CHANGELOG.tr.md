# Sürüm notları

PDKS Time Calculator'daki önemli değişiklikler burada listelenir. Bu dosya [CHANGELOG.md](CHANGELOG.md) dosyasının Türkçe karşılığıdır; her sürümde ikisi birlikte güncellenir.

## [1.7.0] - 2026-10-20

### Eklenenler

- Günlük hedefe veya o günün OOO'su dahil günlük üst sınıra ulaşıldığında isteğe bağlı tarayıcı bildirimleri ve test bildirimi düğmesi. Bildirim izni yalnızca bir bildirim açıldığında istenir.
- OOO (out of office) süresi artık tek tek günlere atanabilir; o günün günlük üst sınırını artırır ve ok tuşlarıyla 15 dakikalık adımlarla ayarlanabilir. Bugünün OOO düzenleyicisi alt bilgiden açılır.
- İçinde bulunulan aydaki geçen haftanın özeti: sayılan tarih aralığını ve tamamlanma durumunu gösterir, tamamlanmayan hedefler kırmızıyla işaretlenir.
- Açılır pencerenin alt bilgisine geri bildirim formu bağlantısı.
- Daha anlaşılır günlük ve haftalık çıkış saatleri.

### Düzeltmeler

- Molalar toplamlardan çıkarılır; izin sınırları normalize edilir.
- Devam eden oturumun giriş saati bir sonraki dakikaya yuvarlanır ve kesin çıkış saatleri temkinli süre yuvarlamasıyla korunur.
- Haftalık tamamlanma; günlük üst sınır, gece yarısı ve en geç çıkış sınırlarına göre doğrulanır, en erken giriş saati dikkate alınır.
- Açılır pencere yeniden içeriğe göre boyutlanır.

### Değişiklikler

- Yeni `alarms` izni ve isteğe bağlı `notifications` izni. Gizlilik politikası ikisini de açıklar.

## [1.6.2] - 2026-10-09

### Eklenenler

- Yapılandırılabilir çalışma kurallarıyla yeniden tasarlanan açılır pencere: günlük hedef, günlük üst sınır, kısa gün eşiği, en erken giriş, en erken ve en geç çıkış ile çalışma günleri.
- Herkese açık gizlilik politikası.

## [1.6.1] - 2026-08-26

### Değişiklikler

- Yarın planlayıcısı daha anlaşılır kontrollerle yeniden tasarlandı; günlük hedef ve istenen çıkış saati için 15 dakikalık adımlar eklendi, bugünün çıkış bilgisi öne alındı.

### Düzeltmeler

- Hafta hesaplamaları verilen hesaplama tarihini kullanır.
- Portal tarih, saat ve süre okuma daha sağlam hale getirildi; ilk ve son giriş-çıkış tespiti artık portaldaki satır sırasına bağlı değil.

## [1.6.0] - 2026-08-13

### Eklenenler

- Yapılandırılabilir ARGEPORTAL adresi ve daha dayanıklı çalışma planlaması.
- Sürümler Chrome Web Mağazası'na ve Firefox Eklentileri'ne otomatik olarak gönderilir.

## [1.5.1] - 2026-08-06

### Eklenenler

- Yeniden tasarlanan günlük ve haftalık özet kartları, haftalık halkada renkli günlük dilimler ve pazartesi–cuma dökümü.
- Yapılandırılabilir günlük hedef ve bugün ile yarın için giriş-çıkış planlaması; cuma planlaması haftadan kalan hedefi kullanır.

### Düzeltmeler

- Gün değişimleri, tamamlanan oturumlar, izne göre ayarlanan haftalık hedefler ve çıkış saatleriyle ilgili hesaplamalar.

## [1.5.0] - 2026-07-31

### Değişiklikler

- Sayfa içi panelden tarayıcı araç çubuğundaki açılır pencereye geçildi.
- Portal sekmesi kapalıyken de çalışabilmesi için günlük anlık görüntü önbelleği ve verinin eskidiğini gösteren uyarı.
- İlerleme halkaları ve tahmini çıkış saati kartıyla yeni gösterge paneli.

Daha eski sürümler [Releases](https://github.com/mrokumus/argeportal-hour-calculator/releases) sayfasında listelenir.

[1.7.0]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.6.2...v1.7.0
[1.6.2]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.5.1...v1.6.0
[1.5.1]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.4.0...v1.5.0
