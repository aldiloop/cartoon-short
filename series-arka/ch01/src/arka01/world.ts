// The Chapter 01 world: Arka's studio flat + corridor + front door (interior set) and his apartment block at night
// (exterior set), lit by the camera-relative "night" moon (two-tone shading from shade.ts) plus HDR practicals:
// phone screen, under-door strip, clock LED, lit window. Pure function of (shot id, frame): update() poses everything.
// No external models (Kenney kits are not reachable from this sandbox): every prop is built from boxes/cylinders with
// painted canvas textures, inked by the ink pass like the bridge world.
import * as THREE from "three";
import {
  FPS, SHOTS, camAt, arkaAt, phoneAt, phonePos, doorAt, PRACTICALS, FOREGROUND, V3, smooth, CUE,
  WINDOW, SOFA, TABLE, CLOCK, ARKA_SOFA, DOOR, DOOR_GAP, LIT_WINDOW, BLD, PHONE_SOFA_DROP, ShotDef,
} from "./story";
import { LIGHTS, LOOK } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { ArkaCard } from "./cast";
import {
  ctex, rep, plaster, floorWood, fabric, doorLeaf, nightWindow, facade, screenLock, screenChat, screenOff, clockFace,
  gapStrip, glowTex, stripesTex,
} from "./paint";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const lam = (o: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(o));
/** box from min/max corners (metres) */
const boxMM = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material, cast = true) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = cast; m.receiveShadow = true;
  return m;
};
/** unlit HDR emissive material (bloom above 1.0); colour multiplied per frame */
const hdr = (map: THREE.Texture | null, col = "#ffffff") => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(col), toneMapped: true, fog: false });
const additive = (map: THREE.Texture, col: string) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(col), transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

// room extents (story.ts layout): living room x -3.0..2.2, z -3.6..3.0; corridor x 2.2..6.6, z -0.65..0.65; ceiling 2.6
const RX0 = -3.0, RX1 = 2.2, RZ0 = -3.6, RZ1 = 3.0, CY = 2.6, CZ = 0.65, DX = DOOR[0];
const PHONE_W = 0.11, PHONE_H = 0.22; // cartoon-scaled phone (Arka's head is 0.55 m wide)

export class World {
  root = new THREE.Group();
  private interior = new THREE.Group();
  private exterior = new THREE.Group();
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private moon: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private moonDisc: THREE.Sprite;
  private fog = new THREE.Fog("#1d2340", 15, 160);
  private sunCache = new Map<number, THREE.Vector3>();
  private phone = new THREE.Group(); private screenMat: THREE.MeshBasicMaterial; private phoneGlow: THREE.Mesh;
  private gapMat: THREE.MeshBasicMaterial; private gapSpill: THREE.Mesh; private door: THREE.Mesh;
  private clockMat: THREE.MeshBasicMaterial;
  private windowMat: THREE.MeshBasicMaterial; private litWin: THREE.MeshBasicMaterial;
  private fgs: { o: THREE.Object3D; a: number; b: number }[] = [];
  private arka: ArkaCard;

