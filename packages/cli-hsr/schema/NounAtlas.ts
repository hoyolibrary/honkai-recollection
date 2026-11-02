/** 对齐 DummyDll 中的 RPG.GameCore.NounAtlasRow。 */
export interface NounAtlas {
  Type: number;
  NounTitle: {
    Hash: bigint;
  };
  NounDesc: {
    Hash: bigint;
  };
  RelatedTerms: number[];
  IsIntroPage?: boolean;
  ID?: number;
  SortID?: number;
  Unlock?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  UnlockDesc?: {
    Hash: bigint;
  };
}

/** 对齐 DummyDll 中的 RPG.GameCore.NounAtlasChangelnfoRow。 */
export interface NounAtlasChangeInfo {
  NounID: number;
  ChangeNounIDList: number[];
}
