import type { ConditionParam } from "./TarotWikiUnlockConditions";

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarSeriesSkillRow。 */
export interface AvatarSeriesSkill {
  SkillID: number;
  Level: number;
  AvatarID: number;
  UnlockCondition: ConditionParam;
  SpecialTagPrefab: string;
  SpecialTag?: { Hash: bigint };
  FramePrefab: string;
  RelateAvatarIDList: number[];
}
