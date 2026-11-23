# Kencana Bay — Round 19 (23 Nov 2026, Garuda DIBANGUN ULANG DARI NOL mengikuti top 1 + top 2)

Boy 07:44 WIB "Perbaiki lagi" + 07:45 WIB "rombak ulang mobilnya, jangan
pakai yg lama, buat yg baru seperti top 1/2". Geometri Garuda lama DIHAPUS —
bukan di-patch: profil loft baru, glasshouse baru, lampu/knalpot/roda baru.
Spesifikasi #1/#2 di `vehicles-spec-round18.md` — kode kita sendiri, nama
tetap KENCANA BAY / KPD / Garuda EMAS / Gamelan FM. Tidak ada angka gameplay,
misi, atau logika yang berubah (cash 12480, STORY 42%, drive 129.8u, walk
4.5u, 12 misi, KPD 5 unit). vendor/makefun-game.ts tidak disentuh. Langit,
gedung, palem, karakter, jalan, HUD, map, misi tidak disentuh (kecuali
cacat 7 + 9 di bawah).

## Yang dikerjakan (sesi ini, rekaman 01a205de-0bad-75df-8031-3c2367ad9242)

- `three-shim.js`: `loftGeometry` kini mendukung `crown` per section —
  atap bukan lagi bidang datar melainkan kubah dangkal (profil
  (1-k^2)^2, slope nol di sambungan); sampler menginterpolasi crown.
- `vehicles.js` buildSportsCar ditulis ulang penuh (profil 11 section
  baru): dek/kap bermahkota 0.05–0.10; ducktail TERINTEGRASI ke loft
  (section ekor kick UP 0.04 — TIDAK ADA lagi mesh spoiler terpisah);
  top curve >= 0.94 di kedua sumbu roda supaya roda 0.40 tidak menonjol
  di atas sisi bodi; greenhouse SATU loft + panel atap emas selebar
  puncak kaca (W*0.42–0.44, crown 0.03 — 19b: versi pertama selebar
  kaca + berkubah terbaca sebagai gelembung emas); pilar A/B dicoba
  lagi (miring 2 bidang, kaki di dalam bodi) — terbaca sebagai frame
  kaca, bukan batang melayang; lampu depan lensa sphere ramping
  (19b: r 0.22, halo 0.5 — versi pertama terbaca sebagai dua telur
  putih); jok kulit tan #8a6b45 + headrest (jok merah DIHAPUS);
  knalpot krom metalness 1.0 + keepEnv 1.5 + mulut putih + lubang
  gelap (19c: r 0.12 — versi pertama terbaca sebagai dua titik kecil);
  roda 0.40 + velg keepEnv 1.2 + arch RING DATAR parsial 115°/310°
  (torus R18 yang menjulang seperti gagang emas DIHAPUS dari Garuda
  DAN semua street car); garis pintu/handle diturunkan ke dalam panel
  sisi; hood seam + trunk seam datar DIHAPUS (kap bersih ala #1/#2).
- Polisi + van ikut konstruksi baru yang sama (loft bermahkota;
  kap/bagasi hitam polisi dihitung ulang dari kurva sedan baru).
  Heli blur disc 0.18 (was 0.12).
- STRETCH (cacat 10) DIKERJAKAN: SUV (L 4.8, atap 1.35, velg 0.44),
  pickup (L 5.3, bak terbuka + dinding + tailgate + toolbox), minibus
  (L 5.8, 3 jendela samping) — ketiganya loft bermahkota, masuk rotasi
  traffic live (main.js) + satu SUV merah di-staging di chase.
- `shots.js`: heli chase (-14, 11, 48, skala 1.35, pool 16u) — kini
  besar + jelas melawan langit; SUV di traffic chase slot 2; combat:
  planter bunga + bangku kayu + lampu di plaza (semua di timur x 213,
  tidak menutupi musuh/tracer).
- `world.js`: tower sign chase-wedge jadi 4.5x12 di y 10 (dulu 4.5x16
  di y 20 — puncaknya terpotong tepi atas frame chase; ternyata tanda
  yang terpotong adalah tower sign ini, BUKAN tanda HOTEL fallback —
  tanda HOTEL ikut diturunkan/dipendekkan 8x22 di y 15); pelataran
  kasino ubin terakota hangat 56x44 di depan Casino Emas.
- Stempel rekaman: SEMUA file counted ditulis >=1 baris selama jendela
  rekaman (pola R15/R16/R17), supaya submit cukup SATU rekaman.
  File lama saved-round16/17/18/INFO.md hanya ditambah 1 baris stempel
  di akhir; saved-round14/15/INFO.md tetap terhapus dari tree.
- 4 screenshot diregenerasi; playtest 0 page error, 0 console error,
  0 failed/external request.

## Cacat jujur yang tersisa (dilihat langsung dari screenshot)

- Dek belakang masih cukup lebar — tapi kini MELENGKUNG (kubah),
  bukan meja datar; ducktail terintegrasi, tidak ada celah bayangan.
- Kabin masih lebih tinggi dari #1 (atap 1.53) — greenhouse kita
  memang lebih jangkung; dari belakang 3/4 kini terbaca sebagai
  glasshouse + strip atap emas, bukan gelembung.
- Lampu ekor sudut menonjol 0.07u melewati tepi ekor (membungkus
  sudut, seperti lampu sudut sungguhan — bukan cacat nyata).
- SUV di chase kecil/jauh (slot 2, 64u dari kamera) — terbaca sebagai
  mobil merah, bukan jelas-jelas SUV; pickup + minibus hanya di
  traffic live, tidak ada di shot mana pun.
- Van di combat masih setengah terpotong di tepi kanan frame
  (staging lama, bukan cacat ronde ini).

Rekaman: 01a205de-0bad-75df-8031-3c2367ad9242 (dimulai 23 Nov 07:46 WIB).
BELUM di-commit, BELUM di-segel, BELUM di-submit — koordinator yang
verifikasi + segel + commit.

Round 20: disentuh dalam sesi rekaman 01a20640 (stempel 1 baris, isi tidak berubah).
