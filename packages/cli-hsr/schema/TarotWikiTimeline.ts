/** 对齐 DummyDll 中的 RPG.GameCore.TarotWikiTimelineRow。 */
export interface TarotWikiTimeline {
  ID: number;
  Title: {
    Hash: bigint;
  };
  Progress: number;
  DataList: number[];
  SpecialType?: number;
  UnlockID?: number;
}
