import type { AvatarPropertyType } from "./enum/AvatarPropertyType";

/** 对齐 DummyDll 中的 RPG.GameCore.RelicSetSkillConfigRow。 */
export interface RelicSetSkillConfig {
  SetID: number;
  RequireNum: number;
  SkillDesc: string;
  PropertyList: RelicSetSkillProperty[];
  AbilityName: string;
  AbilityParamList: { Value: number }[];
}

/** 对齐 DummyDll 中的 NOCGHCNMOKB（混淆类型）。 */
export interface RelicSetSkillProperty {
  FODBMMCKAEN: AvatarPropertyType;
  MNDFOPKBHKP: {
    Value: number;
  };
}
