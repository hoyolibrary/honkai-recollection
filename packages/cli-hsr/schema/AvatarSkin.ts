import type { AvatarSkinType } from "./enum/AvatarSkinType";
import type { ItemMainType } from "./enum/ItemMainType";
import type { ItemRarity } from "./enum/ItemRarity";
import type { ItemSellType } from "./enum/ItemSellType";
import type { ItemSubType } from "./enum/ItemSubType";
import type { ItemUseMethod } from "./enum/ItemUseMethod";
import type { PersonalizeShowType } from "./enum/PersonalizeShowType";
import type { ItemConfigEntry } from "./ItemConfig";

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarSkinRow。 */
export interface AvatarSkin {
  ID: number;
  AvatarID: number;
  Type: AvatarSkinType;
  PlayerCardID?: number;
  AvatarSkinSynopsis?: {
    Hash: bigint;
  };
  FreeStyleCharacterID: string;
  AvatarCutinFrontImgPath: string;
  AssistOffset: number[];
  PlayerPrefabPath: string;
  DefaultAvatarModelPath: string;
  UIAvatarModelPath: string;
  UltraSkillCutInPrefabPath: string;
  DefaultAvatarHeadIconPath: string;
  AdventureDefaultAvatarHeadIconPath: string;
  WaitingAvatarHeadIconPath: string;
  ActionAvatarHeadIconPath: string;
  SideAvatarHeadIconPath: string;
  AvatarSideIconPath: string;
  AvatarCutinImgPath: string;
  AvatarCutinBgImgPath: string;
  AvatarMiniIconPath: string;
  AvatarDropOffset: number[];
  AvatarSelfShowOffset: number[];
  ShowType: PersonalizeShowType;
  IntroDataID: number;
  ShopBgPath: string;
  GachaResultImgPath: string;
  SkinConfigPath: string;
  AdventureCharacterConfigOverrideJsonPath: string;
  AudioEventTag: string;
  DressIconPath: string;
  VideoID?: number;
  ActivitySkinName?: {
    Hash: bigint;
  };
  ActivityIntroDataID?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  PanelID?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  ShowParam?: number;
}

/** 对齐 DummyDll 中的 RPG.GameCore.ItemRow。 */
export interface ItemConfigAvatarSkin {
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
  ItemIconPath: string;
  ItemFigureIconPath: string;
  ItemCurrencyIconPath: string;
  ItemAvatarIconPath: string;
  PileLimit: number;
  CustomDataList: number[];
  ReturnItemIDList: ItemConfigEntry[];
  /** DummyDll 字段，当前 JSON 数据未观测 */
  ItemGroup?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  IsShowRedDot?: boolean;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  PurposeType?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  SellType?: ItemSellType;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  UseMethod?: ItemUseMethod;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  ItemBGDesc?: {
    Hash: bigint;
  };
}
