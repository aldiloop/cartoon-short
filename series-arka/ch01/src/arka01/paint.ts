// Hand-painted canvas textures for the apartment and the exterior block (cached). Helpers ctex / rng / rep / jit are
// the bridge template's paint.ts; the painted surfaces are new: plaster wall, wood floor, sofa fabric, door leaf,
// blinds, apartment facade with a window grid, the phone screens (decision 1: original message text) and the
// digital clock face (decision 2: 02.17). Seams are painted in as dark tints, like the bridge.
import * as THREE from "three";
import { SCREEN_TEXT, CLOCK_TEXT } from "./story";

export const rng = (seed: number) => {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
};
const cache = new Map<string, THREE.CanvasTexture>();
export const ctex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void) => {
  let t = cache.get(key);
  if (!t) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    draw(cv.getContext("2d")!, rng(key.length * 131 + key.charCodeAt(0)));
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    cache.set(key, t);
  }
  return t;
};
export const rep = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
const _c = new THREE.Color(), _h = { h: 0, s: 0, l: 0 };
/** colour jitter in HSL (value dv, hue dh degrees, saturation ds) */
export const jit = (r: () => number, hex: string, dv = 0.08, dh = 4, ds = 0.1) => {
  _c.set(hex).getHSL(_h);
  _c.setHSL(_h.h + ((r() - 0.5) * dh) / 360, Math.max(0, Math.min(1, _h.s * (1 + (r() - 0.5) * ds))), Math.max(0, Math.min(1, _h.l * (1 + (r() - 0.5) * dv))));
  return "#" + _c.getHexString();
};
const speckle = (g: CanvasRenderingContext2D, r: () => number, w: number, h: number, n: number, col: string, a: number, sz: number) => {
  g.fillStyle = col;
  for (let i = 0; i < n; i++) { g.globalAlpha = a * (0.4 + 0.6 * r()); g.fillRect(r() * w, r() * h, sz * (0.5 + r()), sz * (0.5 + r())); }
  g.globalAlpha = 1;
};

