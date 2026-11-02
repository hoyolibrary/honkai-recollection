import type { AttackDamageType } from "./enum/AttackDamageType";
import type { AttackType } from "./enum/AttackType";

/** 对齐 DummyDll 中的 RPG.GameCore.MonsterSkillRow。 */
export interface MonsterSkillConfig {
  SkillID: number;
  SkillName: {
    Hash: bigint;
  };
  SkillTriggerKey: string;
  SkillTypeDesc: {
    Hash: bigint;
  };
  SkillTag: {
    Hash: bigint;
  };
  DamageType?: AttackDamageType;
  AttackType: AttackType;
  SPHitBase?: {
    Value: number;
  };
  DelayRatio?: {
    Value: number;
  };
  AI_CD: number;
  AI_ICD: number;
  IconPath: string;
  SkillDesc: {
    Hash: bigint;
  };
  PhaseList: number[];
  ParamList: { Value: number }[];
  ModifierList: string[];
  ExtraEffectIDList: number[];
  IsThreat?: boolean;
  SortOrder?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  SkillComboValueDelta?: {
    Value: number;
  };
}
