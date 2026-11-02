import type { GridFightPropertyBindType } from "./enum/GridFightPropertyBindType";
import type { GridFightTrailLayerQuality } from "./enum/GridFightTrailLayerQuality";
import type { GridFightPropertyValue } from "./GridFightRoleStar";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightTraitLayerConfigRow。复合主键 (TraitID, Layer)。 */
export interface GridFightTraitLayer {
  TraitID: number;
  Layer: number;
  MazebuffID: number;
  PropertyBindType: GridFightPropertyBindType;
  TraitMemberPropertyList: GridFightPropertyValue[];
  AllMemberPropertyList: GridFightPropertyValue[];
  OverrideBEPropertyList: GridFightPropertyValue[];
  PropertyParamList: { Value: number }[];
  Quality?: GridFightTrailLayerQuality;
  PropertyDesc?: {
    Hash: bigint;
  };
}
