import type { GridFightTraitActivationType } from "./enum/GridFightTraitActivationType";
import type { GridFightTraitType } from "./enum/GridFightTraitType";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightTraitBaseConfigRow。 */
export interface GridFightTraitBasicInfo {
  ID: number;
  ActivationType: GridFightTraitActivationType;
  TraitSearchKey: string;
  IconPath: string;
  MiniIconPath: string;
  BEIDList: number[];
  TraitName: {
    Hash: bigint;
  };
  TraitEffectList: number[];
  TraitBaseDesc: {
    Hash: bigint;
  };
  TraitBaseSimpleDesc: {
    Hash: bigint;
  };
  BaseDescParamList: { Value: number }[];
  CutinPath: string;
  LevelGraphPath: string;
  SeasonID: number;
  TraitSortPriority: number;
  TraitType?: GridFightTraitType;
}
