import type { AttackDamageType } from "./enum/AttackDamageType";
import type { ModifierBehaviorFlag } from "./enum/ModifierBehaviorFlag";

/** 对齐 DummyDll 中的 RPG.GameCore.MonsterRow。 */
export interface MonsterConfig {
  MonsterName: {
    Hash: bigint;
  };
  MonsterIntroduction: {
    Hash: bigint;
  };
  MonsterStrategy: { Hash: bigint }[];
  MonsterID: number;
  MonsterTemplateID: number;
  EliteGroup: number;
  HardLevelGroup: number;
  AttackModifyRatio: {
    Value: number;
  };
  DefenceModifyRatio?: {
    Value: number;
  };
  HPModifyRatio: {
    Value: number;
  };
  SpeedModifyRatio: {
    Value: number;
  };
  StanceModifyRatio: {
    Value: number;
  };
  StanceWeakList: AttackDamageType[];
  DamageTypeResistance: ElementResistanceConfig[];
  DebuffResist: MonsterResistEntry[];
  CustomValueTags: string[];
  CustomValues: MonsterCustomValue[];
  DynamicValues: MonsterDynamicValue[];
  SummonIDList: number[];
  OverrideAIPath: string;
  OverrideAISkillSequence: MonsterAISkillSequence[];
  AbilityNameList: string[];
  SkillList: number[];
  OverrideSkillParams: MonsterOverrideSkillParam[];
  StanceModifyValue?: {
    Value: number;
  };
  SpeedModifyValue?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  Level?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  HPModifyValue?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  MonsterBattleIntroduction?: {
    Hash: bigint;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  DefenceModifyValue?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  MonsterType?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  StanceCountDelta?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  AttackModifyValue?: {
    Value: number;
  };
}

/** 对齐 DummyDll 中的 RPG.GameCore.ElementResistanceConfig。 */
export interface ElementResistanceConfig {
  DamageType: AttackDamageType;
  Value: {
    Value: number;
  };
}

/** 对齐 DummyDll 中的 RPG.GameCore.MonsterResistEntry。 */
export interface MonsterResistEntry {
  Key: ModifierBehaviorFlag;
  Value: {
    Value: number;
  };
}

/** 对齐 DummyDll 中的 PNIHHKFGKPN（混淆类型）。 */
export interface MonsterOverrideSkillParam {
  PBLPLDJKPEI: { Value: number }[];
  NFNILIEFKHJ: {
    Value: number;
  };
  BOKJJKFCFME: number;
  OHLBMAGECPM?: {
    Hash: bigint;
  };
  ANLGHKHLFDE: {
    Value: number;
  };
}

/** 对齐 DummyDll 中的 JDOFOPKMEFJ（混淆类型）。 */
export interface MonsterDynamicValue {
  BFLIFKBEOPJ: string;
  MNDFOPKBHKP: {
    Value: number;
  };
}

/** 对齐 DummyDll 中的 AOKFCBEPNNA（混淆类型）。 */
export interface MonsterCustomValue {
  BFLIFKBEOPJ: string;
  MNDFOPKBHKP?: number;
}

/** 对齐 DummyDll 中的 DKNHMEHFNDB（混淆类型）。 */
export interface MonsterAISkillSequence {
  MNAHFIGOHML: number;
  EBPBFHEJBJB?: number;
  AANLPEHOHLJ?: number;
  PGGOELLGAIG?: number;
  HHPDHDGDLIB?: number;
  ILGGFNPAOHH?: number;
  OLGFKMDAELN?: number;
  GCAKGHCLCHI?: number;
}
