/** 对齐 DummyDll 中的 RPG.GameCore.GridFightEnemyDifficultyLvConfigRow。复合主键 (EnemyDifficultyLevel, ChapterID)。 */
export interface GridFightEnemyDifficultyLv {
  ChapterID: number;
  AttackRatio: {
    Value: number;
  };
  DefenceRatio: {
    Value: number;
  };
  HPRatio: {
    Value: number;
  };
  SpeedRatio: {
    Value: number;
  };
  StanceRatio: {
    Value: number;
  };
  EnemyDifficultyLevel?: number;
}
