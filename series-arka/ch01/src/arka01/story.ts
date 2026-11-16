// Timeline of "AKU SUDAH MATI 7 HARI YANG LALU" — CHAPTER 01 "PESAN DARI ORANG MATI" (Arka series).
// Same structure and camera grammar as templates/bridge/story.ts (cartoon-3d-short skill): SHOTS / XFADE / CAMS /
// KICKS / DOF / FOREGROUND, every hold creeps, glides are symmetric smootherstep 18-40 f centred on their word,
// impacts are 7-frame flip kicks. Differences approved for this chapter (session 16 Nov 2026):
//   - light "night" only (moon key through the window + HDR practicals: phone screen, door gap, clock LED);
//   - Indonesian narration, Aldi's original text word for word (voice/words.json); 54.5 s = 1635 f @ 30 fps;
//   - decision 1: the phone shows the ORIGINAL message text as in-world UI (SCREEN_TEXT);
//   - decision 2: an in-world digital clock reads 02.17 (CLOCK_TEXT) on the low table next to the phone;
//   - decision 3: a 4-frame BLACK dip after the hook (DIP), no white flash;
//   - decision 4 is audio only ("dua tujuh belas", whispered line 18) — see voice/make_voice.py;
//   - fade-out to black f1590-1635 (FADE_OUT), listed as a planned-black exception in shots.json for short_qa.py.
// All word cues below are frames measured from voice/words.json (word onset s x 30, rounded).
export const FPS = 30;
export const TOTAL = 1635; // 54.5 s (minimum per chapter: 45 s)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- word cues (frames, from voice/words.json) ----------------
/** onset frame of the words the picture reacts to (reactions land 0-3 f before these) */
export const CUE = {
  bayangkan: 32, pukul: 162, notifikasi: 295, muncul3: 312, lima: 370, jangan: 407, mengerjainya: 541,
  ketukan: 632, tok1: 681, tok2: 710, tok3: 737, mendekat: 790, siapa: 839, siapaEnd: 850, tidak: 887,
  bergetar: 958, pesanKedua: 991, aku: 1037, berdegup: 1178, kencang: 1189, mundur: 1230, langkahEnd: 1261,
  berbisik: 1329, arkaWhisper: 1356, persis: 1548, sendiri: 1569, lastWordEnd: 1579,
} as const;
/** [first word onset, last word end] per narration line (words.json), for the sound timeline and checks */
export const LINE_F: [number, number][] = [
  [32, 144], [162, 217], [231, 322], [338, 387], [407, 457], [497, 555], [575, 666], [681, 747], [783, 810], [839, 850], [887, 915], [938, 976], [991, 1020], [1037, 1116], [1151, 1200], [1226, 1261], [1280, 1340], [1356, 1410], [1445, 1504], [1531, 1579],
];

// ---------------- set layout (metres, y up, floor y = 0) ----------------
// Studio flat: window wall at z = -3.6 behind the sofa; low table in front of the sofa; a short corridor runs along +x
// from the living room (x = 2.2) to the front door (x = 6.6, facing -x). The exterior block is a separate set far away.
export const WINDOW: V3 = [0, 1.5, -3.6]; // 2.2 x 1.6 m, horizontal blinds (moon stripes)
export const SOFA: V3 = [0, 0, -2.6]; // faces +z, seat 0.45 m, back top 0.85 m
export const TABLE: V3 = [0, 0, -1.3]; // low table, top at 0.42 m
export const PHONE_TABLE: V3 = [0.25, 0.43, -1.25]; // lying flat, screen up
export const CLOCK: V3 = [-0.32, 0.43, -1.32]; // digital clock on the table, face turned 20 deg toward +x+z
export const ARKA_SOFA: V3 = [0.15, 0, -2.1]; // seated card plane, just in front of the seat edge (z -2.2); feet on the floor
export const PHONE_SOFA_HAND: V3 = [0.2, 0.98, -1.85]; // in his hands on the sofa, screen toward his face
export const PHONE_SOFA_DROP: V3 = [0.62, 0.47, -2.5]; // where the toss lands (on the seat)
export const DOOR: V3 = [6.6, 1.0, 0]; // door centre (2.0 x 0.9 m), interior face toward -x; peephole at 1.55 m
export const DOOR_GAP: V3 = [6.6, 0.01, 0]; // 2 cm light strip under the door (corridor light outside)
export const WALK0: V3 = [4.2, 0, 0], AT_DOOR: V3 = [5.6, 0, 0], BACKED: V3 = [4.6, 0, 0];
export const BLD: V3 = [0, 0, -150]; // exterior apartment block (24 w x 30 h m, window grid)
export const LIT_WINDOW: V3 = [-3.5, 19.5, -138]; // Arka's window, 7th floor
export const SIT_EYE = 1.3, STAND_EYE = 1.55; // eye heights of the Arka cards (2.33 mm per design unit, sofa seat 0.45 m)
export const PHONE_DOOR_HAND = (f: number): V3 => { const p = arkaPos(f); return [p[0] + 0.25, 1.2, p[2] + 0.05]; };
/** where the phone is at frame f (table -> his hands -> tossed onto the sofa -> in his hand at the door) */
export const phonePos = (f: number): V3 => {
  if (f < 312) return PHONE_TABLE;
  if (f < CUE.mengerjainya) return lerp3(PHONE_TABLE, PHONE_SOFA_HAND, smooth((f - 312) / 20));
  if (f < 556) { const u = (f - CUE.mengerjainya) / (556 - CUE.mengerjainya), p = lerp3(PHONE_SOFA_HAND, PHONE_SOFA_DROP, u); return [p[0], p[1] + 0.25 * Math.sin(Math.PI * u), p[2]]; }
  if (f < 780) return PHONE_SOFA_DROP;
  return PHONE_DOOR_HAND(f);
};

