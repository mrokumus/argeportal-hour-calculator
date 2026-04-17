# PDKS Saat Hesaplayıcı — Chrome/Arc Eklentisi

**ARGEPORTAL** üzerindeki **PDKS Giriş-Çıkış Bilgileri Kartı** panelinde çalışma saatlerini doğrudan gösteren bir Chrome/Arc eklentisi.

> [ARGEPORTAL](https://sektorsoft.com/argeportal-teknopark-bilgi-yonetim-sistemi-yazilimi.html), teknopark yönetici şirketleri ve teknopark bünyesindeki girişimci firmalar için geliştirilmiş bir bilgi yönetim sistemidir. Bu eklenti yalnızca ARGEPORTAL kullanan firmalarda çalışır.

---

## Özellikler

- **Bugün** — İlk girişten itibaren çalışılan süre
- **Bugün Kalan** — Günlük hedefe (9 saat) ulaşmak için kalan süre
- **Bu Hafta** — Pazartesi'den itibaren tamamlanan günlerin toplam saati (bugün hariç)
- **Bugün + Bu Hafta** — Anlık haftalık toplam
- **Bu Hafta Kalan** — Haftalık hedefe ulaşmak için kalan süre
- **36 / 27 / 18 saat hedefleri** — Farklı haftalık eşikler için kalan süreler
- **Tahmini çıkış saati** — Bugün saat kaçta çıkabilirsin
- **İzin günü otomatik tespiti** — Hafta içi hiç giriş yapılmayan günler otomatik olarak izinli sayılır
- **OOO desteği** — Ofis dışında geçirilen süre haftalık hedefe eklenir
- **Önceki haftalar** — Panel üzerinden geçmiş haftaları görüntüleyebilirsin

---

## Kurulum

> Unpacked extension olarak yüklenir. Mağazada yer almaz.

1. [Son sürümü indir](../../releases/latest) ve zip'i aç **ya da** bu repoyu klonla
2. Tarayıcında `arc://extensions` veya `chrome://extensions` adresine git
3. Sağ üst köşedeki **Geliştirici modu**'nu aç
4. **"Paketlenmemiş öğe yükle"** butonuna tıkla
5. `pdks-extension` klasörünü seç

Eklenti simgesi araç çubuğunda görünecektir.

---

## Kullanım

1. **ARGEPORTAL**'a giriş yap
2. Sol menüden **PDKS > PDKS Giriş-Çıkış Bilgileri Kartı**'na git
3. Açılır menüden **mevcut ayın** seçili olduğundan emin ol
4. Araç çubuğundaki kum saati ikonuna tıkla
5. Sayfada özet kutusu belirecektir

### İzin / OOO Girişi

Panelin altındaki giriş alanlarından:

- **İzin (gün):** Hafta içi hiç çalışılmayan günler otomatik doldurulur. Elle değiştirirsen otomatik güncelleme o hafta için devre dışı kalır.
- **OOO (SS:DD):** Uzaktan ya da ofis dışı çalışılan süreyi gir (ör. `1:30`). Bu süre haftalık hedefe eklenir.

### Önceki Haftalar

Panel üst kısmındaki **◀ Önceki** / **Sonraki ▶** butonlarıyla geçmiş haftaları görüntüleyebilirsin.

---

## Orijinal Proje

Bu eklenti **burakdemirtas-jtf** tarafından geliştirilen bookmarklet'e dayanmaktadır:
https://github.com/burakdemirtas-jtf/show-week-working-hours
