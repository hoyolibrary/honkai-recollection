/** 对齐 DummyDll 中的 RPG.GameCore.GridFightPetPalEffRow。 */
export interface GridFightPetPalEff {
  ID: number;
  Desc: { Hash: bigint };
  AddDesc?: { Hash: bigint };
  SwitchDesc: { Hash: bigint };
  SimpleDesc?: { Hash: bigint };
  IsOCEffective?: boolean;
  JsonPath: string;
  EffectParamList: { Value: number }[];
}
