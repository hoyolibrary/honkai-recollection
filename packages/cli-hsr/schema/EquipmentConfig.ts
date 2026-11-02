import type { AvatarBaseType } from "./enum/AvatarBaseType";
import type { CombatPowerLightconeRarityType } from "./enum/CombatPowerLightconeRarityType";
import type { ItemMainType } from "./enum/ItemMainType";
import type { ItemRarity } from "./enum/ItemRarity";
import type { ItemSellType } from "./enum/ItemSellType";
import type { ItemSubType } from "./enum/ItemSubType";
import type { ItemUseMethod } from "./enum/ItemUseMethod";
import type { ItemConfigEntry } from "./ItemConfig";

/** 对齐 DummyDll 中的 RPG.GameCore.EquipmentRow。 */
export interface EquipmentConfig {
  EquipmentID: number;
  Release: boolean;
  EquipmentName: {
    Hash: bigint;
  };
  Rarity: CombatPowerLightconeRarityType;
  AvatarBaseType: AvatarBaseType;
  MaxPromotion: number;
  MaxRank: number;
  ExpType: number;
  SkillID: number;
  ExpProvide: number;
  CoinCost: number;
  RankUpCostList: number[];
  ThumbnailPath: string;
  ImagePath: string;
  ItemRightPanelOffset: number[];
  AvatarDetailOffset: number[];
  BattleDialogOffset: number[];
  GachaResultOffset: number[];
  /** DummyDll 字段，当前 JSON 数据未观测 */
  EquipmentDesc?: {
    Hash: bigint;
  };
}

/** 对齐 DummyDll 中的 RPG.GameCore.ItemRow。 */
export interface ItemConfigEquipment {
  ID: number;
  ItemMainType: ItemMainType;
  ItemSubType: ItemSubType;
  InventoryDisplayTag: number;
  Rarity: ItemRarity;
  isVisible: boolean;
  ItemName: {
    Hash: bigint;
  };
  ItemDesc: {
    Hash: bigint;
  };
  ItemBGDesc: {
    Hash: bigint;
  };
  ItemIconPath: string;
  ItemFigureIconPath: string;
  ItemCurrencyIconPath: string;
  ItemAvatarIconPath: string;
  PileLimit: number;
  CustomDataList: number[];
  ReturnItemIDList: ItemConfigEntry[];
  SellType?: ItemSellType;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  ItemGroup?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  IsShowRedDot?: boolean;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  PurposeType?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  UseMethod?: ItemUseMethod;
}
