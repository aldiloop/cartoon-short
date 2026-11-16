// Writes shots.json (for scripts/short_qa.py) from story.ts: shot ranges, crossfade windows, planned cuts/kicks/dip,
// and the planned-black exceptions (the 4-frame black dip after the hook and the fade-out f1590-1635), so QA does not
// report them as broken black or frozen frames.
// Usage (from this folder): node make_shots.mjs
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { tmpdir } from "node:os";

const here = new URL(".", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "arka01-"));
execSync(`tsc --strict --skipLibCheck --target es2020 --module commonjs --outDir ${out} ${join(here, "src", "arka01", "story.ts")}`, { stdio: "inherit" });
const S = createRequire(import.meta.url)(join(out, "story.js"));

const shots = S.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b }));
const xfade = shots.filter((s) => S.XFADE[s.id]).map((s) => [s.a - S.XFADE[s.id] / 2, s.a + S.XFADE[s.id] / 2]);
const dip = [S.DIP.a, S.DIP.a + S.DIP.n]; // frames 160-163 black
const fade = [S.FADE_OUT.a, S.FADE_OUT.b]; // 1590-1635
const kicks = [];
for (let f = 0; f < S.TOTAL; f++) if (S.kickAt(f / S.FPS) !== 0 && S.kickAt((f - 1) / S.FPS) === 0) kicks.push([f, f + 8]);
const meta = {
  shots, xfade,
  planned: [dip, fade, ...kicks],
  // planned black: short_qa.py skips these frames in its black list and ignores frozen spans inside them
  black_ok: [dip, fade],
  notes: "black_ok = decision 3 black dip (4 f after the hook) + the chapter fade-out to black f1590-1635; both intended.",
};
writeFileSync(join(here, "shots.json"), JSON.stringify(meta, null, 1) + "\n");
console.log(readFileSync(join(here, "shots.json"), "utf8"));