// ---------------- light: "night" ----------------
export type Light = "day" | "golden" | "night";
type C3 = [number, number, number];
/** NIGHT preset for lights.ts (same field names as LIGHTS.day / LIGHTS.golden; lights.ts imports it). The moon is the
 *  "sun": camera-relative and frozen per shot like the bridge sun (az from the shot camera's forward axis, 0 = backlight).
 *  Targets: median luma ~.18-.22, non-ink p5 ~.06 so the #030303 world ink still reads on the walls; shade stays
 *  blue-violet, never brown. */
export const NIGHT = {
  az: -35, el: 22,
  lit: [0.55, 0.66, 1.0] as C3, shade: [0.07, 0.075, 0.13] as C3, lift: [0.03, 0.035, 0.07] as C3, lambert: 0.35, sideK: 0.8, term: 0.12,
  charTint: [0.62, 0.7, 0.95] as C3, charShade: 0.8, charGrad: 0.12, bodyGrad: 0.3, sideTint: [0.75, 0.8, 1.0] as C3,
  blob: [0.5, 0.52, 0.65] as C3, actorShadow: false,
  top: "#0b1026", hor: "#2a3156", skyCurve: [0.0, 0.5, 0.8] as C3, fog: "#1d2340", fogNear: 15, fogFar: 160, sunDisc: "#dfe8ff",
  sunCol: "#9fb4ff", sunI: 1.2, sky: "#3a4670", ground: "#1a1824", hemiI: 0.25,
  bias: -0.0004, normalBias: 0.02,
};
/** NIGHT world look for lights.ts LOOK (sky stops by elevation: low sodium/violet city glow -> deep blue) */
export const NIGHT_LOOK = {
  sky: { c: ["#3b2f4a", "#2a3156", "#1c2346", "#121a3a", "#0b1026"], e: [0, 3, 8, 16, 40] },
  water: { near: "#101830", mid: "#0c1428", far: "#1a2040", crest: "#2a3460", trough: "#070b18", glint: "#cfd8ff", shade: [0.4, 0.44, 0.6] as C3 },
  bounce: [0.01, 0.01, 0.02] as C3,
  sat: 0.95,
  cloud: { lit: "#5a6488", mid: "#3a4166", shade: "#222842" },
};

// ---------------- shots ----------------
export type Cast = "arka" | "none";
export type SetName = "interior" | "exterior";
/** moon: per-shot camera-relative key (az/el in degrees) and its strength k (corridor shots only get spill) */
/** view: which card of Arka the shot needs. "back" (over-the-shoulder shots 4, 8, 9) does not exist in the bridge
 *  toon.ts (front + side only): bodyBack must be added to toon.ts / cast.ts before these shots can render. */
