/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeBossMazeExtraRow。 */
export interface ChallengeBossMazeExtra {
  /** 层 ID，对应 ChallengeBossMazeConfig.ID */
  ID: number;
  /** 节点一展示 Boss（战斗 MonsterID，模板口径需经 MonsterConfig.MonsterTemplateID 换算） */
  MonsterID1: number;
  MonsterID2: number;
  /** 星启第三节点，仅星启期期末层存在 */
  MonsterID3?: number;
}
