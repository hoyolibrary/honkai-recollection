import type { GridFightChargeType } from "./enum/GridFightChargeType";
import type { GridFightPreset } from "./enum/GridFightPreset";
import type { GridFightRoleSkillTag } from "./enum/GridFightRoleSkillTag";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightRoleConfigRow。 */
export interface GridFightRoleBasicInfo {
  ID: number;
  AvatarID: number;
  FrontBackType?: GridFightPreset;
  Rarity: number;
  HealOrShieldDisplay: GridFightRoleSkillTag;
  ChargeType: GridFightChargeType[];
  MaxSPIcon: string;
  TraitList: number[];
  IsInPool: boolean;
  IsInBook?: boolean;
  BackendRankList: number[];
  SpecialAvatarID: number;
  SeasonID: number;
  EquipmentID?: number;
  IsExpert?: number;
  IsFakeAvatar?: number;
}
