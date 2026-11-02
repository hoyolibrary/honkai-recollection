import type { GridFightEquipCategory } from "./enum/GridFightEquipCategory";
import type { GridFightEquipDressType } from "./enum/GridFightEquipDressType";
import type { GridFightEquipFuncType } from "./enum/GridFightEquipFuncType";
import type { GridFightPropertyValue } from "./GridFightRoleStar";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightEquipItemConfig。与 GridFightItems 等 ID。 */
export interface GridFightEquipment {
  ID: number;
  DressRuleParamList: number[];
  EquipCategory: GridFightEquipCategory;
  EquipFuncParamList: number[];
  AbilityName: string;
  ParamList: { Value: number }[];
  GeneralPropertyList: GridFightPropertyValue[];
  EquipmentTagList: number[];
  JsonPath: string;
  EffectParamList: { Value: number }[];
  DressRule?: GridFightEquipDressType;
  EquipDesc?: {
    Hash: bigint;
  };
  EquipFunc?: GridFightEquipFuncType;
  EquipType?: string;
  IsDisplaySpecialParam?: boolean;
}
