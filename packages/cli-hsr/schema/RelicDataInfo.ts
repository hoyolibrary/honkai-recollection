import type { RelicType } from "./enum/RelicType";

/** 对齐 DummyDll 中的 RPG.GameCore.RelicDataInfoRow。 */
export interface RelicDataInfo {
  SetID: number;
  Type: RelicType;
  IconPath: string;
  ItemFigureIconPath: string;
  RelicName: string;
  ItemBGDesc: string;
  BGStoryTitle: string;
  BGStoryContent: string;
}
