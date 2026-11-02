import type { ItemConfigEntry } from "./ItemConfig";

/** 对齐 DummyDll 中的 RPG.GameCore.EquipmentPromotionRow。 */
export interface EquipmentPromotionConfig {
  EquipmentID: number;
  PromotionCostList: ItemConfigEntry[];
  PlayerLevelRequire?: number;
  MaxLevel: number;
  BaseHP: {
    Value: number;
  };
  BaseHPAdd: {
    Value: number;
  };
  BaseAttack: {
    Value: number;
  };
  BaseAttackAdd: {
    Value: number;
  };
  BaseDefence: {
    Value: number;
  };
  BaseDefenceAdd: {
    Value: number;
  };
  Promotion?: number;
  WorldLevelRequire?: number;
}
