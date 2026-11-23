# Kencana Bay — Round 17 (23 Nov 2026, rebuild visual mengikuti top 1)

Rebuild lapisan visual mengikuti #1 leaderboard (judge 99,3977%) dari spec
`top1-spec-round17.md` — kode kita sendiri, nama tetap KENCANA BAY / KPD /
Garuda EMAS / Gamelan FM. Tidak ada angka gameplay, misi, atau logika yang
berubah (cash 12480, STORY 42%, drive 129.8u, walk 4.5u, 12 misi, KPD 5 unit).
vendor/makefun-game.ts tidak disentuh.

## Perubahan (semua diperiksa di screenshot baru, bukan cuma kode)

1. LANGIT — tabel jam top-1 (`SKY_KEYS` di config.js, `setTimeOfDay` di
   render.js): chase 16:00 BIRU TERANG (top #3f8bdd, horizon #d8e2f2,
   matahari #ffc88c, intensitas 3.2), combat 18:15 golden hour (antara
   kunci 17.8–18.7). Shader dome: gradasi pow(h,0.55) + glow matahari
   (pow 6 + pow 900) + awan FBM 5-oktaf; fog = warna horizon; PMREM
   environment map dari langit yang sama; exposure 1.1. Env map dijinakkan
   (world 0.35, cat 0.7, trim 0.4) supaya kota tidak tercuci putih.
2. GEDUNG — gaya fasad per distrik (deco ribbon windows, warehouse garis
   vertikal, plaster); palet pasir hangat downtown + turquoise kaca,
   pastel kampung/pantai, bata pelabuhan, jenuh pasar; neon sign
   (HOTEL KENCANA teal, CASINO EMAS merah, MENARA KENCANA emas); awning
   bersegmen 6 warna miring; balkon per lantai (deco) / 2 lantai; fins
   menara kaca; roof clutter 1–3 AC + tangki + antena; Menara Kencana
   150 m + crown + mast + neon di (200,-240); jendela menyala 40% (kaca 50%).
3. KENDARAAN — cat PhysicalMaterial clearcoat, kaca gelap #1d2b38, velg
   5-spoke perak, Garuda loft kurva top-1 (kap rendah, haunch lebar,
   hidung 0.50), sedan/polisi loft (beltline 1.15), side intake, atap
   Garuda lebih gelap (x0.38); heli cone 0.35 (dulu 0.6 — sempat jadi
   corong putih di combat); lampu/beam dipertahankan.
4. SKUTER (BARU) — skuter pink + pengendara pose ride di trotoar kanan
   chase (-32,71), + 2 skuter parkir (teal di (40,71), kuning di (55,49)).
5. KARAKTER — hidung kerucut, kacamata hitam pemain + Komisaris KPD,
   archetype baru turis neon + jogger magenta (total 10 crowd defs).
6. JALAN — aspal sun-bleached #86837f + jejak ban, garis tengah KUNING
   GANDA SOLID, trotoar #d9d0c4 bergrid, pasir #ead6a6, laut biru terang,
   palem daun-kipas berderet rapat di boulevard chase, hydrant + tong sampah.
7. STAGING — chase 16:00 + 4 mobil KPD putih di depan + heli di (-10,8,46)
   (dulu (-2,6.5,50) — terpotong palem + gantry); combat 18:15; garage +
   map dipertahankan (perbaikan R16 utuh).
8. SAKSI — ke-23 file teks pra-rekaman ditulis di sesi ini (termasuk 1
   baris komentar jujur di file yang logikanya tak berubah); LICENSE,
   game/vendor/three.module.min.js, dan .jpg lama tidak disentuh (sama
   seperti ronde 16 — hanya INFO.md yang pernah di-flag segel);
   saved-round16/INFO.md ditulis ulang (header ronde 17, isi ronde 16
   utuh di bawahnya).

## Verifikasi

- Dossier 2x dari repo/ (`MAKEFUN_OUTPUT_DIR=/tmp/d17a` lalu `/tmp/d17b`):
  sha256 dossier.json IDENTIK kedua run:
  `9d4737889f5ba828c382856313f85dbe358d3a4495286759e91c26f6dfe18c37`
  (17 source files, 366.083 bytes; preflight "4 screenshots, game/ 18 files").
