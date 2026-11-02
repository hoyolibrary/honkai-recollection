/** 对齐 DummyDll 中的 RPG.GameCore.GridFightDivisionStageConfig。DivisionID = DivisionInfo.ID。 */
export interface GridFightDivisionStage {
  DivisionID: number;
  AffixChooseNumList: number[];
  EnvironmentBuffList: number[];
  UniqueEnvironmentDescList: string[];
  EnvironmentDescList: string[];
  SeasonID: number;
  ScoreRule: number;
  OCScoreRule: number;
  WeeklyScoreModify: number;
  ExpModify: number;
  JsonPath: string;
  LevelBaseHPMultiRatio: {
    Value: number;
  };
  LevelBaseAttackMultiRatio: {
    Value: number;
  };
  EnemyDifficultyLevel?: number;
  BinaryNodeDiffAddRule?: number;
}
