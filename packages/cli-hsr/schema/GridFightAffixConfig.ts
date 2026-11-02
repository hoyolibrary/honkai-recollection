/** 对齐 DummyDll 中的 RPG.GameCore.GridFightAffixConfigRow。RuleParamList 为 AffixMazebuff.ID。 */
export interface GridFightAffixConfig {
  ID: number;
  RuleParamList: number[];
  JsonPath: string;
  EffectParamList: { Value: number }[];
  AffixName: {
    Hash: bigint;
  };
  AffixDesc: {
    Hash: bigint;
  };
  IconPath: string;
}
