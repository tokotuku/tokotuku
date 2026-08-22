# Takontuku AI Fixture Matrix

Sembilan fixture ini dibuat dalam sesi baru `gpt-5.6-luna` dengan reasoning `medium`.
Setiap hasil kemudian diaudit dalam sesi terpisah `gpt-5.6-terra` dengan reasoning `high`.
`FACTS.json` berasal dari checker deterministik; `EVALUATION.md` dirender dari JSON Terra.

| Fixture | Brand | Modul bisnis (+ `jarene`) | Tier | Terra |
| --- | --- | --- | --- | ---: |
| `compro-install` | Arunika Energi | `auth` | install | **96 PASS** |
| `compro-content` | Arunika Energi | `auth` | content | **92 PASS** |
| `compro-polished` | Arunika Energi | `auth` | polished | **95 PASS** |
| `product-install` | Racik Rasa | `catalog`, `orders` | install | **100 PASS** |
| `product-content` | Racik Rasa | `catalog`, `orders` | content | **100 PASS** |
| `product-polished` | Racik Rasa | `catalog`, `orders` | polished | **100 PASS** |
| `service-install` | Teman Ekor | `catalog`, `orders`, `booking` | install | **100 PASS** |
| `service-content` | Teman Ekor | `catalog`, `orders`, `booking` | content | **97 PASS** |
| `service-polished` | Teman Ekor | `catalog`, `orders`, `booking` | polished | **89 PASS** |

## Batas tier

| Tier | Yang boleh berubah | Yang wajib tetap berhenti |
| --- | --- | --- |
| install | scaffold, modul melalui CLI, migration, plumbing | tidak ada seed, content custom, theme override, atau asset custom |
| content | copy/halaman bisnis, data seed local-only dan idempoten | tidak ada theme override atau generated imagery |
| polished | content, palette/theme terarah, `DESIGN.md`, generated asset lokal | route commerce/admin tetap milik modul; tidak ada stock URL atau external raster |

Dependency business mengikuti urutan `orders → catalog` untuk produk dan
`booking → orders → catalog` untuk jasa. Fixture produk content/polished berisi enam produk,
kategori, harga minor-unit IDR, inventory, cart, dan checkout. Fixture jasa berisi tiga layanan,
satu schedule `range`, dua schedule `slot`, dan empat slot; scheduled service tidak memiliki
inventory.

Jalankan checker dari root repository:

```sh
bun tools/ai-fixture-eval/check.ts examples/<fixture-name>
```

`RUN-METADATA.json` membuktikan pin Luna generator; `REPAIR-RUN-METADATA.json` mencatat bounded
repair jika ada; `TERRA-RUN-METADATA.json` membuktikan pin Terra reviewer. Semua fixture final
melaporkan checker 0 error dan 0 warning. Review pertama yang gagal disimpan sebagai
`EVALUATION.attempt-1.md` sebelum repair, sehingga kritik seed, unit harga, scope, dan brand dapat
ditelusuri.

Setiap `EVALUATION.md` memuat skor rubric 100 poin, verdict, evidence, strengths, gaps,
rekomendasi berprioritas, production gaps, serta daftar over-engineered dan under-engineered
dengan severity dan lokasi file. `review.schema.json` menolak output Terra yang tidak terstruktur.

Polished Terra memeriksa PNG lokal yang dilampirkan pada sesi review. Browser desktop/mobile tidak
dapat mengambil halaman lokal di environment ini, jadi evaluasi tidak membuat klaim screenshot yang
tidak memiliki evidence. Wrangler listener juga dapat dibatasi sandbox; validasi seed memakai
SQLite dua siklus dan route ownership/migration source tetap diperiksa secara read-only.

Fixture lama sudah dihapus beserta referensi script, lockfile, README, dan test yang terkait.
