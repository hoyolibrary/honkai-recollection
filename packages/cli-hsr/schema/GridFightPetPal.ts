/** 对齐 DummyDll 中的 RPG.GameCore.GridFightPetPalConfigRow。 */
export interface GridFightPetPal {
  ID: number;
  HeadImage: string;
  Icon: string;
  SmallIcon: string;
  FigureUp: string;
  FigureDown: string;
  Name: { Hash: bigint };
  Desc?: { Hash: bigint };
  EffIDList: number[];
  Sort: number;
}
