# Cartoon 3D Short — Paket Kiro

Skill buat short vertikal 55–70 detik, gaya "karakter 2D di dunia 3D"
(flat, outline tinta, kota 3D, kamera meluncur, narasi + musik).
Dibuat pakai three.js di dalam Remotion, tanpa AI video generator.
Contoh yang sudah terbukti: "The Bridge That Fell for a Song" (67 detik).

Sumber: https://github.com/mromidev/claude-animated-shorts.git
Lisensi MIT, commit e3b817b. Skill asli tidak diubah sama sekali.

## Isi paket ini

```
.kiro/skills/cartoon-3d-short/
  SKILL.md            <- aturan + pipeline lengkap (ini yang dibaca Kiro)
  README.md           <- penjelasan asli dari pembuatnya
  LICENSE
  references/         <- STYLE_BIBLE.md, 7 laporan, 38 frame, 20 contact sheet
  templates/          <- source short jembatan, audio, script QA
```

Sudah dicek: nama folder `cartoon-3d-short` sama persis dengan `name:` di
SKILL.md, deskripsi 631 karakter (batas Kiro 1.024). Jadi Kiro langsung
mengenali skill ini tanpa diubah.

## Cara 1 — Kiro Web (yang dipakai Aldi, aldizain855)

Ini cara yang paling cocok buat Aldi karena Kiro Web dibuka dari HP.

1. Buat repo GitHub baru yang terpisah, misal `cartoon-shorts`.
   Jangan dicampur ke repo Send Food — biar konteks tidak kecampur.
2. Upload seluruh isi folder paket ini ke repo itu, jadi di repo ada
   folder `.kiro/skills/cartoon-3d-short/SKILL.md`.
3. Buka app.kiro.dev, login aldizain855, pilih **Select repository**,
   pilih repo `cartoon-shorts`, lalu **New session**.
4. Model: **Claude Opus 5.5**. Mode: **Build with spec** (boleh juga
   mode biasa kalau cuma mau naskah dulu).
5. Tulis prompt ini di chat Kiro:
   `Use the cartoon short skill and make a short about [topikmu]`
   Contoh: `... about the 1831 Broughton bridge` (itu contoh aslinya).
   Atau ketik `/cartoon-3d-short` lalu tulis topiknya.

## Cara 2 — Kiro desktop / Kiro CLI (di komputer)

1. Salin folder `.kiro/skills/cartoon-3d-short/` ke:
   - global (semua proyek): `~/.kiro/skills/cartoon-3d-short/`
   - atau per proyek: `[folder-proyek]/.kiro/skills/cartoon-3d-short/`
2. Buka Kiro, ketik `/cartoon-3d-short` atau tulis prompt seperti di atas.
3. Di Kiro IDE juga bisa lewat panel **Agent Steering & Skills**,
   tombol **+**, pilih **Import a skill**, lalu pilih folder / ZIP ini.

## Alur kerja skill ini (singkat)

1. Pilih satu kisah nyata yang mengejutkan + ada sebab-akibat fisiknya.
2. Tulis naskah 55–70 detik (hook, setting, aksi, snap, penjelasan
   pakai analogi sehari-hari, akibat, twist penutup).
3. Siapkan suara narasi (`voice.wav`) + timing kata (`words.json`).
4. Kiro menyusun shot plan di `story.ts`, mulai dari template jembatan.
5. Cek tampilan dari stills, bandingkan dengan frame referensi.
6. Render akhir 2K vertikal (1440x2560) + gabung audio.

## Yang penting diketahui sebelum mulai

- **Cerita, karakter, dan suara harus buatan sendiri.** Frame dan
  laporan di `references/` hanya untuk studi gaya — jangan di-upload,
  jangan ditiru naskah/karakter/shot-nya, jangan sebut nama channel-nya.
- **Aturan bawaan skill:** tanpa caption/label di video, bahasa Inggris,
  satu nada suara, musik +3 dB, SFX -6 dB.
- **Render butuh komputer:** Node, Python 3, ffmpeg, dan Remotion
  + `@remotion/three`. Kiro Web di HP kemungkinan hanya bisa sampai
  naskah + kode. Render akhirnya bisa dijalankan di VM Muse (Node,
  Python, ffmpeg sudah ada di sana) atau di PC.
- **Kredit:** pipeline ini panjang (naskah, shot plan, cek gambar,
  render, QA). Pakai Opus 5.5, jadi cek sisa kredit Kiro dulu sebelum
  mulai satu short penuh. Kalau mau hemat, minta Kiro kerjakan
  tahap 1–2 dulu (topik + naskah), baru lanjut kalau naskahnya oke.
