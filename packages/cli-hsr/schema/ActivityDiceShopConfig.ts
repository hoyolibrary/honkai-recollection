import type { ItemConfigEntry } from "./ItemConfig";
import type { ConditionParam } from "./TarotWikiUnlockConditions";

/** 对齐 DummyDll 中的 RPG.GameCore.ActivityDiceCombatShopRow。 */
export interface ActivityDiceShopConfig {
  DiceShopID: number;
  GoodsList: number[];
  IMGPath: string;
  ShopSortID: number;
  Name: {
    Hash: bigint;
  };
}

/** 对齐 DummyDll 中的 RPG.GameCore.ActivityDiceCombatShopGoodsRow。 */
export interface ActivityDiceShopGoodsConfig {
  DiceShopGoodsID: number;
  ItemID: number;
  ItemCost: ItemConfigEntry[];
  UnlockCondition: ConditionParam[];
  GoodsSortID: number;
  UnlockTipsList: number[];
}
