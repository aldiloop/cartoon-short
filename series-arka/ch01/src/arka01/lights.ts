// Light presets for Chapter 01: only "night" is used (story.ts NIGHT / NIGHT_LOOK are the contract). Field names
// match the bridge template's lights.ts so shade.ts / cardshade.ts read them unchanged.
import { NIGHT, NIGHT_LOOK } from "./story";

export type LightPreset = typeof NIGHT;
export type WorldLook = typeof NIGHT_LOOK;
export const LIGHTS: Record<"night", LightPreset> = { night: NIGHT };
export const LOOK: Record<"night", WorldLook> = { night: NIGHT_LOOK };
