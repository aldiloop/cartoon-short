// Arka as a camera-facing 2D card (toon.ts drawing on a canvas -> cardShade material), bridge-style: NOINK layer
// (it carries its own plum ink), lit by the moon through cardshade.ts, plus the phone under-light (cardshade PHONE),
// a tight blue-violet contact blob under the feet, blinks every 0.5-2.3 s (4 f), front / back / side views per shot.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, ARKA, Expr } from "./toon";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K, PHONE } from "./cardshade";
import { ArkaState, ShotDef, V3 } from "./story";
import { ctex } from "./paint";

export const SU = 0.00233; // metres per design unit (eyes at 1.55 m standing)
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const rad = (d: number) => (d * Math.PI) / 180;

/** deterministic blink schedule: gaps of 0.5-2.3 s, each blink 4 frames (lid 0.5, 1, 1, 0.5) */
const BLINKS: number[] = (() => {
  const out: number[] = []; let f = 20, k = 1;
  while (f < 2000) { out.push(f); const r = Math.sin(k * 91.7) * 43758.5453; f += Math.round((0.5 + 1.8 * (r - Math.floor(r))) * 30); k++; }
  return out;
})();
const lidAt = (f: number) => {
  for (const b of BLINKS) if (f >= b && f < b + 4) return [0.5, 1, 1, 0.5][f - b];
  return 0;
};

class TexCache {
  private m = new Map<string, THREE.CanvasTexture>();
  get(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    let t = this.m.get(key);
    if (t) { this.m.delete(key); this.m.set(key, t); return t; }
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const g = cv.getContext("2d")!; g.setTransform(k, 0, 0, k, 0, 0); draw(new Pen(g));
    t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    this.m.set(key, t);
    while (this.m.size > 16) { const [k0, t0] = this.m.entries().next().value as [string, THREE.CanvasTexture]; t0.dispose(); this.m.delete(k0); }
    return t;
  }
}

export class ArkaCard {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; blob: THREE.Mesh;
  private cache = new TexCache();
  private v = new THREE.Vector3(); private r = new THREE.Vector3();
  constructor(parent: THREE.Object3D) {
    const blank = new THREE.CanvasTexture(document.createElement("canvas"));
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mesh = new THREE.Mesh(BODY, this.mat);
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.receiveShadow = true; this.mesh.castShadow = false; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    const bt = ctex("arkaBlob", 256, 128, (g) => {
      const gr = g.createRadialGradient(128, 64, 0, 128, 64, 64);
      gr.addColorStop(0, "#6a6c88"); gr.addColorStop(0.6, "#9c9db4"); gr.addColorStop(1, "#ffffff");
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 128); g.save(); g.scale(2, 1); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.restore();
    });
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.32), blobMaterial(bt));
    this.blob.rotation.x = -Math.PI / 2; this.blob.layers.set(NOINK); this.blob.renderOrder = 0.5;
    parent.add(this.blob);
  }

  update(id: number, f: number, s: ShotDef, cam: THREE.PerspectiveCamera, A: ArkaState, phone: V3, phoneI: number, renderH: number, moonRight = false) {
    const show = s.cast === "arka";
    this.mesh.visible = this.blob.visible = show;
    if (!show) return;
    const [x, y, z] = A.pos;
    // billboard: card normal toward the camera (yaw only), like the bridge cast
    const yaw = Math.atan2(cam.position.x - x, cam.position.z - z);
    this.mesh.position.set(x, y, z); this.mesh.rotation.set(0, yaw, 0);
    const right = this.r.set(Math.cos(yaw), 0, -Math.sin(yaw)); // card +x in world
    const view = s.view ?? "front";
    // canvas light angle (painted crescent + thick outline side): moon on screen right -> upper-right key (-60 deg)
    cam.getWorldDirection(this.v);
    const camRight = new THREE.Vector3().crossVectors(this.v, cam.up).normalize();
    const light = rad(moonRight ? -60 : -120);
    // distance tier sized for the 1440 x 2560 final (renderH 2560): close-ups get a 4x canvas
    const d = cam.position.distanceTo(this.v.set(x, y + (A.mode === "sit" ? 1.2 : 1.45), z));
    const k = d < 1.0 ? 4 : d < 2.2 ? 3 : 2, W = 600 * k, H = 1000 * k;
    const lid = A.blinkOK ? lidAt(f) : 0;
    const talk = A.talk && Math.floor(f / 4) % 2 === 0;
    const q = (v: number, n: number) => Math.round(v * n) / n;
    const expr = A.expr as Expr;
    let key: string, draw: (p: Pen) => void, mirror = false;
    if (view === "side") {
      // side view faces screen right; mirror when Arka faces screen left
      const faceDir = new THREE.Vector3(Math.sin(A.yaw), 0, Math.cos(A.yaw));
      mirror = faceDir.dot(camRight) < 0;
      const mode = "stand" as const;
      key = `S|${expr}|${lid}|${k}`;
      draw = (p) => bodySide(p, ARKA, { mode, expr, blink: lid, light, seed: 3 });
    } else {
      const back = view === "back";
      const mode = A.mode === "sit" ? "sofa" : A.mode === "walk" || A.mode === "stepBack" ? "stroll" : "stand";
      const phase = q(A.phase % 1, 24);
      const prop = A.phone === "hand" ? ("phone" as const) : null;
      key = `F|${back}|${mode}|${expr}|${q(A.look, 4)}|${lid}|${talk}|${phase}|${prop}|${k}`;
      draw = (p) => bodyFront(p, ARKA, { mode, expr, look: A.look, blink: lid, phase, prop, back, talk, light, facing: 0, seed: 3, lift: 30 });
    }
    const tex = this.cache.get(key, W, H, k, draw);
    tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = mirror ? -1 : 1; tex.offset.x = mirror ? 1 : 0;
    if (this.mat.map !== tex) { this.mat.map = tex; this.mat.needsUpdate = true; }
    // night card gain (faces sit well below the day .93 so the room mood holds), then the phone under-light
    CARD_K.uGain.value = 0.62;
    const pv = new THREE.Vector3(...phone), rel = pv.clone().sub(this.mesh.position);
    const head = new THREE.Vector3(x, y + (A.mode === "sit" ? 1.2 : 1.45), z);
    const fall = Math.max(0, 1 - pv.distanceTo(head) / 1.3);
    PHONE.uPhoneK.value = phoneI * 0.3 * fall * (view === "back" ? 0.08 : 1);
    PHONE.uPhoneUV.value.set(0.5 + (mirror ? -1 : 1) * rel.dot(right) / (600 * SU), rel.y / (1000 * SU) + 0.025);
    // contact blob under the feet
    this.blob.position.set(x, 0.004, z + 0.02); this.blob.rotation.z = -yaw;
    void id; void renderH;
  }
}
