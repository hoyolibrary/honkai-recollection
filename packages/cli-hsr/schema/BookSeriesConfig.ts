/** 对齐 DummyDll 中的 RPG.GameCore.BookSeriesConfigRow。 */
export interface BookSeriesConfig {
  BookSeriesID: number;
  BookSeries: {
    Hash: bigint;
  };
  BookSeriesComments?: {
    Hash: bigint;
  };
  BookSeriesNum: number;
  BookSeriesWorld: number;
  IsShowInBookshelf?: boolean;
}

/** 对齐 DummyDll 中的 RPG.GameCore.LocalbookConfigRow。 */
export interface LocalbookConfig {
  BookID: number;
  BookSeriesID: number;
  BookSeriesInsideID: number;
  BookInsideName: {
    Hash: bigint;
  };
  BookContent: {
    Hash: bigint;
  };
  BookDisplayType: number;
  LocalBookImagePath: string[];
}

/** 对齐 DummyDll 中的 RPG.GameCore.BookSeriesWorldConfigRow。 */
export interface BookSeriesWorld {
  BookSeriesWorld: number;
  BookSeriesWorldTextmapID: {
    Hash: bigint;
  };
  BookSeriesWorldIconPath: string;
  BookSeriesWorldBackgroundPath: string;
}
