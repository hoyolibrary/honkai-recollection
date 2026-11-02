import type { GridFightPreset } from "./enum/GridFightPreset";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightRoleRecommendEquipConfigRow。复合主键 (RoleID, FrontBackType)。 */
export interface GridFightRoleRecommendEquip {
  RoleID: number;
  FrontBackType: GridFightPreset;
  FirstRecommendEquipList: number[];
  SecondRecommendEquipList: number[];
}
