/** 对齐 DummyDll 中的 RPG.GameCore.RelicSetConfigRow。 */
export interface RelicSetConfig {
  SetID: number;
  SetSkillList: number[];
  SetIconPath: string;
  SetIconFigurePath: string;
  SetName: {
    Hash: bigint;
  };
  DisplayItemID: number;
  DisplayItemIDRarity4: number;
  Release: boolean;
  ReleaseVersion: string;
  IsPlanarSuit?: boolean;
}
