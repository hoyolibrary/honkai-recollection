import type { GridFightTraitEffectType } from "./enum/GridFightTraitEffectType";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightTraitEffectConfigRow。 */
export interface GridFightTraitEffect {
  ID: number;
  TraitEffectType: GridFightTraitEffectType;
  TraitEffectJson: string;
  TraitEffectIconPath: string;
}