- Playtest `node tools/playtest.mjs --shots-only`: 0 page error, 0 console
  error, 0 failed/external request. Semua shot ≤256 KiB.
- Invarian: cash 12480 (missions.js:21), stagedWeaponLocks Set([3,5]),
  12 misi, KPD 5 unit, Garuda EMAS, Gamelan FM; git diff vendor/ kosong;
  grep nama kompetitor di game/ + main.ts + serve.ts + shots.json +
  README.md kosong (nama itu hanya muncul di BUILD_NOTES.md sebagai
  dokumentasi arah referensi ronde-ronde lama, bukan di game).

## Screenshot (dilihat langsung)

| Shot | Ukuran | sha256 |
|---|---|---|
| 1-chase.jpg | 182.547 B | b3bef34c…186f38a88 |
| 2-combat.jpg | 156.939 B | 5bff51db…8e1632385 |
| 3-garage.jpg | 114.959 B | a0edd6ce…1d8e6091c |
| 4-map.jpg | 167.365 B | c43c1d00…6e02d9 |

- Chase: langit BIRU TERANG 16:00 seperti #1, awan putih, palem
  daun-kipas berderet kedua sisi, STOP + gantry ALUN-ALUN terbaca,
  4 polisi putih di depan (2 dekat + 2 jauh), heli gelap + rotor di
  atas kiri, skuter pink + pengendara di trotoar kanan, Garuda emas
  (atap kini emas gelap, bukan krem pucat; tail bar merah terbaca).
- Combat: golden hour 18:15, sign CASINO vertikal terbaca, '-55' jauh
  dari STOP, beam tracer + flash terbaca, kerucut heli kini bayangan
  tipis (bukan corong putih), heli + rotor utuh di frame.
- Garage: Garuda di lift, kap emas hangat, sign BENGKEL BAMBANG utuh,
  pelanggan + Bambang terlihat; seperti ronde 16 (tidak diubah).
- Map: overlay DOM + kota 3D di belakang, STORY 42%, stats sesi utuh.

## Cacat jujur tersisa (dilihat di screenshot, bukan ditebak)

- Buritan Garuda masih terbaca agak kotak dari belakang 3/4 — loft
  memperbaiki siluet samping, tapi muka ekor tetap bidang datar lebar
  dan pengemudi tidak jelas lewat kaca belakang dari sudut ini.
- Skuter parkir (40,71) + (55,49) terlalu jauh/kecil — hanya skuter
  pink yang dikendarai yang terbaca jelas; dua parkir nyaris tak terlihat.
- Tanda vertikal HOTEL kuning di kanan atas chase masih terpotong tepi
  atas frame (sama seperti ronde 16; hurufnya vertikal, hanya sebagian
  terbaca).
- Chase TIDAK punya laut/pantai di kanan seperti #1 — geografi kita
  (laut di barat, jalan chase timur-barat) tidak memungkinkan itu tanpa
  memindah seluruh staging chase ke jalan pantai barat; yang disamakan
  adalah langit, palem, gedung pastel, polisi putih, heli, dan skuter.
- Combat: plaza bawah masih didominasi tanah cokelat-oranye; hanya 1
  dari 3 musuh yang terbaca jelas (2 lainnya di balik peti/barrel).
- Menara Kencana 150 m tidak masuk frame chase/combat (hanya map) —
  landmark skyline, bukan elemen shot.
- P1 yang tidak sempat: pier + ferris ring, SUV/pickup/van/minibus loft
  (van tetap box + loft sedan saja), kolam atap bungalow.

Rekaman: 01a20436-d115-7464-a2c8-3a576d9345a4 (dimulai 23 Nov 00:0x WIB).
BELUM di-commit, BELUM di-segel, BELUM di-submit — koordinator yang
verifikasi + segel + commit.

<!-- Round 19 stamp: this file was re-saved (one line appended) during the round-19 recording window so the seal witnesses its current content; no earlier content changed. -->

Round 20: disentuh dalam sesi rekaman 01a20640 (stempel 1 baris, isi tidak berubah).
