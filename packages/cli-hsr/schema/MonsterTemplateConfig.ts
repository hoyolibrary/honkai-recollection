import type { AttackDamageType } from "./enum/AttackDamageType";
import type { MonsterRank } from "./enum/MonsterRank";
import type { MonsterAISkillSequence } from "./MonsterConfig";

/** 对齐 DummyDll 中的 RPG.GameCore.MonsterTemplateRow。 */
export interface MonsterTemplateConfig {
  MonsterName: {
    Hash: bigint;
  };
  MonsterStrategy: { Hash: bigint }[];
  MonsterTemplateID: number;
  Rank: MonsterRank;
  NPCMonsterList: number[];
  IconPath: string;
  RoundIconPath: string;
  ImagePath: string;
  ManikinImagePath: string;
  JsonConfig: string;
  PrefabPath: string;
  ManikinPrefabPath: string;
  ManikinConfigPath: string;
  AttackBase: {
    Value: number;
  };
  DefenceBase: {
    Value: number;
  };
  HPBase: {
    Value: number;
  };
  SpeedBase?: {
    Value: number;
  };
  StanceBase?: {
    Value: number;
  };
  CriticalDamageBase: {
    Value: number;
  };
  StatusResistanceBase?: {
    Value: number;
  };
  InitialDelayRatio?: {
    Value: number;
  };
  StanceCount?: number;
  StanceType: AttackDamageType;
  AIPath: string;
  AISkillSequence: MonsterAISkillSequence[];
  NatureID: number;
  MinimumFatigueRatio: {
    Value: number;
  };
  MonsterCampID?: number;
  TemplateGroupID?: number;
  AtlasSortID?: number;
  SpeedModifyValue?: {
    Value: number;
  };
  StanceModifyValue?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  CriticalChanceBase?: {
    Value: number;
  };
}
