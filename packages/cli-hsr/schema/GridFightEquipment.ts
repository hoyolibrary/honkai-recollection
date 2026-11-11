import type { GridFightEquipCategory } from "./enum/GridFightEquipCategory";
import type { GridFightEquipDressType } from "./enum/GridFightEquipDressType";
import type { GridFightEquipFuncType } from "./enum/GridFightEquipFuncType";
import type { GridFightPropertyValue } from "./GridFightRoleStar";
import type { GridFightEquipDisplaySpecialParamType } from "./enum/GridFightEquipDisplaySpecialParamType";
import type { GridFightEquipType } from "./enum/GridFightEquipType";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightEquipConfigRow。 */
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
  EquipType?: GridFightEquipType;
  IsDisplaySpecialParam?: boolean;
  DisplaySpecialParam?: GridFightEquipDisplaySpecialParamType;
}