export type ArkaView = "front" | "side" | "back";
export type ShotDef = { id: number; a: number; b: number; light: Light; cast: Cast; set: SetName; tau: (t: number) => number; moon?: { az: number; el: number; k: number }; view?: ArkaView };
const real = (t: number) => t;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 162, light: "night", cast: "none", set: "interior", tau: real, moon: { az: 20, el: 25, k: 0.8 } }, // hook: phone insert
  { id: 2, a: 162, b: 228, light: "night", cast: "none", set: "exterior", tau: real, moon: { az: 40, el: 30, k: 1 } }, // "Pukul 02.17": block exterior
  { id: 3, a: 228, b: 405, light: "night", cast: "arka", set: "interior", tau: real, moon: { az: 25, el: 22, k: 1 }, view: "front" }, // studio WS -> MS, notification
  { id: 4, a: 405, b: 495, light: "night", cast: "arka", set: "interior", tau: real, moon: { az: 165, el: 25, k: 0.9 }, view: "back" }, // OTS phone: message 1
  { id: 5, a: 495, b: 573, light: "night", cast: "arka", set: "interior", tau: real, moon: { az: 20, el: 22, k: 1 }, view: "front" }, // MS skeptical, toss
  { id: 6, a: 573, b: 678, light: "night", cast: "arka", set: "interior", tau: real, moon: { az: -15, el: 22, k: 1 }, view: "front" }, // MS, head snaps to the door
  { id: 7, a: 678, b: 780, light: "night", cast: "none", set: "interior", tau: real, moon: { az: -90, el: 15, k: 0.35 } }, // corridor + door: tok x3
  { id: 8, a: 780, b: 936, light: "night", cast: "arka", set: "interior", tau: real, moon: { az: -90, el: 15, k: 0.35 }, view: "back" }, // walk to the door, "Siapa?"
  { id: 9, a: 936, b: 1032, light: "night", cast: "arka", set: "interior", tau: real, moon: { az: -100, el: 15, k: 0.3 }, view: "back" }, // phone insert: message 2
  { id: 10, a: 1032, b: 1149, light: "night", cast: "arka", set: "interior", tau: real, moon: { az: -70, el: 15, k: 0.35 }, view: "front" }, // high angle "watched"
  { id: 11, a: 1149, b: 1278, light: "night", cast: "arka", set: "interior", tau: real, moon: { az: -120, el: 15, k: 0.35 }, view: "side" }, // CU heartbeat, steps back
  { id: 12, a: 1278, b: 1443, light: "night", cast: "none", set: "interior", tau: real, moon: { az: -90, el: 10, k: 0.25 } }, // floor-level door gap: whisper
  { id: 13, a: 1443, b: TOTAL, light: "night", cast: "arka", set: "interior", tau: real, moon: { az: -120, el: 15, k: 0.35 }, view: "front" }, // ECU eyes, fade to black
];
/** crossfades (frames) at place changes: exterior -> interior only; everything else is a hard cut */
export const XFADE: Record<number, number> = { 3: 8 };
/** decision 3: 4-frame black dip after the hook, centred on the 1 -> 2 cut (frames 160-163 are black) */
export const DIP = { a: 160, n: 4 };
/** fade to black at the end: smootherstep 1590 -> 1620, then black to 1635 (0.5 s for the sound tail) */
export const FADE_OUT = { a: 1590, full: 1620, b: TOTAL };
/** black overlay opacity at frame f (0 = picture, 1 = black), read by the composition */
export const blackAt = (f: number) => {
  if (f >= DIP.a && f < DIP.a + DIP.n) return 1;
  if (f >= FADE_OUT.a) return smooth((f - FADE_OUT.a) / (FADE_OUT.full - FADE_OUT.a));
  return 0;
};

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** layers to draw at frame f: base shot, plus the next shot fading in during a crossfade */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state: Arka ----------------
// Expression names are the existing toon.ts library (Expr); "shock" doubles as fear/horror here.
export type ArkaExpr = "neutral" | "smile" | "nervous" | "shock" | "stern" | "fear";
export type ArkaMode = "sit" | "stand" | "walk" | "stepBack";
export type ArkaState = {
  pos: V3; yaw: number; mode: ArkaMode; phase: number; expr: ArkaExpr;
  look: number; // head turn -1..1 (+1 = toward the door / +x)
  blinkOK: boolean; talk: boolean; phone: "none" | "hand" | "toss";
};
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** Arka's feet position: on the sofa until shot 8; slow walk 4.2 -> 5.6 m (f783-835, ~0.8 m/s, 0.5 m stride);
 *  two steps back 5.6 -> 4.6 m on "mundur beberapa langkah" (f1226-1262) */
