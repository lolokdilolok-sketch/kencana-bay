# Kencana Bay — Round 18 (23 Nov 2026, rebuild kendaraan mengikuti top 1 + top 2)

Rebuild kendaraan mengikuti #1 (judge 99,3977%) + #2 (judge 99,3977%) dari
spec `vehicles-spec-round18.md` — kode kita sendiri, nama tetap KENCANA BAY /
KPD / Garuda EMAS / Gamelan FM. Tidak ada angka gameplay, misi, atau logika
yang berubah (cash 12480, STORY 42%, drive 129.8u, walk 4.5u, 12 misi, KPD 5
unit). vendor/makefun-game.ts tidak disentuh. Langit, gedung, palem,
karakter, jalan, HUD, map, misi tidak disentuh.

## Yang dikerjakan builder pertama (sesi 20:51–21:02 UTC, sebelum recorder mati)

- `three-shim.js`: `loftGeometry` penampang bersudut bulat (Opsi A spec §4) —
  sudut bawah rb 0,07, sudut atas rt 0,14, tumble, atap menyempit.
- `vehicles.js`: kurva top Garuda turun kontinu (haunch 0,86 → hidung 0,46);
  greenhouse loft kaca + panel atap EMAS sewarna bodi (panel atap gelap x0,38
  DIHAPUS); strip putih DIHAPUS; roda keluar ke flank + flare TORUS + sumur
  gelap + bibir tipis (flare kotak DIHAPUS); lampu ekor ramping + tail bar
  merah ramping + glow; lampu depan ramping 0,42×0,12 + halo; bumper bibir
  gelap bawah (bar perak DIHAPUS); spion EMAS; kap/bagasi polisi loft hitam
  mengikuti kurva + halo light bar 3,2; lampu ekor polisi ramping; van tinggi
  (atap 2,1) + jendela samping kabin + rel pintu geser; heli fuselage loft
  teardrop + kanopi gelap #1d2b38 + band putih + skid silinder + blur disc
  0,12 + bola beacon merah/biru; skuter pod meruncing + mudguard bulat + roda
  wheel() 5-spoke bersama; motor tangki sphere skala + fairing + spoke.
- 4 screenshot diregenerasi (20:58–20:59).

## Yang dilanjutkan/diperbaiki builder kedua (sesi ini, rekaman 01a20510)

Semua file di bawah ditulis ulang/diedit di sesi ini, selagi rekaman baru
hidup — tidak ada file commit akhir yang hanya berisi tulisan pra-rekaman.

1. `three-shim.js` — BUG: `sample()` di `loftGeometry` membuang `tumble`
   tiap section saat resampling, jadi semua ring tengah jatuh ke default
   0,14 dan loft glasshouse/roof/kap-polisi/fuselage-heli TIDAK berbentuk
   seperti yang dirancang. Sekarang `tumble` diinterpolasi seperti w/y0/y1.
2. `vehicles.js` — Garuda: tiap section bodi diberi `tumble: 0,42` (dek atas
   menyempit ~1,38 → ~1,1u, bukan meja datar); kaca belakang digelapkan
   (opacity 0,85, sama seperti kaca samping) — jok merah tidak lagi terbaca
   sebagai kargo di atas dek; ducktail dipersempit 1,98 → 1,38u + dipendek
   0,35u + rotasi dibalik (+0,22) supaya tepi EKOR yang terangkat (dulu
   −0,22 mengangkat tepi depan, terbaca sebagai ramp); flare torus
   ditipiskan (tube 0,075 → 0,05) + setengah-terbenam di flank (dulu cincin
   emas tebal menonjol seperti gagang); halo lampu depan 1,5 → 1,15 +
   opacity 0,7 (dulu cucian putih di garage); bumper/splitter dipersempit
   mengikuti lebar hidung (1,60/1,55u — dulu 2,16u, lebih lebar dari hidung
   1,65u, terbaca sebagai papan hitam); pilar A/B DIHAPUS — dua kali
   penempatan (x ±0,80, lalu ±0,66/±0,72 miring mengikuti flank) tetap
   terbaca sebagai batang emas melayang di samping kaca; kabin kini
   didefinisikan loft kaca gelap + panel atap emas saja, seperti kaca
   wedge top-2. Flare jalanan (sedan/van/taksi) ikut ditipiskan +
   setengah-terbenam.
