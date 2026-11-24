# Kencana Bay — saved-round23 (reseal of the round 23 visual-fix round)
<!-- Round 23 reseal — arsip screenshot ronde 23 reseal, diregenerasi di rekaman 01a20c1f-b578-7008-8695-0658c39f79a9 -->
5 JPG: 0-title.jpg (title screen), 1-chase.jpg, 2-combat.jpg, 3-garage.jpg,
4-map.jpg. Keempat shot gameplay diregenerasi dengan
`node tools/playtest.mjs --shots-only` (seed=1, deterministik) dan
0-title.jpg diregenerasi dengan `node tools/shot-title.mjs`, semuanya di
dalam rekaman 01a20c1f-b578-7008-8695-0658c39f79a9 (Round 23 reseal).
Ronde 23: perbaikan 5 defect screenshot ronde 22 — bola api chase lebih
besar + pindah ke (16, 54) clear dari kerucut heli (inti kuning, asap
gelap 5 puff, scorch lebih lebar), barikade oranye 5.0u menghadap kamera,
roadblock KPD lebih dekat (74m/86m), heli geser ke (-26, 9.5, 55) dengan
kerucut lebih ramping; headlight garasi berlensa (housing gelap + lensa
kuning hangat + halo) + pool cahaya di lantai; neon "BENGKEL BAMBANG"
6x1.5 di (-4.2, 6.1) utuh di frame, poster GARUDA GT di ujung timur
dinding utara, jam geser ke (-2.2, 4.3); roda title dibangun ulang (ban
hitam, barrel gelap, lip perak, 5 spoke ramping, hub + centre cap),
footer title diangkat (margin bawah 52px); label PANTAI KIDUL digeser
+22px clear dari kolom nomor baris.
Reseal: rekaman ronde 23 pertama (01a20c08) tidak bisa dipakai karena VM
restart di tengah build membunuh recorder, jadi seluruh pekerjaan ronde 23
diulang di rekaman baru ini; isi file sama persis dengan ronde 23, hanya
stempel "Round 23" yang menjadi "Round 23 reseal".
