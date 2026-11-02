import type { CombatPowerRelicRarityType } from "./enum/CombatPowerRelicRarityType";
import type { RelicMode } from "./enum/RelicMode";
import type { RelicType } from "./enum/RelicType";

/** 对齐 DummyDll 中的 RPG.GameCore.RelicConfigRow。 */
export interface RelicConfig {
  ID: number;
  SetID: number;
  Type: RelicType;
  Rarity: CombatPowerRelicRarityType;
  MainAffixGroup: number;
  SubAffixGroup: number;
  MaxLevel: number;
  ExpType: number;
  ExpProvide: number;
  CoinCost: number;
  Mode: RelicMode;
}
