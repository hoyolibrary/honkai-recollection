import type { RogueImageType } from "./enum/RogueImageType";

/** 对齐 DummyDll 中的 RPG.GameCore.RogueImageRow。 */
export interface RogueImage {
  ImageID: number;
  ImageType: RogueImageType;
  ImagePath: string;
  ParamStr1: string;
  ParamStr2: string;
  TexturePath: string;
}
