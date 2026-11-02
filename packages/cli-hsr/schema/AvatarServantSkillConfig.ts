import type { AttackDamageType } from "./enum/AttackDamageType";
import type { AttackType } from "./enum/AttackType";
import type { SkillEffect } from "./enum/SkillEffect";

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarServantSkillRow。 */
export interface AvatarServantSkillConfig {
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
  SkillDesc?: {
    Hash: bigint;
  };
  SimpleSkillDesc: {
    Hash: bigint;
  };
  RatedSkillTreeID: number[];
  RatedRankID: number[];
  ExtraEffectIDList: number[];
  SimpleExtraEffectIDList: number[];
  ShowStanceList: { Value: number }[];
  StanceDamageDisplay?: number;
  SPBase?: {
    Value: number;
  };
  SPMultipleRatio: {
    Value: number;
  };
  BPNeed: {
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
  SkillNeed?: {
    Hash: bigint;
  };
  HideInUI?: boolean;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  SPAdd?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  SPNeed?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  SkillComboValueDelta?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  BPAdd?: {
    Value: number;
  };
}

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarServantSkillLinkRow。 */
export interface AvatarServantSkillLink {
  SkillID: number;
  LinkToAvatarID: number;
  TarotFigurePath: string;
  TarotIconPath: string;
  Order: number;
}