export const arkaPos = (f: number): V3 => {
  if (f < 780) return ARKA_SOFA;
  if (f < 1226) return lerp3(WALK0, AT_DOOR, smooth((f - 783) / (835 - 783)));
  return lerp3(AT_DOOR, BACKED, smooth((f - 1226) / (1262 - 1226)));
};
export const arkaAt = (f: number): ArkaState => {
  const pos = arkaPos(f);
  const walking = f >= 783 && f < 835, backing = f >= 1226 && f < 1262;
  const mode: ArkaMode = f < 780 ? "sit" : walking ? "walk" : backing ? "stepBack" : "stand";
  // walk cycle: 0.5 m stride -> phase advances 1 per 1.0 m (two steps), planted feet (cast.ts)
  const phase = walking || backing ? Math.abs(pos[0] - WALK0[0]) / 1.0 : 0;
  let expr: ArkaExpr = "neutral", look = 0;
  if (f >= 293 && f < 495) look = f < 312 ? -0.4 : 0; // glances down at the phone on "notifikasi"
  if (f >= 495 && f < 573) expr = "smile"; // "mengira seseorang sedang mengerjainya": skeptical smirk
  if (f >= 629) { expr = "shock"; look = f < 678 ? 1 : 0; } // "ketukan": head snaps toward the door (3 f early)
  if (f >= 780) expr = "nervous"; // walk, "Siapa?", no answer, message 2
  if (f >= 1147) expr = "fear"; // heartbeat, backing away, whisper
  if (f >= 1443) expr = "shock"; // "hampir kehilangan akal": horror, mouth open
  const yaw = f < 780 ? 0 : Math.PI / 2; // faces +z on the sofa; faces +x (the door) in the corridor, also while backing away
  return {
    pos, yaw, mode, phase, expr, look,
    blinkOK: f < 1575, // no blink in the last ~2 s (wide eyes until the fade)
    talk: f >= CUE.siapa - 1 && f <= CUE.siapaEnd, // mouths "Siapa?" with the narration
    phone: f < 312 ? "none" : f < CUE.mengerjainya ? "hand" : f < 573 ? "toss" : f < 780 ? "none" : "hand",
  };
};

// ---------------- story state: phone + in-world text ----------------
/** decision 1: the original message text, exactly as in the narration (without the quote marks) */
export const SCREEN_TEXT = {
  msg1: "JANGAN BUKA PINTU MALAM INI.",
  msg2: "AKU TAHU KAMU SEDANG BERDIRI DI DEPAN PINTU.",
  // no sender label (Aldi, 16 Nov 2026): the narration already says it is his own number
  lockTime: "02.17",
};
/** decision 2: the digital clock on the table */
export const CLOCK_TEXT = "02.17";
export type PhoneWhere = "table" | "hand" | "sofa" | "hand-door";
export type PhoneScreen = "off" | "lock" | "chat1" | "chat2";
export type PhoneState = { where: PhoneWhere; screen: PhoneScreen; glow: number; buzz: number; pop: number };
/** buzz windows [a, b) in frames: the phone body shakes +-1 every frame (vibration), decaying at each window end */
const BUZZ: [number, number][] = [[6, 28], [293, 312], [956, 985]];
const buzzAt = (f: number) => {
  for (const [a, b] of BUZZ) if (f >= a && f < b) return (f % 2 ? -1 : 1) * Math.min(1, (b - f) / 6);
  return 0;
};
/** glow: screen emissive multiplier (HDR, x2.5 at 1 -> bloom); pop: bubble scale-in 0..1 for the newest bubble */
export const phoneAt = (f: number): PhoneState => {
  const buzz = buzzAt(f);
  const wake = (f0: number) => smooth((f - f0) / 4);
  if (f < 228) return { where: "table", screen: f < 24 ? "off" : "lock", glow: f < 24 ? 0 : wake(24), buzz, pop: 0 }; // hook
  if (f < 312) return { where: "table", screen: f < 293 ? "off" : "lock", glow: f < 293 ? 0 : wake(293), buzz, pop: 0 };
  if (f < 405) return { where: "hand", screen: "lock", glow: 1, buzz, pop: 0 };
  if (f < CUE.mengerjainya) return { where: "hand", screen: "chat1", glow: 1, buzz, pop: smooth((f - 405) / 5) };
  if (f < 573) return { where: f < 556 ? "hand" : "sofa", screen: "chat1", glow: 1 - smooth((f - 556) / 14), buzz, pop: 1 }; // toss
  if (f < 780) return { where: "sofa", screen: "off", glow: 0, buzz, pop: 1 };
  if (f < 956) return { where: "hand-door", screen: "off", glow: 0, buzz, pop: 1 };
  if (f < 989) return { where: "hand-door", screen: "lock", glow: wake(956), buzz, pop: 0 };
  // message 2 pops 2 f before "Pesan kedua muncul"; the screen stays on (dimmer) and underlights his face to the end
  return { where: "hand-door", screen: "chat2", glow: f < 1149 ? 1 : 0.6, buzz, pop: smooth((f - 989) / 5) };
};

