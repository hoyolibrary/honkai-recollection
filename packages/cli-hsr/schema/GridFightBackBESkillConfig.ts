import type { AttackDamageType } from "./enum/AttackDamageType";
import type { AttackType } from "./enum/AttackType";
import type { SkillEffect } from "./enum/SkillEffect";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightBackBESkillConfigRow。无 Level，一条技能一行。 */
export interface GridFightBackBESkillConfig {
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
  SkillTriggerKey: string;
  SkillIcon: string;
  UltraSkillIcon: string;
  CutinPath: string;
  SkillDesc?: {
    Hash: bigint;
  };
  SimpleSkillDesc?: {
    Hash: bigint;
  };
  ShowStanceList: { Value: number }[];
  SPMultipleRatio: {
    Value: number;
  };
  BPNeed?: {
    Value: number;
  };
  DelayRatio?: {
    Value: number;
  };
  ParamList: { Value: number }[];
  SimpleParamList: { Value: number }[];
  AttackType?: AttackType;
  SkillEffect: SkillEffect;
  SkillButtonEffType: string;
  StanceDamageDisplay?: number;
  StanceDamageType?: AttackDamageType;
  SPBase?: {
    Value: number;
  };
  SPNeed?: {
    Value: number;
  };
  BPAdd?: {
    Value: number;
  };
}
