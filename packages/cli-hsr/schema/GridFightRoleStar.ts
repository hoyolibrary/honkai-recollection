import type { AvatarPropertyType } from "./enum/AvatarPropertyType";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightRoleStarConfigRow。复合主键 (ID, Star)。 */
export interface GridFightRoleStar {
  ID: number;
  Star: number;
  BEID?: number;
  SkillOverrideSrc: number[];
  SkillOverrideDest: number[];
  FrontShowSkillIDList: number[];
  FrontOneWordDesc?: {
    Hash: bigint;
  };
  BackAbilityName: string;
  BackParamList: { Value: number }[];
  JsonOverrideConfig: string;
  AIPath: string;
  GeneralPropertyModifyList: GridFightPropertyValue[];
  ShowStanceList: { Value: number }[];
  FrontPowerBase: {
    Value: number;
  };
  LuckChance: {
    Value: number;
  };
  LuckDamage: {
    Value: number;
  };
  ExtraHealBase: {
    Value: number;
  };
  ExtraShieldBase: {
    Value: number;
  };
  BESkillIDList: number[];
  BackShowSkillIDList: number[];
  BackOneWordDesc?: {
    Hash: bigint;
  };
  BackPowerBase?: {
    Value: number;
  };
  StanceDamageDisplay?: {
    Value: number;
  };
  BackMaxSP?: {
    Value: number;
  };
  BackInitialSP?: {
    Value: number;
  };
  BackEnergyBar?: {
    Value: number;
  };
  BackInitialEnergyBar?: {
    Value: number;
  };
}

/** GridFight 属性条目。部分行仅有 PropertyType、无 Value。 */
export interface GridFightPropertyValue {
  PropertyType: AvatarPropertyType;
  Value?: {
    Value: number;
  };
}
