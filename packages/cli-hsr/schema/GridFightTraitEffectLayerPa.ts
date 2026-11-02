/** 对齐 DummyDll 中的 RPG.GameCore.GridFightTraitEffectLayerPaConfigRow。复合主键 (ID, Layer)。 */
export interface GridFightTraitEffectLayerPa {
  ID: number;
  Layer: number;
  EffectParamList: { Value: number }[];
  DescParamList: number[];
  TraitEffectDesc?: {
    Hash: bigint;
  };
}
