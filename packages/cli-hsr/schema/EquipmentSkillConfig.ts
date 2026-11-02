import type { AvatarPropertyValue } from "./AvatarSkillTreeConfig";

/** 对齐 DummyDll 中的 RPG.GameCore.EquipmentSkillRow。 */
export interface EquipmentSkillConfig {
  SkillID: number;
  SkillName: {
    Hash: bigint;
  };
  SkillDesc: {
    Hash: bigint;
  };
  Level: number;
  AbilityName: string;
  ParamList: { Value: number }[];
  AbilityProperty: AvatarPropertyValue[];
}