// ---------------- story state: door, practicals ----------------
/** door-gap strip and the visitor's feet shadow: the visitor is never shown, only two dark blobs breaking the strip.
 *  They arrive just before the knocks and shift on the whisper; the strip flickers in shot 12. */
export const doorAt = (f: number) => {
  const feet = f >= 674;
  const shift = smooth((f - (CUE.arkaWhisper - 6)) / 12) * 0.12; // feet step 12 cm closer to the door on "Arka..."
  const n = Math.sin(f * 1.7) * Math.sin(f * 0.37 + 1.3); // deterministic flicker (no random: renders must repeat)
  const flicker = f >= 1278 && f < 1443 ? 0.35 * Math.max(0, n) : 0;
  const knock = [CUE.tok1, CUE.tok2, CUE.tok3].some((k) => f >= k - 1 && f < k + 3) ? 1 : 0; // door leaf shudders 1 mm
  return { gapGlow: 2.0 * (1 - flicker), feet, feetShift: shift, knock };
};
/** HDR practicals (linear RGB multiplier >1 blooms at threshold 1.0). intensity(f) is the emissive multiplier. */
export type Practical = { name: string; pos: V3 | ((f: number) => V3); color: string; intensity: (f: number) => number; pointLight?: { range: number; k: number } };
export const PRACTICALS: Practical[] = [
  // the phone lights Arka's face from below: cardshade.ts needs this point light (cards are lit by scene lights only)
  { name: "phone", pos: phonePos, color: "#cfe4ff", intensity: (f) => 2.5 * phoneAt(f).glow, pointLight: { range: 1.2, k: 0.9 } },
  { name: "doorGap", pos: DOOR_GAP, color: "#ffb36b", intensity: (f) => doorAt(f).gapGlow, pointLight: { range: 1.0, k: 0.5 } },
  { name: "clock", pos: CLOCK, color: "#ff4a3a", intensity: () => 1.3 },
  { name: "cityGlow", pos: WINDOW, color: "#6b5a8a", intensity: () => 0.6 },
];

// ---------------- camera ----------------
// Grammar (motion.md, unchanged from the bridge): symmetric smootherstep glides of 18-40 f centred on their word (a
// key starts dur/2 earlier); reframes bigger than ~half a frame width or 40 % zoom are hard cuts; every hold pushes in
// 0.15-0.35 %/f, ~0.6 %/f on punch words; rolls 4-5 deg over >= 18 f; no hand-held float.
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
/** push-in factor since f0: the subject grows ~rate per frame; `punch` raises it (with 8 f soft edges) for the first n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** heartbeat pulses: extra push of `amt` per frame for `len` frames from each beat (in only, never back out) */
const pulseK = (f: number, beats: number[], amt = 0.006, len = 6) => {
  let s = 0;
  for (const b of beats) s += amt * clamp01((f - b) / len) * len;
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });
const R45 = 0.0785; // 4.5 deg

const eyeSit: V3 = [ARKA_SOFA[0], SIT_EYE, ARKA_SOFA[2]];
const eyeStand = (f: number): V3 => { const p = arkaPos(f); return [p[0], STAND_EYE, p[2]]; };

