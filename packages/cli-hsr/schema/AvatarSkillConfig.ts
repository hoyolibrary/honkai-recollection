import type { AttackDamageType } from "./enum/AttackDamageType";
import type { AttackType } from "./enum/AttackType";
import type { AvatarSpecialUltraType } from "./enum/AvatarSpecialUltraType";
import type { HealFormulaType } from "./enum/HealFormulaType";
import type { SkillDamageRange } from "./enum/SkillDamageRange";
import type { SkillEffect } from "./enum/SkillEffect";

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarSkillRow。 */
export interface AvatarSkillConfig {
  SkillID: number;
  SkillName: {
    Hash: bigint;
  };
  SkillTag: {
    Hash: bigint;
  };
  SkillTypeDesc: {
    Hash: bigint;
  };
  Level: number;
  MaxLevel: number;
  SkillTriggerKey: string;
  SkillIcon: string;
  UltraSkillIcon: string;
  LevelUpCostList: string[];
  SkillDesc?: {
    Hash: bigint;
  };
  RatedSkillTreeID: number[];
  RatedRankID: number[];
  ExtraEffectIDList: number[];
  SimpleExtraEffectIDList: number[];
  ShowStanceList: { Value: number }[];
  ShowDamageList: AvatarSkillShowDamage[];
  ShowHealList: AvatarSkillShowHeal[];
  InitCoolDown: number;
  CoolDown: number;
  StanceDamageDisplay?: number;
  SPMultipleRatio: {
    Value: number;
  };
  BPNeed?: {
    Value: number;
  };
  DelayRatio: {
    Value: number;
  };
  ParamList: { Value: number }[];
  SimpleParamList: { Value: number }[];
  StanceDamageType?: AttackDamageType;
  AttackType?: AttackType;
  SkillEffect: SkillEffect;
  SimpleSkillDesc?: {
    Hash: bigint;
  };
  SPBase?: {
    Value: number;
  };
  BPAdd?: {
    Value: number;
  };
  SkillComboValueDelta?: {
    Value: number;
  };
  SPNeed?: {
    Value: number;
  };
  SkillNeed?: {
    Hash: bigint;
  };
  HideInUI?: boolean;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  SPAdd?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  LevelUpRankCond?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  LevelUpLevelCond?: number;
}

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarUltraSkillConfigRow。 */
export interface AvatarUltraSkillConfig {
  AvatarID: number;
  UltraSkillType?: AvatarSpecialUltraType;
  UltraSkillResourcePath: string;
  UltraSkillUse?: {
    Hash: bigint;
  };
}

/** 对齐 DummyDll 中的 RPG.GameCore.ElationSkillRow。 */
export interface ElationSkill {
  ElationSkillID: number;
  PriorityValue: number;
}

/** 对齐 DummyDll 中的 GHPFNOBNMAJ（混淆类型）。 */
export interface AvatarSkillShowHeal {
  PIBDDOGGDKL: {
    Value: number;
  };
  POAHAIDOOKL: HealFormulaType;
  HJNEHAAIIGI: SkillDamageRange;
  ABINBKACLJK: {
    Value: number;
  };
}

/** 对齐 DummyDll 中的 PMOFCNKNJCA（混淆类型）。 */
export interface AvatarSkillShowDamage {
  PIBDDOGGDKL: {
    Value: number;
  };
  HJNEHAAIIGI: SkillDamageRange;
  PAIECOBACKB: AttackDamageType;
  ABINBKACLJK: {
    Value: number;
  };
}
