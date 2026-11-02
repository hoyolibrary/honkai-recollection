/** StageInvasionConfig.json：贪饕污染按关卡配置（DummyDll: RPG.GameCore.StageInvasionConfigRow）。 */
export interface StageInvasionConfig {
  StageID: number;
  InvasionID: number;
  MonsterInvasionList: StageInvasionMonster[];
}

/** MonsterInvasionList 子项（DummyDll: IDBNLIKLDKJ，混淆字段名一字不动镜像）。 */
export interface StageInvasionMonster {
  /** 怪物战斗 ID（MonsterConfig.MonsterID 口径，可精确到变体） */
  DBLDCKODNEN: number;
  /** 出怪序号循环掩码（0 起，第 n 只同名怪看 flags[n % len]，非 0 即污染；空数组 = 全部实例） */
  LMEBOHHDIAG: number[];
}
