import type { GridFightEquipCategory } from "./enum/GridFightEquipCategory";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightEquipCategoryInfoConfigRow。 */
export interface GridFightEquipCategoryInfo {
  EquipCategory: GridFightEquipCategory;
  CategoryName: {
    Hash: bigint;
  };
  EquipCount?: number;
}
