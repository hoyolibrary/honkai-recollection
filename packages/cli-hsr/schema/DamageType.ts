import type { AttackDamageType } from "./enum/AttackDamageType";

/** 对齐 DummyDll 中的 RPG.GameCore.DamageTypeRow。 */
export interface DamageType {
  ID: AttackDamageType;
  DamageTypeName: {
    Hash: bigint;
  };
  DamageTypeIntro: {
    Hash: bigint;
  };
  DamageTypeIconPath: string;
  IconNatureForWeakActive: string;
  IconNatureForWeakUnactive: string;
  IconNatureColorSimple: string;
  IconNatureColor: string;
  IconNatureWhite: string;
  SPInfoEffFront: string;
  SPInfoEffFrontDouble: string;
  Color: string;
  ShaderColor: string;
  UnfullColor: string;
  LightColor: string;
  Light1Color: string;
  SkillBtnEff: string;
  SkillTreeLightColor: string;
  SkillTreeDecoColor: string;
  SkillTreeLeftPanelColor: string;
  SPMazeInfoEffFront: string;
  NormalDamage: string;
  CriticalDamage: string;
  SkillTreePanelPath: string;
  MazeEnterBattleWeakIconPath: string;
}
