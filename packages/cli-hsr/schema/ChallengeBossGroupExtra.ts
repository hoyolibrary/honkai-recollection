/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeBossGroupExtraRow。 */
export interface ChallengeBossGroupExtra {
  GroupID: number;
  /** 节点一可选 buff（→ MazeBuff），早期无星启期为空数组 */
  BuffList1: number[];
  BuffList2: number[];
  BuffList3: number[];
  ThemeIconPicPath: string;
  ThemePosterTabPicPath: string;
  BossPositionPrefabPath1: string;
  BossPositionPrefabPath2: string;
  /** 星启期第三节点 Boss 展示位，非星启期为空串 */
  BossPositionEntrancePrefabPath3: string;
  BossPositionDetailPrefabPath3: string;
}
