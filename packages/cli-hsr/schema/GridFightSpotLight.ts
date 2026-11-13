/** 对齐 DummyDll 中的 RPG.GameCore.GridFightSpotLightConfigRow。 */
export interface GridFightSpotLight {
  ID: number;
  Icon: string;
  Name: { Hash: bigint };
  Desc: { Hash: bigint };
  JsonPath: string;
  EffectParamList: { Value: number }[];
  Tag: number[];
  SuitableAvatarList: number[];
  IsOCEffective: boolean;
  IsCarry?: boolean;
  EnemyDiffLvAdd?: number;
  TraitID?: number;
}
