/** 对齐 DummyDll 中的 RPG.GameCore.TarotWikiDataRow。 */
export interface TarotWikiData {
  ID: number;
  Title: {
    Hash: bigint;
  };
  Details: {
    Hash: bigint;
  };
  ChangeID: number[];
  SubdataList: number[];
  UnlockID?: number;
}
