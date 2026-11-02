import type { AttackDamageType } from "./enum/AttackDamageType";
import type { AttackType } from "./enum/AttackType";
import type { SkillEffect } from "./enum/SkillEffect";
import type { AvatarSkillShowDamage, AvatarSkillShowHeal } from "./AvatarSkillConfig";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightFrontSkillConfigRow。结构镜像 AvatarSkillRow，主键 SkillID + Level。 */
export interface GridFightFrontSkill {
  SkillID: number;
  SkillName?: {
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
  SimpleSkillDesc?: {
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
  SPMultipleRatio: {
    Value: number;
  };
  DelayRatio?: {
    Value: number;
  };
  ParamList: { Value: number }[];
  SimpleParamList: { Value: number }[];
  SkillEffect: SkillEffect;
  SPBase?: {
    Value: number;
  };
  StanceDamageDisplay?: number;
  BPNeed?: {
    Value: number;
  };
  StanceDamageType?: AttackDamageType;
  AttackType?: AttackType;
  SPNeed?: {
    Value: number;
  };
  HideInUI?: boolean;
  BPAdd?: {
    Value: number;
  };
}