/** cool grey-blue plaster (night albedo kept mid so the ink reads), soft brush mottling */
export const plaster = (key = "plaster", base = "#9aa0b4") => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 220; i++) {
    g.globalAlpha = 0.05 + 0.05 * r(); g.fillStyle = jit(r, base, 0.18, 6, 0.2);
    g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 40 + 120 * r(), 30 + 90 * r(), r() * 3, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  speckle(g, r, 1024, 1024, 1500, "#6e7288", 0.12, 2);
});
/** warm wood floor boards, 14 cm wide, near-black seams painted in */
export const floorWood = () => ctex("floorWood", 1024, 1024, (g, r) => {
  const bw = 1024 / 7;
  for (let i = 0; i < 7; i++) {
    let y = -r() * 400;
    while (y < 1024) {
      const L = 300 + 400 * r();
      g.fillStyle = jit(r, "#8a6a52", 0.14, 5, 0.15); g.fillRect(i * bw, y, bw, L);
      g.globalAlpha = 0.12;
      for (let k = 0; k < 6; k++) { g.fillStyle = "#5a4232"; g.fillRect(i * bw + r() * bw, y, 2 + 3 * r(), L); }
      g.globalAlpha = 1;
      g.fillStyle = "#2a1c18"; g.fillRect(i * bw, y + L - 3, bw, 3);
      y += L;
    }
    g.fillStyle = "#2a1c18"; g.fillRect(i * bw, 0, 3, 1024);
  }
});
/** soft woven sofa fabric (muted teal) */
export const fabric = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 4) { g.globalAlpha = 0.08; g.fillStyle = r() < 0.5 ? "#000" : "#fff"; g.fillRect(0, y, 512, 2); }
  for (let x = 0; x < 512; x += 4) { g.globalAlpha = 0.05; g.fillStyle = "#000"; g.fillRect(x, 0, 2, 512); }
  g.globalAlpha = 1;
});
/** apartment front door, interior side: dark painted panels, steel handle, peephole, chain plate */
export const doorLeaf = () => ctex("doorLeaf", 512, 1024, (g, r) => {
  g.fillStyle = "#4a3b44"; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 30; i++) { g.globalAlpha = 0.06; g.fillStyle = jit(r, "#4a3b44", 0.3); g.fillRect(0, r() * 1024, 512, 4 + 20 * r()); }
  g.globalAlpha = 1;
  const panel = (x: number, y: number, w: number, h: number) => {
    g.fillStyle = "#3d3038"; g.fillRect(x, y, w, h);
    g.strokeStyle = "#1c1418"; g.lineWidth = 6; g.strokeRect(x, y, w, h);
    g.strokeStyle = "rgba(255,255,255,0.08)"; g.lineWidth = 3; g.strokeRect(x + 8, y + 8, w - 16, h - 16);
  };
  panel(70, 80, 372, 380); panel(70, 540, 372, 400);
  g.fillStyle = "#c9ccd6"; g.beginPath(); g.arc(256, 230, 13, 0, Math.PI * 2); g.fill(); // peephole ring
  g.fillStyle = "#120c10"; g.beginPath(); g.arc(256, 230, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#b7bcc8"; g.fillRect(40, 470, 26, 120); g.fillStyle = "#1c1418"; g.fillRect(44, 520, 18, 18); // handle plate (hinge side right)
  g.strokeStyle = "#1c1418"; g.lineWidth = 4; g.strokeRect(40, 470, 26, 120);
  g.fillStyle = "#b7bcc8"; g.fillRect(56, 300, 16, 60); // chain plate
  g.strokeStyle = "#1c1418"; g.strokeRect(56, 300, 16, 60);
  g.strokeStyle = "#1c1418"; g.lineWidth = 10; g.strokeRect(0, 0, 512, 1024);
});
/** window: night city through horizontal blinds (lit windows of the block opposite, violet sodium haze) */
export const nightWindow = () => ctex("nightWindow", 1024, 768, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 768);
  gr.addColorStop(0, "#0d1330"); gr.addColorStop(0.7, "#2a2f58"); gr.addColorStop(1, "#4a3a5c");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 768);
  for (let b = 0; b < 6; b++) {
    const x = b * 180 - 40 + r() * 40, w = 120 + r() * 60, top = 260 + r() * 200;
    g.fillStyle = "#151a34"; g.fillRect(x, top, w, 768 - top);
    for (let y = top + 20; y < 760; y += 34) for (let xx = x + 12; xx < x + w - 16; xx += 26)
      if (r() < 0.16) { g.fillStyle = r() < 0.5 ? "#ffcf8a" : "#cfe0ff"; g.fillRect(xx, y, 12, 16); }
  }
  g.fillStyle = "rgba(10,10,20,0.55)"; // blinds
  for (let y = 0; y < 768; y += 42) g.fillRect(0, y, 1024, 26);
  g.strokeStyle = "#0b0a0c"; g.lineWidth = 14; g.strokeRect(0, 0, 1024, 768);
});
/** exterior facade of the block: grid of windows, almost all dark; Arka's window is a separate emissive quad */
export const facade = () => ctex("facade", 1024, 1280, (g, r) => {
  g.fillStyle = "#5b5f78"; g.fillRect(0, 0, 1024, 1280);
  for (let i = 0; i < 160; i++) { g.globalAlpha = 0.06; g.fillStyle = jit(r, "#5b5f78", 0.3); g.fillRect(r() * 1024, r() * 1280, 30 + 80 * r(), 20 + 60 * r()); }
  g.globalAlpha = 1;
  const cols = 8, rows = 10, cw = 1024 / cols, rh = 1280 / rows;
  for (let j = 0; j < rows; j++) {
    g.fillStyle = "#3e4158"; g.fillRect(0, j * rh + rh - 10, 1024, 10); // floor slab line
    for (let i = 0; i < cols; i++) {
      const x = i * cw + 26, y = j * rh + 30, w = cw - 52, h = rh - 62;
      g.fillStyle = r() < 0.06 ? "#6d5a52" : "#1b2038"; g.fillRect(x, y, w, h);
      g.strokeStyle = "#0b0a0c"; g.lineWidth = 6; g.strokeRect(x, y, w, h);
      g.fillStyle = "#454960"; g.fillRect(x - 6, y + h, w + 12, 8); // sill
    }
  }
});

