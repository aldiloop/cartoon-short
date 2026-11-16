# Chapter 01 voice: Piper TTS (id_ID-news_tts-medium) + phoneme alignments -> voice.wav (48 kHz mono, exactly
# 54.5 s = 1635 f @ 30 fps) and words.json ([{w, s, e, line}], seconds). The narration text is Aldi's original, word
# for word (series-arka/NARASI_AKU_SUDAH_MATI_7_HARI_YANG_LALU.md, CHAPTER 01). Only the TTS INPUT differs where the
# approved reading needs it: "02.17" is read "dua tujuh belas"; upper-case lines are fed in lower case so espeak
# does not spell them out. words.json always carries the exact original words.
# Usage: <venv>/bin/python make_voice.py <path/to/id_ID-news_tts-medium.onnx>
import json, os, sys
import numpy as np
import soundfile as sf
from scipy.signal import lfilter, resample_poly, butter, sosfilt
from piper import PiperVoice, SynthesisConfig

HERE = os.path.dirname(os.path.abspath(__file__))
FPS, TOTAL_F, OUT_SR = 30, 1635, 48000
TOTAL_S = TOTAL_F / FPS  # 54.5
OUTRO_S = 1.5
MIN_TOTAL_S = 45.0

# Line 2 speech 1.9 s instead of 1.4 ("dua tujuh belas" = 6 spoken words; 1.4 s rushed it), its pause after
# shrinks 0.8 -> 0.3 s; line 3 keeps its planned start, so the total is unchanged.
# (line no, planned start s, planned speech s, segments). segment = (tts text, exact words, tts words per exact word, gap after s)
LINES = [
    (1, 1.0, 3.9, [("Bayangkan jika suatu malam, ponselmu menerima pesan dari nomor teleponmu sendiri.",
                    "Bayangkan jika suatu malam, ponselmu menerima pesan dari nomor teleponmu sendiri.", None, 0)]),
    (2, 5.4, 1.9, [("Pukul dua tujuh belas dini hari.", "Pukul 02.17 dini hari.", [1, 3, 1, 1], 0)]),
    (3, 7.6, 3.2, [("Arka sedang sendirian di apartemennya ketika sebuah notifikasi muncul.",
                    "Arka sedang sendirian di apartemennya ketika sebuah notifikasi muncul.", None, 0)]),
    (4, 11.2, 1.8, [("Pesannya hanya berisi lima kata.", "Pesannya hanya berisi lima kata.", None, 0)]),
    (5, 13.5, 1.8, [("jangan buka pintu malam ini.", "\"JANGAN BUKA PINTU MALAM INI.\"", None, 0)]),
    (6, 16.5, 2.1, [("Awalnya Arka mengira seseorang sedang mengerjainya.",
                     "Awalnya Arka mengira seseorang sedang mengerjainya.", None, 0)]),
    (7, 19.1, 3.2, [("Namun beberapa detik kemudian, terdengar ketukan dari pintu depan.",
                     "Namun beberapa detik kemudian, terdengar ketukan dari pintu depan.", None, 0)]),
    # three knocks on a 0.9 s grid (f678 / f705 / f732): each "tok" is its own segment so the SFX can sit under it
    (8, 22.6, 2.4, [("Tok.", "Tok...", None, "grid"), ("tok.", "tok...", None, "grid"), ("tok.", "tok...", None, 0)]),
    (9, 26.0, 1.1, [("Arka mendekat perlahan.", "Arka mendekat perlahan.", None, 0)]),
    (10, 27.9, 0.4, [("Siapa?", "\"Siapa?\"", None, 0)]),
    (11, 29.5, 1.1, [("Tidak ada jawaban.", "Tidak ada jawaban.", None, 0)]),
    (12, 31.2, 1.4, [("Lalu ponselnya bergetar lagi.", "Lalu ponselnya bergetar lagi.", None, 0)]),
    (13, 33.0, 1.1, [("Pesan kedua muncul.", "Pesan kedua muncul.", None, 0)]),
    (14, 34.4, 2.9, [("aku tahu kamu sedang berdiri di depan pintu.",
                      "\"AKU TAHU KAMU SEDANG BERDIRI DI DEPAN PINTU.\"", None, 0)]),
    (15, 38.3, 1.8, [("Jantung Arka mulai berdegup kencang.", "Jantung Arka mulai berdegup kencang.", None, 0)]),
    (16, 40.7, 1.4, [("Ia mundur beberapa langkah.", "Ia mundur beberapa langkah.", None, 0)]),
    (17, 42.6, 2.1, [("Tiba-tiba, seseorang di luar pintu berbisik.", "Tiba-tiba, seseorang di luar pintu berbisik.", None, 0)]),
    # whispered (approved decision 4): LPC whisperisation below
    (18, 45.1, 2.0, [("Arka.", "\"Arka...", None, 0.25), ("buka.", "buka.", None, 0.15), ("Ini aku.", "Ini aku.\"", None, 0)]),
    (19, 48.1, 2.1, [("Yang membuat Arka hampir kehilangan akal.", "Yang membuat Arka hampir kehilangan akal...", None, 0)]),
    (20, 50.9, 1.8, [("Suara itu persis suaranya sendiri.", "Suara itu persis suaranya sendiri.", None, 0)]),
]
WHISPER = {18}
KNOCK_GRID = 0.9
# pauses we may lengthen if the measured total ever falls under 45 s (tension moments only, in this order)
TENSION_AFTER = [10, 5, 8, 18]