  constructor() {
    const R = this.root;
    R.add(this.interior, this.exterior);
    // ---- sky (5 stops by elevation, tone-map inverted, as in the bridge world) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    this.exterior.add(this.sky);
    this.moonDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(2.2, 2.3, 2.6), fog: false, depthWrite: false }));
    this.moonDisc.layers.set(NOINK); this.moonDisc.frustumCulled = false; this.exterior.add(this.moonDisc);
    this.hemi = new THREE.HemisphereLight("#3a4670", "#1a1824", 0.25);
    this.moon = new THREE.DirectionalLight("#9fb4ff", 1.2);
    this.moon.castShadow = true; this.moon.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.moon, this.moon.target);
    this.buildInterior();
    this.buildExterior();
    this.arka = new ArkaCard(this.interior);
    // foreground framing props (story.ts FOREGROUND): built outside any sight-line test
    for (const g of FOREGROUND) {
      const o = this.shoeShelf();
      o.position.set(...g.pos); o.rotation.y = g.yaw ?? 0; o.scale.setScalar((g.s ?? 0.45) / 0.45);
      o.visible = false; this.interior.add(o); this.fgs.push({ o, a: g.a, b: g.b });
    }
  }

  // ---------------- interior ----------------
  private buildInterior() {
    const I = this.interior;
    const wall = lam({ map: rep(plaster("wall", "#8d93aa"), 2, 1) });
    const ceil = lam({ color: "#7d8296" });
    const trim = lam({ color: "#5d6070" });
    // floor
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(RX1 - RX0, RZ1 - RZ0), lam({ map: rep(floorWood(), 3, 3.6) }));
    fl.rotation.x = -Math.PI / 2; fl.position.set((RX0 + RX1) / 2, 0, (RZ0 + RZ1) / 2); fl.receiveShadow = true; I.add(fl);
    const fc = new THREE.Mesh(new THREE.PlaneGeometry(DX - RX1 + 0.1, 2 * CZ), lam({ map: rep(floorWood(), 2.4, 0.7) }));
    fc.rotation.x = -Math.PI / 2; fc.position.set((RX1 + DX) / 2, 0, 0); fc.receiveShadow = true; I.add(fc);
    // ceiling
    I.add(boxMM(RX0, CY, RZ0, RX1, CY + 0.1, RZ1, ceil, false), boxMM(RX1, CY, -CZ, DX, CY + 0.1, CZ, ceil, false));
    // back wall with the window hole (window 2.2 x 1.6 centred at WINDOW)
    const wx0 = WINDOW[0] - 1.1, wx1 = WINDOW[0] + 1.1, wy0 = WINDOW[1] - 0.8, wy1 = WINDOW[1] + 0.8, T = 0.12;
    I.add(boxMM(RX0, 0, RZ0 - T, wx0, CY, RZ0, wall, false), boxMM(wx1, 0, RZ0 - T, RX1, CY, RZ0, wall, false),
      boxMM(wx0, 0, RZ0 - T, wx1, wy0, RZ0, wall, false), boxMM(wx0, wy1, RZ0 - T, wx1, CY, RZ0, wall, false));
    this.windowMat = hdr(nightWindow(), "#ffffff");
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), this.windowMat); win.position.set(WINDOW[0], WINDOW[1], RZ0 - 0.06); I.add(win);
    for (let k = 0; k < 9; k++) I.add(boxMM(wx0, wy0 + 0.05 + k * 0.18, RZ0 - 0.02, wx1, wy0 + 0.085 + k * 0.18, RZ0 + 0.02, trim, false)); // blinds slats
    I.add(boxMM(wx0 - 0.06, wy0 - 0.08, RZ0, wx1 + 0.06, wy0, RZ0 + 0.12, trim, false)); // sill
    // side walls; the right wall has the corridor opening (z -0.65..0.65)
    I.add(boxMM(RX0 - T, 0, RZ0, RX0, CY, RZ1, wall, false));
    I.add(boxMM(RX1, 0, RZ0, RX1 + T, CY, -CZ, wall, false), boxMM(RX1, 0, CZ, RX1 + T, CY, RZ1, wall, false), boxMM(RX1, 2.1, -CZ, RX1 + T, CY, CZ, wall, false));
    I.add(boxMM(RX0, 0, RZ1, RX1, CY, RZ1 + T, wall, false));
    // corridor walls + end wall around the door (0.9 x 2.02 opening)
    I.add(boxMM(RX1, 0, -CZ - T, DX, CY, -CZ, wall, false), boxMM(RX1, 0, CZ, DX, CY, CZ + T, wall, false));
    I.add(boxMM(DX, 0, -CZ, DX + T, CY, -0.47, wall, false), boxMM(DX, 0, 0.47, DX + T, CY, CZ, wall, false), boxMM(DX, 2.04, -0.47, DX + T, CY, 0.47, wall, false));
    // skirting
    const sk = lam({ color: "#3c3e4c" });
    I.add(boxMM(RX0, 0, RZ0, RX1, 0.09, RZ0 + 0.02, sk, false), boxMM(RX1, 0, -CZ, DX, 0.09, -CZ + 0.02, sk, false), boxMM(RX1, 0, CZ - 0.02, DX, 0.09, CZ, sk, false));
    // door: leaf (painted texture), frame, a 2 cm gap at the bottom with the corridor light behind it
    const leafM = lam({ map: doorLeaf() });
    this.door = boxMM(DX - 0.02, 0.02, -0.45, DX + 0.03, 2.02, 0.45, leafM, true);
    this.door.material = [trim, trim, trim, trim, trim, leafM].map((m, i) => (i === 1 ? leafM : m)) as THREE.Material[];
    I.add(this.door);
    const frame = lam({ color: "#2c2630" });
    I.add(boxMM(DX - 0.06, 0, -0.52, DX, 2.1, -0.45, frame), boxMM(DX - 0.06, 0, 0.45, DX, 2.1, 0.52, frame), boxMM(DX - 0.06, 2.02, -0.52, DX, 2.1, 0.52, frame));
    this.gapMat = new THREE.MeshBasicMaterial({ map: gapStrip(false, 0), color: new THREE.Color("#ffb36b"), toneMapped: true, fog: false });
    const gap = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.02), this.gapMat); gap.rotation.y = -Math.PI / 2; gap.position.set(DX + 0.005, 0.01, 0); I.add(gap);
    this.gapSpill = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.7), additive(glowTex(), "#ffb36b"));
    this.gapSpill.rotation.x = -Math.PI / 2; this.gapSpill.position.set(DX - 0.3, 0.003, 0); this.gapSpill.layers.set(NOINK); I.add(this.gapSpill);
    // sofa (faces +z): base, seat cushions, back, arms
    const fab = lam({ map: fabric("sofa", "#3f6a72") }), fab2 = lam({ map: fabric("sofa2", "#36606a") });
    const sx = SOFA[0], sz0 = SOFA[2] - 0.45, sz1 = SOFA[2] + 0.4; // depth -3.05 .. -2.2
    I.add(boxMM(sx - 1.1, 0.08, sz0, sx + 1.1, 0.32, sz1, fab2));
    I.add(boxMM(sx - 0.95, 0.32, sz0 + 0.2, sx - 0.01, 0.45, sz1, fab), boxMM(sx + 0.01, 0.32, sz0 + 0.2, sx + 0.95, 0.45, sz1, fab));
    I.add(boxMM(sx - 1.1, 0.32, sz0, sx + 1.1, 0.85, sz0 + 0.22, fab2));
    I.add(boxMM(sx - 1.1, 0.32, sz0, sx - 0.95, 0.62, sz1, fab2), boxMM(sx + 0.95, 0.32, sz0, sx + 1.1, 0.62, sz1, fab2));
    I.add(boxMM(sx - 1.08, 0, sz0 + 0.02, sx - 1.0, 0.08, sz0 + 0.1, frame), boxMM(sx + 1.0, 0, sz0 + 0.02, sx + 1.08, 0.08, sz0 + 0.1, frame));
    const pillow = boxMM(sx + 0.55, 0.45, sz0 + 0.22, sx + 0.92, 0.75, sz0 + 0.34, lam({ color: "#b58a5a" })); pillow.rotation.z = 0.15; I.add(pillow);
    // low table + rug
    const wood = lam({ color: "#6b4e3a" });
    I.add(boxMM(TABLE[0] - 0.6, 0.36, TABLE[2] - 0.32, TABLE[0] + 0.6, 0.42, TABLE[2] + 0.32, wood));
    for (const [dx, dz] of [[-0.54, -0.26], [0.54, -0.26], [-0.54, 0.26], [0.54, 0.26]]) I.add(boxMM(TABLE[0] + dx - 0.03, 0, TABLE[2] + dz - 0.03, TABLE[0] + dx + 0.03, 0.36, TABLE[2] + dz + 0.03, wood));
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.9), lam({ map: ctex("rug", 512, 384, (g) => {
      g.fillStyle = "#5a4a6a"; g.fillRect(0, 0, 512, 384); g.strokeStyle = "#3a2e48"; g.lineWidth = 18; g.strokeRect(24, 24, 464, 336);
      g.strokeStyle = "#7a6688"; g.lineWidth = 6; g.strokeRect(48, 48, 416, 288);
    }) }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.004, -1.5); rug.receiveShadow = true; I.add(rug);
    // mug + a book on the table (scale cues)
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 20), lam({ color: "#d9d2c4" })); mug.position.set(0.45, 0.47, -1.15); mug.castShadow = true; I.add(mug);
    I.add(boxMM(-0.5, 0.42, -1.5, -0.1, 0.46, -1.24, lam({ color: "#8c3b4a" })));
    // digital clock (decision 2: 02.17) on the table next to the phone, face turned toward the room
    const clock = new THREE.Group();
    clock.add(boxMM(-0.13, 0, -0.045, 0.13, 0.12, 0.045, lam({ color: "#26232c" })));
    this.clockMat = hdr(clockFace(), "#ffffff");
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.09), this.clockMat); face.position.set(0, 0.062, 0.047); clock.add(face);
    clock.position.set(CLOCK[0], CLOCK[1], CLOCK[2]); clock.rotation.y = 0.35; I.add(clock);
    // side shelf with a lamp (off) left of the sofa, a framed picture, coat hooks + jacket in the corridor
    I.add(boxMM(-2.2, 0, -3.4, -1.5, 0.6, -2.9, wood));
    const lampSh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.24, 20), lam({ color: "#cdbfa6" })); lampSh.position.set(-1.85, 0.95, -3.15); I.add(lampSh);
    I.add(boxMM(-1.86, 0.6, -3.16, -1.84, 0.83, -3.14, frame));
    const pic = boxMM(-2.9, 1.2, -1.2, -2.88, 1.8, -0.4, lam({ map: ctex("pic", 256, 320, (g) => {
      g.fillStyle = "#2c3a5a"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#c98a5a"; g.beginPath(); g.arc(128, 140, 60, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1a2238"; g.fillRect(0, 210, 256, 110); g.strokeStyle = "#0b0a0c"; g.lineWidth = 16; g.strokeRect(0, 0, 256, 320);
    }) }), false); I.add(pic);
    for (const x of [4.3, 4.5]) I.add(boxMM(x, 1.62, CZ - 0.06, x + 0.04, 1.66, CZ, frame));
    I.add(boxMM(4.22, 0.95, CZ - 0.14, 4.6, 1.62, CZ - 0.02, lam({ color: "#4a5a3a" }))); // jacket on the hooks
    // moonlight through the blinds on the floor in front of the sofa (additive stripes)
    const st = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), additive(stripesTex(), "#33406a"));
    st.rotation.x = -Math.PI / 2; st.rotation.z = 0.25; st.position.set(0.6, 0.006, -1.2); st.layers.set(NOINK); I.add(st);
    // phone: body + screen + soft glow decal on whatever it rests on
    const body = new THREE.Mesh(new THREE.BoxGeometry(PHONE_W, PHONE_H, 0.012), lam({ color: "#1d1f26" }));
    body.castShadow = true; this.phone.add(body);
    this.screenMat = hdr(screenOff(), "#ffffff");
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(PHONE_W * 0.92, PHONE_H * 0.94), this.screenMat); scr.position.z = 0.0065; this.phone.add(scr);
    I.add(this.phone);
    this.phoneGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), additive(glowTex(), "#cfe4ff")); this.phoneGlow.layers.set(NOINK); I.add(this.phoneGlow);
  }

  /** low shoe shelf (foreground prop of shot 8): open box, two shelves, three pairs of shoes; 0.45 m tall, base at y 0 */
  private shoeShelf() {
    const g = new THREE.Group(), w = lam({ color: "#6b5444" });
    g.add(boxMM(-0.4, 0, -0.14, 0.4, 0.03, 0.14, w), boxMM(-0.4, 0.21, -0.14, 0.4, 0.24, 0.14, w), boxMM(-0.4, 0.42, -0.14, 0.4, 0.45, 0.14, w));
    g.add(boxMM(-0.4, 0, -0.14, -0.37, 0.45, 0.14, w), boxMM(0.37, 0, -0.14, 0.4, 0.45, 0.14, w));
    const cols = ["#c9ccd6", "#3a3f55", "#8c3b4a"];
    cols.forEach((c, i) => { const m = lam({ color: c }); for (const dz of [-0.06, 0.06]) g.add(boxMM(-0.3 + i * 0.24, 0.03 + (i === 1 ? 0.21 : 0), dz - 0.04, -0.12 + i * 0.24, 0.1 + (i === 1 ? 0.21 : 0), dz + 0.04, m)); });
    return g;
  }

  // ---------------- exterior ----------------
  private buildExterior() {
    const E = this.exterior;
    const fz = LIT_WINDOW[2] - 0.15; // facade plane just behind the lit window
    const blk = new THREE.Mesh(new THREE.BoxGeometry(24, 30, 14), [0, 1, 2, 3, 4, 5].map((i) => (i === 4 ? lam({ map: facade() }) : lam({ map: rep(plaster("side", "#4c5068"), 3, 4) }))));
    blk.position.set(BLD[0], 15, fz - 7); blk.castShadow = true; blk.receiveShadow = true; E.add(blk);
    E.add(boxMM(-12.4, 30, fz - 14.2, 12.4, 30.6, fz + 0.2, lam({ color: "#3a3d52" }))); // roof parapet
    // Arka's window (7th floor): warm-cool lit pane with blinds, the only lit window on this side
    this.litWin = hdr(ctex("litWin", 256, 192, (g) => {
      g.fillStyle = "#cfe0ff"; g.fillRect(0, 0, 256, 192); g.fillStyle = "rgba(40,50,90,0.45)";
      for (let y = 0; y < 192; y += 22) g.fillRect(0, y, 256, 9);
      g.strokeStyle = "#0b0a0c"; g.lineWidth = 10; g.strokeRect(0, 0, 256, 192);
    }), "#ffffff");
    const lw = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1.9), this.litWin); lw.position.set(LIT_WINDOW[0], LIT_WINDOW[1], fz + 0.02); E.add(lw);
    // neighbours, street, lamps, distant skyline
    const dark = lam({ color: "#30334a" }), dark2 = lam({ color: "#272a3e" });
    E.add(boxMM(-46, 0, fz - 30, -16, 22, fz - 6, dark), boxMM(16, 0, fz - 26, 40, 26, fz - 4, dark2), boxMM(44, 0, fz - 40, 70, 34, fz - 16, dark));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), lam({ color: "#23222e" })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, fz + 40); ground.receiveShadow = true; E.add(ground);
    E.add(boxMM(-200, 0, fz + 6, 200, 0.15, fz + 10, lam({ color: "#3a3946" })));
    const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.9, 0.9), fog: false });
    for (let k = -3; k <= 3; k++) {
      E.add(boxMM(k * 14 - 0.08, 0, fz + 9, k * 14 + 0.08, 6, fz + 9.16, dark2));
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), lampM); b.position.set(k * 14, 6.1, fz + 9.1); b.layers.set(NOINK); E.add(b);
    }
    for (let k = 0; k < 14; k++) {
      const x = -160 + k * 24 + (k % 3) * 5, h = 30 + ((k * 37) % 40), d = 160 + (k % 4) * 30;
      E.add(boxMM(x, 0, fz - d, x + 18, h, fz - d + 14, dark2, false));
    }
  }

  /** camera-relative moon, frozen per shot (bridge rule): az from the shot's mean view direction, el, strength k */
  private shotMoon(id: number, s: ShotDef) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.moon?.az ?? LIGHTS.night.az), el = THREE.MathUtils.degToRad(s.moon?.el ?? LIGHTS.night.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, renderH: number) {
    const s = SHOTS[id - 1], L = LIGHTS.night, K = LOOK.night;
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = s.set === "exterior" ? 0.5 : 0.04; cam.far = 1200; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look);
    this.interior.visible = s.set === "interior"; this.exterior.visible = s.set === "exterior";
    // ---- moon + two-tone uniforms ----
    const md = this.shotMoon(id, s), k = s.moon?.k ?? 1;
    this.moon.color.set(L.sunCol); this.moon.intensity = L.sunI * k;
    const Rr = s.set === "exterior" ? 60 : 7;
    this.moon.position.copy(focus).addScaledVector(md, s.set === "exterior" ? 200 : 20); this.moon.target.position.copy(focus);
    const sc = this.moon.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 0.5; sc.far = s.set === "exterior" ? 420 : 45; sc.updateProjectionMatrix();
    this.moon.shadow.bias = L.bias; this.moon.shadow.normalBias = L.normalBias;
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    TONE.uLitCol.value.set(L.lit[0] * k + (1 - k) * L.shade[0] * 2, L.lit[1] * k + (1 - k) * L.shade[1] * 2, L.lit[2] * k + (1 - k) * L.shade[2] * 2);
    TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky / fog / moon disc ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = s.set === "exterior" ? L.fogNear * 4 : 40; this.fog.far = s.set === "exterior" ? L.fogFar * 3 : 400;
    this.moonDisc.position.copy(cam.position).addScaledVector(V(-0.35, 0.42, -1).normalize(), 700);
    this.moonDisc.scale.setScalar(2 * 700 * Math.tan(THREE.MathUtils.degToRad(2.2)));
    // ---- foreground props ----
    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;
    // ---- practicals ----
    const P = phoneAt(f), pp = phonePos(f), A = arkaAt(f);
    const pI = (n: string) => PRACTICALS.find((x) => x.name === n)!.intensity(f);
    this.screenMat.map = P.screen === "off" ? screenOff() : P.screen === "lock" ? screenLock() : screenChat(P.screen === "chat1" ? 1 : 2, P.pop);
    const sg = 0.25 + 0.95 * P.glow; // readable white bubbles (~1.1 at full glow: a hint of bloom, the text stays sharp)
    this.screenMat.color.setScalar(P.screen === "off" ? 1 : sg);
    this.screenMat.needsUpdate = true;
    // phone pose: flat on the table / sofa, held up toward his face (tilted back 35 deg), buzzing +-2 mm per frame
    const ph = this.phone;
    ph.position.set(pp[0] + P.buzz * 0.002, pp[1], pp[2]);
    ph.rotation.set(0, 0, 0); ph.rotation.order = "YXZ";
    if (P.where === "table" || P.where === "sofa") { ph.rotation.x = -Math.PI / 2; ph.rotation.y = 0.4 + P.buzz * 0.02; ph.position.y += 0.008; }
    else if (P.where === "hand") {
      // tossed: spins in the air between "mengerjainya" and the landing (f541-556)
      if (f >= CUE.mengerjainya && f < 556) { const u = (f - CUE.mengerjainya) / 15; ph.rotation.set(-0.6 - 2.4 * u, 0.5 * u, 0.8 * u); }
      else { ph.rotation.y = Math.PI; ph.rotation.x = -0.6; } // screen toward Arka (-z on the sofa)
    } else { ph.rotation.y = -Math.PI / 2; ph.rotation.x = -0.6; } // at the door: screen toward -x (his face)
    if (P.where === "sofa" && f >= 556) { ph.position.set(PHONE_SOFA_DROP[0], PHONE_SOFA_DROP[1], PHONE_SOFA_DROP[2]); }
    const flat = P.where === "table" || P.where === "sofa";
    this.phoneGlow.visible = P.glow > 0.01;
    this.phoneGlow.position.set(pp[0], flat ? pp[1] + 0.004 : pp[1], pp[2]);
    this.phoneGlow.rotation.set(flat ? -Math.PI / 2 : 0, 0, 0);
    if (!flat) this.phoneGlow.quaternion.copy(cam.quaternion);
    this.phoneGlow.scale.setScalar(flat ? 1 : 0.55);
    (this.phoneGlow.material as THREE.MeshBasicMaterial).color.set("#cfe4ff").multiplyScalar(0.22 * P.glow);
    // door gap: warm HDR strip, feet shadows, flicker; the leaf shudders 1 mm on each knock
    const D = doorAt(f);
    this.gapMat.map = gapStrip(D.feet, D.feetShift); this.gapMat.color.set("#ffb36b").multiplyScalar(D.gapGlow); this.gapMat.needsUpdate = true;
    (this.gapSpill.material as THREE.MeshBasicMaterial).color.set("#ffb36b").multiplyScalar(0.18 * D.gapGlow / 2);
    this.door.position.x = DX + 0.005 + (D.knock ? (f % 2 ? 0.001 : -0.001) : 0);
    this.clockMat.color.setScalar(pI("clock"));
    this.windowMat.color.setScalar(0.85);
    this.litWin.color.setScalar(1.6);
    // ---- Arka ----
    const cr = new THREE.Vector3(); cam.getWorldDirection(cr); cr.cross(cam.up).normalize();
    this.arka.update(id, f, s, cam, A, pp, pI("phone"), renderH, md.dot(cr) > 0);
    return focus;
  }
}

export { DOOR_GAP, ARKA_SOFA, smooth, FPS };
