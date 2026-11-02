import type { ItemMainType } from "./enum/ItemMainType";
import type { ItemRarity } from "./enum/ItemRarity";
import type { ItemSellType } from "./enum/ItemSellType";
import type { ItemSubType } from "./enum/ItemSubType";
import type { ItemUseMethod } from "./enum/ItemUseMethod";
import type { PlayerOutfitSlotType } from "./enum/PlayerOutfitSlotType";

/** 对齐 DummyDll 中的 RPG.GameCore.ItemRow。 */
export interface ItemConfig {
  ID: number;
  ItemMainType: ItemMainType;
  ItemSubType: ItemSubType;
  InventoryDisplayTag: number;
  Rarity: ItemRarity;
  PurposeType?: number;
  ItemName?: {
    Hash: bigint;
  };
  ItemBGDesc?: {
    Hash: bigint;
  };
  ItemIconPath: string;
  ItemFigureIconPath: string;
  ItemCurrencyIconPath: string;
  ItemAvatarIconPath: string;
  PileLimit: number;
  CustomDataList: number[];
  ReturnItemIDList: ItemConfigEntry[];
  ItemDesc?: {
    Hash: bigint;
  };
  isVisible?: boolean;
  SellType?: ItemSellType;
  UseMethod?: ItemUseMethod;
  ItemGroup?: number;
  IsShowRedDot?: boolean;
}

/** 对齐 DummyDll 中的 RPG.GameCore.PlayerOutfitBaseRow。 */
export interface PlayerOutfitBase {
  OutfitID: number;
  SlotTypeList: PlayerOutfitSlotType[];
  ItemID?: number;
}

/** 对齐 DummyDll 中的 RPG.GameCore.ItemConfig。 */
export interface ItemConfigEntry {
  ItemID: number;
  ItemNum: number;
}