def synth(voice, text, ls):
    """-> (audio float32 @ voice sr, [(start_s, end_s)] per tts word, trimmed to speech)"""
    audio, al = [], []
    for ch in voice.synthesize(text, syn_config=SynthesisConfig(length_scale=ls, noise_scale=0.6, noise_w_scale=0.7),
                               include_alignments=True):
        if ch.phoneme_alignments is None:
            raise RuntimeError(f"no alignments for {text!r}")
        audio.append(ch.audio_float_array if hasattr(ch, "audio_float_array") else ch.audio_int16_array / 32768.0)
        al.extend(ch.phoneme_alignments)
    sr = voice.config.sample_rate
    x = np.concatenate(audio).astype(np.float32)
    # word spans from phoneme alignments: words are separated by ' ' phonemes; '^'/'$'/punctuation are not speech
    t, words, cur = 0, [], None
    for a in al:
        n = int(a.num_samples)
        p = a.phoneme
        if p == " " or p in "^$_.,?!;:":
            if cur is not None:
                words.append(cur); cur = None
        elif p not in "ˈˌ":
            cur = [t, t + n] if cur is None else [cur[0], t + n]
        elif cur is not None:
            cur[1] = t + n
        t += n
    if cur is not None:
        words.append(cur)
    # trim with a -45 dBFS energy gate (10 ms), keep 20 ms of air either side
    hop = sr // 100
    e = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2) + 1e-12) for i in range(0, len(x) - hop, hop)])
    on = np.where(20 * np.log10(e) > -45)[0]
    a0 = max(0, on[0] * hop - sr // 50); a1 = min(len(x), (on[-1] + 1) * hop + sr // 50)
    a0 = min(a0, words[0][0]); a1 = max(a1, words[-1][1])
    spans = [((s - a0) / sr, (min(e_, a1) - a0) / sr) for s, e_ in words]
    return x[a0:a1], spans


def whisperise(x, sr):
    """Replace the voiced excitation by noise through the same LPC envelope (25 ms frames, 50 % overlap)."""
    order, N, H = 18, int(0.025 * sr), int(0.0125 * sr)
    win = np.hanning(N).astype(np.float32)
    y = np.zeros(len(x) + N, np.float32)
    rng = np.random.default_rng(17)
    pre = lfilter([1, -0.9], [1], x)
    for i in range(0, len(x), H):
        f = pre[i:i + N]
        if len(f) < N:
            f = np.pad(f, (0, N - len(f)))
        fw = f * win
        r = np.correlate(fw, fw, "full")[N - 1:N + order]
        if r[0] < 1e-9:
            continue
        # Levinson-Durbin
        a = np.zeros(order + 1); a[0] = 1; err = r[0]
        for k in range(1, order + 1):
            acc = r[k] + np.dot(a[1:k], r[k - 1:0:-1])
            ref = -acc / err
            a[1:k + 1] = a[1:k + 1] + ref * a[k - 1::-1][:k]
            err *= (1 - ref * ref)
            if err <= 0:
                break
        g = np.sqrt(max(err, 0) / N)
        seg = lfilter([g], a, rng.standard_normal(N).astype(np.float32)) * win
        y[i:i + N] += seg.astype(np.float32)
    y = lfilter([1], [1, -0.9], y[:len(x)])
    y = sosfilt(butter(2, 300, "hp", fs=sr, output="sos"), y)
    return (y / (np.sqrt(np.mean(y ** 2)) + 1e-9) * np.sqrt(np.mean(x ** 2)) * 0.6).astype(np.float32)


def exact_words(seg_exact, counts, n_tts):
    ex = seg_exact.split()
    counts = counts or [1] * len(ex)
    if sum(counts) != n_tts or len(counts) != len(ex):
        raise RuntimeError(f"word map mismatch: {seg_exact!r} exact {len(ex)} / tts {n_tts} / counts {counts}")
    return ex, counts


def render_line(voice, segs, target, whisper):
    def build(ls):
        parts, words, t = [], [], 0.0
        for k, (tts, ex_text, counts, gap) in enumerate(segs):
            x, spans = synth(voice, tts, ls)
            if whisper:
                x = whisperise(x, voice.config.sample_rate)
            ex, counts = exact_words(ex_text, counts, len(spans))
            i = 0
            for w, c in zip(ex, counts):
                words.append({"w": w, "s": t + spans[i][0], "e": t + spans[i + c - 1][1]})
                i += c
            parts.append((t, x))
            dur = len(x) / voice.config.sample_rate
            t += (KNOCK_GRID if gap == "grid" else dur + gap) if k < len(segs) - 1 else dur
        return parts, words, t
    # bisection on length_scale so the line lasts `target` s; bounded to keep the read natural
    lo, hi = 0.6, 1.6
    best = None
    for _ in range(14):
        mid = (lo + hi) / 2
        parts, words, dur = build(mid)
        best = (mid, parts, words, dur)
        if abs(dur - target) < 0.03:
            break
        lo, hi = (mid, hi) if dur < target else (lo, mid)
    return best


def main():
    model = sys.argv[1]
    voice = PiperVoice.load(model, include_alignments=True)
    sr = voice.config.sample_rate
    rendered = []
    for no, start, target, segs in LINES:
        ls, parts, words, dur = render_line(voice, segs, target, no in WHISPER)
        rendered.append({"no": no, "plan_start": start, "target": target, "ls": ls, "parts": parts, "words": words, "dur": dur})
    # place lines on the approved plan; if a line runs long, keep >= 0.25 s air and push later lines
    t_prev_end = 0.0
    for r in rendered:
        r["start"] = max(r["plan_start"], t_prev_end + 0.25 if t_prev_end else r["plan_start"])
        t_prev_end = r["start"] + r["dur"]
    last_end = t_prev_end
    if last_end + OUTRO_S > TOTAL_S + 1e-6:
        raise RuntimeError(f"speech ends at {last_end:.2f} s, outro would overrun {TOTAL_S} s")
    # mix at the voice rate, then resample to 48 kHz and pad/cut to exactly 1635 frames
    buf = np.zeros(int(TOTAL_S * sr) + sr, np.float32)
    words_out = []
    for r in rendered:
        for t, x in r["parts"]:
            i = int(round((r["start"] + t) * sr))
            buf[i:i + len(x)] += x
        for w in r["words"]:
            words_out.append({"w": w["w"], "s": round(r["start"] + w["s"], 3), "e": round(r["start"] + w["e"], 3), "line": r["no"]})
    y = resample_poly(buf, 320, 147).astype(np.float32)
    n = int(round(TOTAL_S * OUT_SR))
    y = y[:n] if len(y) >= n else np.pad(y, (0, n - len(y)))
    peak = np.max(np.abs(y))
    y = y / peak * 10 ** (-1 / 20)  # -1 dBFS peak
    os.makedirs(HERE, exist_ok=True)
    sf.write(os.path.join(HERE, "voice.wav"), y, OUT_SR, subtype="PCM_24")
    json.dump(words_out, open(os.path.join(HERE, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    measured_total = len(y) / OUT_SR
    speech = sum(r["dur"] for r in rendered)
    report = {
        "total_s": round(measured_total, 3), "total_frames": round(measured_total * FPS),
        "speech_s": round(speech, 2), "silence_sfx_hold_s": round(measured_total - speech, 2),
        "first_word_s": words_out[0]["s"], "last_word_end_s": words_out[-1]["e"],
        "outro_s": round(measured_total - words_out[-1]["e"], 2),
        "exact_words": len(words_out), "rate_words_per_s": round(len(words_out) / speech, 2),
        "min_45_ok": measured_total >= MIN_TOTAL_S,
        "lines": [{"no": r["no"], "start": round(r["start"], 3), "plan_start": r["plan_start"], "dur": round(r["dur"], 3),
                   "target": r["target"], "length_scale": round(r["ls"], 3), "f": [round(r["start"] * FPS), round((r["start"] + r["dur"]) * FPS)]}
                  for r in rendered],
    }
    json.dump(report, open(os.path.join(HERE, "voice_report.json"), "w"), indent=1)
    print(json.dumps({k: v for k, v in report.items() if k != "lines"}, indent=1))
    for l in report["lines"]:
        print(l)


if __name__ == "__main__":
    main()
