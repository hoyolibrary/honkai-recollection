/** 对齐 DummyDll 中的 RPG.GameCore.GridFightDivisionStageRow。DivisionID = DivisionInfo.ID。 */
export interface GridFightDivisionStage {
  DivisionID: number;
  AffixChooseNumList: number[];
  EnvironmentBuffList: number[];
  UniqueEnvironmentDescList: string[];
  EnvironmentDescList: string[];
  ScoreRule: number;
  OCScoreRule: number;
  WeeklyScoreModify: number;
  ExpModify: number;
  JsonPath: string;
  EffectParamList: { Value: number }[];
  LevelBaseHPMultiRatio: {
    Value: number;
  };
  LevelBaseAttackMultiRatio: {
    Value: number;
  };
  LevelBaseCounterMultiRatio: {
    Value: number;
  };
  EnemyDifficultyLevel?: number;
  BinaryNodeDiffAddRule?: number;
}
