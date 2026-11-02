/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeStoryMazeExtraRow。 */
export interface ChallengeStoryMazeExtra {
  /** 层 ID，对应 ChallengeStoryMazeConfig.ID */
  ID: number;
  /** 回合上限 */
  TurnLimit: number;
  /** 战斗目标（→ ChallengeStoryTargetConfig） */
  BattleTargetID: number[];
  /** 通关分 */
  ClearScore: number;
}
