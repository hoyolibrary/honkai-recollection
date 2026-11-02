/** 对齐 DummyDll 中的 RPG.GameCore.GridFightBackSkillExtraDescConfigRow。按 SkillID 补后台行动条件句。 */
export interface GridFightBackSkillExtraDesc {
  SkillID: number;
  ConditionDesc?: {
    Hash: bigint;
  };
  ParamList: { Value: number }[];
  ConditionSimpleDesc?: {
    Hash: bigint;
  };
  SimpleParamList: { Value: number }[];
  ExtraEffectIDList: number[];
  SimpleExtraEffectIDList: number[];
}