// shot 1 (hook): low insert at the phone on the table, the clock LED soft behind it; slow roll to 4 deg
const S1a = (f: number) => dolly([0.55, 0.62, -0.65], PHONE_TABLE, pushK(f, 0, 0.002), { fov: 34 });
// shot 2 ("Pukul 02.17"): block exterior, wide aerial creeping, then a 36 f glide down toward the lit window
const S2a = (f: number) => dolly([26, 34, -95], LIT_WINDOW, pushK(f, 160, 0.002), { fov: 44 });
const S2b = (f: number) => dolly([4, 23.5, -118], LIT_WINDOW, pushK(f, 180, 0.0025), { fov: 40, roll: -0.03 });
// shot 3: studio WS 3/4 (table + clock 02.17 readable in front, Arka on the sofa) -> MS on "notifikasi"
const S3a = (f: number) => dolly([2.1, 1.45, 1.6], [0.05, 1.0, -2.3], pushK(f, 224, 0.002), { fov: 42 });
const S3b = (f: number) => dolly([0.95, 1.42, -0.7], [0.15, 1.24, -2.45], pushK(f, 280, 0.002), { fov: 38 });
// shot 4: over the right shoulder from behind the sofa; the screen fills ~29 % -> ~36 % of the width on the punch
const S4a = (f: number) => dolly([0.62, 1.48, -3.12], PHONE_SOFA_HAND, pushK(f, 405, 0.0015, 0.006, 35), { fov: 30 }); // right of the 0.55 m wide cartoon head
// shot 5: MS front, skeptical smirk, the toss
const S5a = (f: number) => dolly([0.35, 1.32, -0.9], eyeSit, pushK(f, 495, 0.002), { fov: 36 });
// shot 6: MS from front-left; on "ketukan" the head snaps to the door and the frame rolls 4.5 deg
const S6a = (f: number) => dolly([-0.4, 1.32, -0.95], eyeSit, pushK(f, 573, 0.0025), { fov: 36 });
// shot 7: low corridor view at the door; the three knocks are kicks
const S7a = (f: number) => dolly([2.6, 0.55, 0.15], [DOOR[0], 0.75, 0], pushK(f, 678, 0.0025), { fov: 40 });
// shot 8: behind his right shoulder, gliding after him to the door, then a creeping hold on the door
// (the lens travels only 2.9 -> 3.4 m so it stays >= 2 m from the foreground shelf; he walks away from it to the door)
const S8a = (f: number): Shot => {
  const x = 2.9 + 0.5 * smooth((f - 783) / (835 - 783));
  return dolly([x, 1.7, 0.45], [DOOR[0], 1.35, 0], pushK(f, 835, 0.0015), { fov: 40 });
};
// shot 9: insert, the phone in his hand at the door
const S9a = (f: number) => dolly([5.25, 1.62, 0.42], PHONE_DOOR_HAND(f), pushK(f, 936, 0.002), { fov: 30 }); // over the right shoulder
// shot 10: high angle from the corridor ceiling corner (2.45 m) — someone is watching
const S10a = (f: number) => dolly([4.2, 2.45, 0.58], [AT_DOOR[0], 1.0, 0], pushK(f, 1032, 0.0025), { fov: 44 });
// shot 11: side CU of his face (door at the right edge), heartbeat pulses; then the lens backs off with him (30 f)
// until the door is back in frame behind him
const S11a = (f: number) => dolly([5.75, STAND_EYE, 0.6], eyeStand(f), pushK(f, 1149, 0.002) * pulseK(f, [CUE.berdegup - 2, CUE.kencang - 2, 1200, 1211]), { fov: 32 });
const S11b = (f: number) => dolly([3.3, 1.55, 0.55], [5.4, 1.2, -0.05], pushK(f, 1230, 0.002), { fov: 40 }); // him at ~1.4 m, door at ~3.3 m
// shot 12: lens 18 cm off the floor, looking at the light strip under the door
const S12a = (f: number) => dolly([5.2, 0.18, 0.25], DOOR_GAP, pushK(f, 1278, 0.0015), { fov: 38 });
// shot 13: ECU of his eyes, slow push, roll to -4.5 deg, kick on "sendiri", fade to black
const S13a = (f: number) => dolly([5.15, 1.6, 0.12], [BACKED[0], STAND_EYE + 0.03, BACKED[2]], pushK(f, 1443, 0.0035), { fov: 30 });

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: S1a },
    { f: 60, dur: 40, s: rolled(S1a, R45 * 0.9) }, // 4 deg roll over 40 f, centred on 80 ("menerima")
  ],
  2: [
    { f: 160, s: S2a }, // cut under the black dip
    { f: 180, dur: 36, s: S2b }, // glide down to the window, centred on 198 (end of "02.17")
  ],
  3: [
    { f: 224, s: S3a }, // crossfade 224-232 from the exterior
    { f: 280, dur: 30, s: S3b }, // centred on 295 ("notifikasi")
  ],
  4: [{ f: 405, s: S4a }], // punch 0.6 %/f for 35 f from 405 ("JANGAN" at 407), then 0.15 %/f creep through the 1.2 s silence
  5: [{ f: 495, s: S5a }],
  6: [
    { f: 573, s: S6a },
    { f: 621, dur: 18, s: rolled(S6a, R45) }, // roll centred on 630 (2 f before "ketukan")
  ],
  7: [{ f: 678, s: S7a }],
  8: [{ f: 780, s: S8a }],
  9: [{ f: 936, s: S9a }],
  10: [
    { f: 1032, s: S10a },
    { f: 1032, dur: 24, s: rolled(S10a, R45) }, // roll in over the first 24 f
  ],
  11: [
    { f: 1149, s: S11a },
    { f: 1215, dur: 30, s: S11b }, // backs off with him, centred on 1230 ("mundur")
  ],
  12: [{ f: 1278, s: S12a }],
  13: [
    { f: 1443, s: S13a },
    { f: 1470, dur: 40, s: rolled(S13a, -R45) }, // roll to -4.5 deg, centred on 1490
  ],
};

