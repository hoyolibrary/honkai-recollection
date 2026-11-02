/** 对齐 DummyDll 中的 RPG.GameCore.TarotWikiSubdataRow。 */
export interface TarotWikiSubdata {
  ID: number;
  Title: {
    Hash: bigint;
  };
  Details: {
    Hash: bigint;
  };
  ChangeID: number[];
  UnlockID?: number;
}
