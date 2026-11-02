import type { GridFightPropertyValue } from "./GridFightRoleStar";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightBackRoleRankConfigRow。 */
export interface GridFightBackRoleRank {
  RankID: number;
  Rank: number;
  Name: {
    Hash: bigint;
  };
  Desc: {
    Hash: bigint;
  };
  IconPath: string;
  Trigger: {
    Hash: number;
  };
  OwnerGeneralPropertyList: GridFightPropertyValue[];
  AllMemberGeneralPropertyList: GridFightPropertyValue[];
  ModifySkillList: number[];
  RankAbility: string[];
  Param: { Value: number }[];
  DescParamList: number[];
  ExtraEffectIDList: number[];
  ModifyEnergyBar?: {
    Value: number;
  };
}