// ---------------- phone screens (decision 1: original text; no sender label) ----------------
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const wrap = (g: CanvasRenderingContext2D, text: string, maxW: number) => {
  const out: string[] = []; let line = "";
  for (const w of text.split(" ")) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
};
const SW = 720, SH = 1440; // screen canvas (1:2)
const screenBase = (g: CanvasRenderingContext2D) => {
  const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, "#1b2a52"); gr.addColorStop(1, "#0d1430");
  g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
};
const bubble = (g: CanvasRenderingContext2D, text: string, y: number, pop: number) => {
  g.save();
  g.font = "bold 50px 'DejaVu Sans', Arial, sans-serif";
  const lines = wrap(g, text, SW - 200), lh = 66, h = lines.length * lh + 56, w = SW - 120;
  g.translate(60, y + h / 2); g.scale(pop, pop); g.translate(0, -h / 2);
  g.fillStyle = "#eef1f8"; rr(g, 0, 0, w, h, 34); g.fill();
  g.strokeStyle = "#0b0a0c"; g.lineWidth = 6; g.stroke();
  g.fillStyle = "#14121a"; g.textBaseline = "top";
  lines.forEach((l, i) => g.fillText(l, 34, 30 + i * lh));
  g.restore();
  return h;
};
/** lock screen: big 02.17 and an incoming-message card with NO sender label (three dots only) */
export const screenLock = () => ctex("screenLock", SW, SH, (g) => {
  screenBase(g);
  g.fillStyle = "#e8ecf8"; g.textAlign = "center"; g.font = "bold 190px 'DejaVu Sans', Arial, sans-serif";
  g.fillText(SCREEN_TEXT.lockTime, SW / 2, 380);
  g.fillStyle = "rgba(238,241,248,0.92)"; rr(g, 50, 520, SW - 100, 190, 38); g.fill();
  g.strokeStyle = "#0b0a0c"; g.lineWidth = 6; g.stroke();
  g.fillStyle = "#2c6fd6"; g.beginPath(); g.arc(130, 615, 44, 0, Math.PI * 2); g.fill(); // message app glyph
  g.fillStyle = "#ffffff"; rr(g, 105, 595, 50, 36, 10); g.fill();
  g.fillStyle = "#14121a"; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(250 + k * 50, 615, 14, 0, Math.PI * 2); g.fill(); }
});
/** open chat: message 1 only, or messages 1 + 2; `pop` scales the newest bubble in (quantised to 6 steps for the cache) */
export const screenChat = (n: 1 | 2, pop: number) => {
  const q = Math.round(Math.min(1, Math.max(0, pop)) * 6) / 6;
  return ctex(`screenChat${n}_${q}`, SW, SH, (g) => {
    screenBase(g);
    g.fillStyle = "#121a38"; g.fillRect(0, 0, SW, 170);
    g.fillStyle = "#3a4466"; g.beginPath(); g.arc(90, 95, 40, 0, Math.PI * 2); g.fill(); // anonymous avatar, no name
    g.fillStyle = "#121a38"; g.beginPath(); g.arc(90, 82, 15, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(90, 122, 26, 15, 0, Math.PI, 0); g.fill();
    const h1 = bubble(g, SCREEN_TEXT.msg1, 300, n === 1 ? q : 1);
    if (n === 2 && q > 0) bubble(g, SCREEN_TEXT.msg2, 300 + h1 + 50, q);
  });
};
export const screenOff = () => ctex("screenOff", 16, 32, (g) => { g.fillStyle = "#06070c"; g.fillRect(0, 0, 16, 32); });
/** digital clock face (decision 2): red seven-segment-style digits on black */
export const clockFace = () => ctex("clockFace", 512, 256, (g) => {
  g.fillStyle = "#08080c"; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "#ff5040"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "bold 150px 'DejaVu Sans Mono', monospace";
  g.fillText(CLOCK_TEXT, 256, 136);
});
/** under-door strip: warm corridor light broken by two dark feet shadows (u = position along the door, 0..1) */
export const gapStrip = (feet: boolean, shift: number) => {
  const q = Math.round(shift * 50) / 50;
  return ctex(`gap_${feet}_${q}`, 512, 16, (g) => {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 16);
    if (feet) {
      g.fillStyle = "#000000";
      for (const c of [0.4, 0.62]) { const x = (c + q * 0.3) * 512; g.beginPath(); g.ellipse(x, 8, 46, 9, 0, 0, Math.PI * 2); g.fill(); }
    }
  });
};
/** soft radial glow decal (additive), white */
export const glowTex = () => ctex("glow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** blind stripes of moonlight (additive decal) */
export const stripesTex = () => ctex("stripes", 256, 512, (g) => {
  g.fillStyle = "#000"; g.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 48) { const gr = g.createLinearGradient(0, y, 0, y + 30); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, y, 256, 30); }
  const fade = g.createLinearGradient(0, 0, 256, 0); fade.addColorStop(0, "rgba(0,0,0,1)"); fade.addColorStop(0.2, "rgba(0,0,0,0)"); fade.addColorStop(0.8, "rgba(0,0,0,0)"); fade.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = fade; g.fillRect(0, 0, 256, 512);
});
