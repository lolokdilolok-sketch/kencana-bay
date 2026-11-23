# Round 20 — Garuda wedge baru + peta GPS + malam berbintang (23 Nov 2026)

Rekaman: 01a20640-5381-73dc-a411-434138972c99 (hidup sejak 09:33 WIB).
Basis: HEAD 5ce194f (ronde 19). Deadline game: 24 Nov 2026 22:00 WIB.
TIDAK disubmit — menunggu OK boy dari 4 screenshot + preview title.

## Yang dikerjakan

1. MOBIL — Garuda dibangun ulang dari profil wedge (top2-car-spec §3,
   car-ref §5): PANJANG (L 6.0), RENDAH (atap 1.49, belt 1.16),
   DATAR (crown 0, rise kaca 0.33, tumble 0.1, kap dipendekkan, kabin
   depan z +1.0). Roda r 0.46 ke flank (flank − 0.13). Lampu ekor PUTIH
   ramping di sudut + bumper bawah hitam, wing belakang kecil hitam,
   spion sewarna cat, satu pita kaca gelap. Warna tetap EMAS. Polisi +
   van ikut konstruksi baru yang sama. Pelat hitam di bawah bumper
   depan DIHAPUS. Skuter + heli tetap hasil R18/R19.
2. PETA — rebuild jadi tile-grid GPS seperti IMG_9406: grid kotak warna
   per distrik + RUTE GPS UNGU + titik checkpoint warna (kuning
   objektif, hijau safehouse, biru KPD, merah musuh) + story list kiri
   (12 misi KITA + harga kita) + stats kanan (STORY 42%, REP, CASH,
   TIME, WANTED, TAKEDOWNS, CARS STOLEN, STUNTS + cincin 42%) +
   legenda (KPD) + TUTUP [M] + TITLE + crew bar bawah.
   Header: "PETA KENCANA BAY — GPS AKTIF".
3. LANGIT — chase siang biru cerah + awan putih besar (16:00);
   combat MALAM 23:40 dengan BULAN BESAR + kerucut spotlight heli
   besar.
4. GEDUNG/JALAN/POHON — jalan aspal gelap garis kuning ganda + garis
   putih putus, gedung krem + grid jendela gelap, pohon bulat + palem.
   Menara kaca turquoise downtown dikurangi (25% → 10%).
5. TITLE — judul besar "KENCANA" (oranye-putih) + "CERITA JALANAN ·
   1998" + tombol MULAI/SAVE/LOAD/END GAME + Garuda emas profil
   samping DI ATAS ASPAL (jalan z=180) + langit biru + heli KPD
   kanan atas + bianglala + laut.
6. Nama misi diubah (hanya nama tampil, pay/type/target/brief sama):
   1 "Pulang Kampung", 10 "Mobil Curian", 11 "Pengkhianatan",
   12 "Pelarian Terakhir". Tidak ada nama kompetitor di dalam game.

## Perbaikan yang ditemukan saat verifikasi visual (round 20b)

- `three-shim.js` loftGeometry: KEDUA cap (hidung + ekor) winding-nya
  terbalik sejak awal — normal mengarah ke dalam mobil, cap
  ter-backface-cull, semua mobil lofted menampilkan interior gelap
  sebagai pelat hitam besar di hidung dan ekor (cacat ini ada sejak
  R17–R19: pelat hitam di hidung garage + muka ekor gelap di chase).
  Winding dibalik: hidung menghadap +z, ekor −z — kini emas seperti
  bodi.
- Bulan combat: dua posisi pertama tersembunyi di balik atap gedung
  ((550,180,-190) di balik blok kasino; (700,180,-10) 8,6° ke kanan
  sumbu kamera, di balik gedung selatan). Posisi akhir (700,185,-84):
  azimuth 0° (tengah), elevasi ~20°, terlihat besar di tengah atas.
- Garuda combat: posisi pertama (218,6) 40° ke kanan sumbu kamera,
  terpotong tepi frame/panel KPD. Posisi akhir (215,0,-3): profil
  samping penuh di tengah-kanan frame.
- Staging title: posisi pertama (-280,210) di atas PASIR blok pantai,
  heli (-270,18,225) di atas tepi atas frame. Posisi akhir: mobil di
  jalur jalan z=183 (aspal + garis kuning ganda), heli (-275,12,225)
  kanan atas, bersih dari teks judul dan bianglala (-280,240).

## File

- 0-title.jpg — preview title (TAMBAHAN, bukan bagian dossier).
- 1-chase.jpg (187.016 B), 2-combat.jpg (179.547 B),
  3-garage.jpg (113.098 B), 4-map.jpg (156.443 B).
- Playtest: 0 page error, 0 console error, 0 failed request,
  0 external request.

## Cacat jujur yang tersisa

- Mobil: dari sudut chase, pita kaca belakang masih terbaca agak
  tinggi; lampu depan masih berbentuk oval putih (agak "telur");
  dek belakang masih sedikit lebar vs top 1/2; belum ada
  SUV/pickup/minibus di traffic.
- Peta: rute GPS lurus menyiku (via jalan terdekat), bukan rute
  melengkung; label distrik kecil di layar 1280.
- Langit: chase masih ada satu menara kaca biru (peluang 10%);
  bulan combat setengah tertutup tepi gedung kiri (terbaca seperti
  bulan terbit di balik atap — wajar, tapi tidak penuh seperti
  referensi).
- Title: roda Garuda agak gelap dari sudut kamera ini (rim kurang
  terbaca); bianglala menabrak sedikit tepi kanan judul.
- Combat: kerucut spotlight menutupi sebagian teks "HIT! -12 HP";
  plaza masih dominan ubin terakota.

> Round 21 reseal note (23 Nov 2026, rekaman 01a206af-459d-70b9-900e-33e388ceab71): arsip ronde 20 ini DIPERTAHANKAN apa adanya — 5 JPG di sini tidak diubah; ronde 21 reseal hanya memperbaiki intake (main.ts ditulis ulang, screenshot diregenerasi ke saved-round21/, semua file teks distempel). Konten game sama dengan ronde 20.
> Round 22 reseal note (23 Nov 2026, rekaman 01a2092d-3178-7290-b1e2-da8c5e84af71): arsip ini tetap DIPERTAHANKAN apa adanya — 5 JPG tidak diubah; ronde 22 adalah ronde perbaikan visual (Garuda, staging chase/combat/garage, label peta), screenshot barunya ada di saved-round22/.
