import type { ItemConfigEntry } from "./ItemConfig";

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarRankConfigRow。 */
export interface AvatarRankConfig {
  RankID: number;
  Rank: number;
  Trigger: {
    Hash: number;
  };
  Name: string;
  Desc: string;
  ExtraEffectIDList: number[];
  IconPath: string;
  SkillAddLevelList: { [key: string]: number };
  RankAbility: string[];
  UnlockCost: ItemConfigEntry[];
  Param: { Value: number }[];
}
