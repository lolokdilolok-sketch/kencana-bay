# Round 17 note (23 Nov 2026): this file was REWRITTEN in the round 17 recorded session
(recording 01a20436-d115-7464-a2c8-3a576d9345a4) so the seal can witness it — the original
round 16 content below is preserved verbatim. The round 16 build itself is unchanged
(commit a19c466); only this INFO.md file's bytes were re-authored in the new session.

# Kencana Bay — Round 16 (22 Nov 2026, boy 21:15 WIB "Perbaiki lagi")

Perbaiki 9 CACAT JUJUR ronde 15 saja, di atas ronde 15. VISUAL SAJA —
tidak ada angka gameplay, misi, atau logika yang berubah (cash 12480,
STORY 42%, drive 129.8u, walk 4.5u, 12 misi, KPD 5 unit, Garuda EMAS,
Gamelan FM, KENCANA BAY). Tidak ada fitur baru, tidak ada perubahan
gameplay.

Perubahan per cacat (semua diperiksa di screenshot baru, bukan cuma kode):
1. Totem ALUN-ALUN — panel 4x15 di (-15,10.5,72) jadi 4x12 di (-8,8.5,72),
   puncak y 14.5 (dulu 18, terpotong tepi atas frame); seluruh panel +
   alas kini masuk frame. (Catatan jujur: huruf tengah "ALUN-ALUN" masih
   tertutup panel weapon bar DOM — panelnya utuh di frame, teksnya
   sebagian di belakang HUD. Menggeser lebih ke timur akan menabrak papan
   gantry hijau.)
2. '-55' menumpuk STOP — damage sprite pindah ke (208.5,4.6,-10.5) (dulu
   209,3.2,-13); STOP sign combat pindah ke (221,-20) (dulu 219,-18).
   Keduanya kini terpisah jelas; STOP terbaca utuh.
3. Sign BENGKEL BAMBANG — 12x3 di (0,6.6) jadi 8x2 di (-2.5,6.2);
   "BENGKEL BAMBANG" kini utuh terlihat di dinding utara.
4. Tengah plaza kosong — 2 planter + semak (215,-20),(215,3), barrier
   belang (217,-8.5), mobil parkir kedua hatchback biru (224,-27);
   plaza tengah kini terisi tanpa menutupi tracer/musuh.
5. Kerucut spotlight heli — cone opacity 0.55 (dulu 0.32), radius 4.5,
   putih hangat #fff3c4; kolam cahaya chase 14u/0.7, combat 14u/0.7.
   Kerucut kini terbaca jelas di combat; di chase masih lebih samar
   melawan langit senja (kolam cahayanya yang lebih membaca).
6. Atap Garuda — roofColor x0.45 + hangat ke amber #7a4a00 (dulu x0.60),
   ridge x0.35. Atap kini emas hangat di chase (diukur: (251,238,186)
   di R15 → (255,229,158)).
7. Mobil garage tercuci lampu — PointLight 1.4→1.0, glow 2.6→2.2, kolam
   0.4→0.3, panel langit-langit 0.9→0.7; PLUS cat display car x0.55 +
   body matte (metal 0 / rough 0.9) + roofSlab bayangan di atas
   langit-langit. Kap kini emas sampanye hangat, bukan putih (diukur:
   (253,246,220) → (251,234,165)); kap tetap permukaan paling terang,
   tapi tidak lagi terbaca putih. Mobil chase tidak tersentuh.
8. Musuh kurang terbaca — flash pemain 2.0u (dulu 1.4), flash musuh 1.7u
   (dulu 1.1), tracer kini beam silinder additive r 0.05 (garis 1px lama
   dipertahankan), kolam merah di bawah tiap musuh. Tembakan kini terbaca
   dua arah; wajah/rambut tetap hanya jelas dari dekat, pose membidik
   dari kamera belakang tetap tidak terbaca sebagai pose — flash + beam
   yang menjual tembakan.
9. Pelanggan garage — pindah ke (3.5,-4), lantai terbuka tenggara lift,
   3u ke arah pintu (dulu 4,-7 di rak utara). Berdiri DI pintu tetap
   TIDAK MUNGKIN: pintu ada di belakang kamera garage, jadi pelanggan di
   pintu tidak akan pernah terlihat dari sudut ini.

Satu baris asli tiap file yang tidak berubah oleh perbaikan (syarat
rekaman): audio.js, input.js, random.js, three-shim.js, test-gl.html,
main.ts, serve.ts, missions.js, pedestrians.js, police.js, hud.js,
main.js, config.js, render.js, index.html. README.md (Screenshots)
diperbarui; shots.json tiap entri kini punya "round": 16.

Screenshot baru (regenerasi di sesi ini, playtest lolos 0 error):
1-chase 171.080 B, 2-combat 150.104 B, 3-garage 109.633 B,
4-map 161.983 B (semua ≤256 KiB).

Dossier diregenerasi 2x dari repo/ dan sha256 dibandingkan (lihat
laporan builder). Rekaman: 01a2039d-9320-701a-8350-c6f9ea14fa2e
(kit level terbaru). Semua penulisan file repo terjadi di sesi itu.
Commit yang akan dibuat: (koordinator yang membuat — builder tidak
commit, tidak seal, tidak submit).

<!-- Round 19 stamp: this file was re-saved (one line appended) during the round-19 recording window so the seal witnesses its current content; no earlier content changed. -->

Round 20: disentuh dalam sesi rekaman 01a20640 (stempel 1 baris, isi tidak berubah).
