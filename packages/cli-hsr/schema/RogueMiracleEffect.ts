/** 对齐 DummyDll 中的 RPG.GameCore.RogueMiracleEffectRow。 */
export interface RogueMiracleEffect {
  MiracleEffectID: number;
  MiracleDesc?: {
    Hash: bigint;
  };
  ParamList: { Value: number }[];
  MiracleDynamicHint?: {
    Hash: bigint;
  };
}