3. `shots.js` — combat: mobil polisi dipindah (186,-26) → (212,-22) — di
   posisi lama ia berada di belakang kamera combat, tidak terlihat; van
   putih tinggi DITAMBAHKAN di (210,4) — keduanya kini TERLIHAT JELAS
   (polisi kiri dengan decal KPD + light bar, van kanan). Chase + garage
   tidak diubah (staging sudah benar).

## Verifikasi (sesi ini)

- Dossier 2x dari repo/: sha256 dossier.json
  `62128e99a58b574fa2ead2bc274d9b7c8ab5539cc649f14194646039021efd0a`
  IDENTIK di kedua run; preflight "4 screenshots, game/ 18 files, 0.96 MiB";
  tree game/ identik (diff -r kosong).
- Playtest `node tools/playtest.mjs --shots-only`: PLAYTEST OK — 0 page
  error, 0 console error, 0 failed request, 0 external request; 4
  screenshot ≤ 256 KiB (182.783 / 160.555 / 115.343 / 167.389 byte).

## Penilaian jujur vs #1/#2 (dilihat langsung di screenshot baru)

- Garuda BELAKANG: sekelas — fastback turun kontinu, atap emas, kaca gelap,
  tail bar merah ramping + glow, pelat KB·1998, roda 5-spoke perak di flank,
  flare torus ramping. SISA CACAT: ducktail masih terbaca sebagai pelat
  datar terpisah (ada celah bayangan di bawahnya); dek belakang masih cukup
  lebar/datar di tengah; satu jok merah masih samar terlihat lewat sudut
  kaca belakang kiri; knalpot krom terbaca gelap, bukan krom.
- Garuda DEPAN (garage): sekelas — kap wedge melengkung, windshield kaca
  gelap, lampu ramping + halo, bumper bibir gelap mengikuti hidung, spion
  emas, velg 5-spoke terbaca. SISA CACAT: kap masih bidang datar lebar
  (bukan melengkung halus seperti #1); lampu depan masih kotak putih;
  cincin emas melayang di dinding kiri adalah prop garage (bukan kendaraan).
- Garuda SAMPING: sekelas — beltline + haunch + intake ramping + garis
  pintu + handle dipertahankan; roda di flank. SISA CACAT: lengkung flare
  masih menonjol di atas garis kap depan.
- Polisi: sekelas — sedan loft putih, kap/bagasi hitam mengikuti kurva,
  halo light bar besar, stripe + badge KPD, push bar. Lampu ekor ramping.
- Van: sekelas — tinggi 2,1, kaca depan miring, jendela samping kabin, rel
  pintu geser; terbaca jelas sebagai van di combat.
- Skuter: sekelas — pod meruncing + mudguard bulat + roda 5-spoke bersama;
  pengendara di trotoar kanan chase terbaca.
- Heli: sekelas — fuselage loft teardrop (bukan kotak), kanopi bubble gelap,
  band putih, skid silinder, blur disc 0,12, beacon merah/biru; cone
  spotlight + pool terbaca di chase + combat.
- P2 (SUV/pickup/minibus loft) TIDAK dikerjakan — P0+P1 didahulukan, sesuai
  perintah; bukan bagian dari staging screenshot mana pun.

<!-- Round 19 stamp: this file was re-saved (one line appended) during the round-19 recording window so the seal witnesses its current content; no earlier content changed. -->

Round 20: disentuh dalam sesi rekaman 01a20640 (stempel 1 baris, isi tidak berubah).