// impact kicks (frames; 0-2 f before the word): the image offset flips sign every frame and decays to 0 in 7 f
const KICK_F: [number, number][] = [
  [CUE.tok1 - 1, 0.4], [CUE.tok2 - 1, 0.5], [CUE.tok3 - 1, 0.6], // tok... tok... tok...
  [CUE.bergetar - 1, 0.4], // "bergetar"
  [CUE.sendiri - 1, 0.6], // "sendiri."
];
const KICKS: [number, number][] = KICK_F.map(([f, g]) => [f / FPS, g]);
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** frame at which the current key's move has finished (for picking billboard views per key, not per frame) */
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field + foreground framing ----------------
/** cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp. Entries switch on cuts (no dur)
 *  or ramp with the camera glide they share f/dur with. focus = world point (else the camera look point). */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 15, focus: () => PHONE_TABLE }, // hook insert: screen sharp, clock LED a soft red disc
  { f: 160, cInf: 0 }, // exterior aerial (establishing)
  { f: 224, cInf: 0 }, // studio WS: table, clock 02.17 and sofa all readable
  { f: 280, dur: 30, cInf: 10, focus: () => eyeSit }, // MS on "notifikasi"
  { f: 405, cInf: 14, focus: () => PHONE_SOFA_HAND }, // OTS screen: message 1 text sharp
  { f: 495, cInf: 11, focus: () => eyeSit }, // skeptical MS
  { f: 573, cInf: 12, focus: () => eyeSit }, // head snap MS
  { f: 678, cInf: 0 }, // corridor + door
  { f: 780, cInf: 10, focus: () => [DOOR[0], 1.2, 0] }, // walk: the door sharp, his shoulder soft
  { f: 936, cInf: 14, focus: PHONE_DOOR_HAND }, // phone insert: message 2 text sharp
  { f: 1032, cInf: 8, focus: eyeStand }, // high angle
  { f: 1149, cInf: 13, focus: eyeStand }, // CU heartbeat
  { f: 1215, dur: 30, cInf: 10, focus: eyeStand }, // backing off, door back in frame
  { f: 1278, cInf: 12, focus: () => DOOR_GAP }, // floor-level door gap
  { f: 1443, cInf: 14, focus: () => [BACKED[0], STAND_EYE + 0.03, BACKED[2]] }, // ECU eyes
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

/** near framing objects: visible while a <= f < b; kit = a GLB name build.ts prop() must resolve (Kenney furniture kit,
 *  CC0; verify the exact file name when build.ts is written). pos = base point, s = height in metres, yaw in radians.
 *  0.3-0.5 x the focus distance, 10-25 % of one frame edge, never over a face. */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  // shot 8 (focus = door, 3.2-3.7 m from the lens): a low shoe shelf in the lower-left corner, 2.1-2.5 m from the lens
  // (never closer than ~2 m: the bridge "huge blob at the frame edge" trap), well below his head
  { a: 780, b: 936, kit: "bookcaseOpenLow", pos: [5.4, 0, -0.52], s: 0.45, yaw: 0 },
];
