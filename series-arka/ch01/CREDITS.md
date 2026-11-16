# Chapter 01 — PESAN DARI ORANG MATI: credits

## Story and narration
- Narration text: **Aldi**, original (series-arka/NARASI_AKU_SUDAH_MATI_7_HARI_YANG_LALU.md), used word for word.

## Voice (draft voice: voice/voice.wav, voice/words.json)
- TTS engine: **Piper** `piper-tts` 1.8.0 (Open Home Foundation, OHF-Voice/piper1-gpl), GPL-3.0-or-later. Phonemes come from the bundled **eSpeak NG** (GPL-3.0).
- Voice model: **`id_ID-news_tts-medium`** from rhasspy/piper-voices.
  - **The licence is NOT verified.** The official MODEL_CARD does not state a licence. Its dataset link points to an unrelated Malayalam corpus, as reported by third-party licence audits (e.g. smailoujaoura/aloud PIPER_VOICE_LICENCES.md and lithsec/translation-open-stack docs/licences.md).
  - Source used: HuggingFace is blocked in this sandbox, so the file was taken from the GitHub mirror `arifnugr/Projek-Skripsi` (models/). Its md5 `17de01db7ac654655436b6e509893c72` (onnx) and `c023cfa031cc9ed4cf5dd8d2ef1e48ed` (json) match the official piper-voices catalogue.
  - **Do not publish a video with this voice** until its licence is confirmed. The alternative is to replace it with a voice recorded by Aldi or a licensed TTS voice. If the replacement is read to the same timeline, the words.json timings and story.ts stay valid. Otherwise re-run the alignment and re-key CUE/LINE_F.
- Processing:
  - onnxruntime 1.32 (MIT) and onnx 1.23 (Apache-2.0) for the phoneme alignments.
  - numpy, scipy (BSD-3-Clause) and soundfile 0.14 (BSD-3-Clause) for the LPC whisper on line 18, the 22.05 → 48 kHz resample and the WAV writing.

## Picture (planned, nothing built or rendered yet)
- Kenney furniture kit (CC0) for apartment props, e.g. the shoe shelf in FOREGROUND. No attribution is required, but a credit is courteous.
- The look follows the private style study in the cartoon-3d-short skill. Per the skill rules, that channel is never named or credited publicly, and none of its scripts, characters or shots are copied.
