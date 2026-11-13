import type { GridFightPreset } from "./enum/GridFightPreset";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightRoleRecomSpotLightConfigRow。 */
export interface GridFightRoleRecomSpotLight {
  RoleID: number;
  FrontBackType: GridFightPreset;
  FirstRecommendSpotLightList: number[];
  SecondRecommendSpotLightList: number[];
}
