import type { GridFightAugmentQuality } from "./enum/GridFightAugmentQuality";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightAugmentConfigRow。投资策略。 */
export interface GridFightAugment {
  ID: number;
  CategoryID: number;
  Quality: GridFightAugmentQuality;
  HexName: {
    Hash: bigint;
  };
  HexDesc: {
    Hash: bigint;
  };
  IconPath: string;
  AugmentSearchKey: string;
  MiniIconPath: string;
  ChapterLimitList: number[];
  IsOCEffective?: number;
  JsonPath: string;
  EffectParamList: { Value: number }[];
  AugmentSavedValueList: string[];
  AugmentGameRefTrait: number[];
  AugmentGameRefScore: number[];
}
