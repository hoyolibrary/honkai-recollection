import type { AvatarConfigEnhanceableInfo } from "./AvatarConfigEnhanced";
import type { AttackDamageType } from "./enum/AttackDamageType";
import type { AvatarBaseType } from "./enum/AvatarBaseType";
import type { CombatPowerAvatarRarityType } from "./enum/CombatPowerAvatarRarityType";
import type { ItemMainType } from "./enum/ItemMainType";
import type { ItemRarity } from "./enum/ItemRarity";
import type { ItemSellType } from "./enum/ItemSellType";
import type { ItemSubType } from "./enum/ItemSubType";
import type { ItemUseMethod } from "./enum/ItemUseMethod";
import type { ItemConfigEntry } from "./ItemConfig";
import type { ElementResistanceConfig } from "./MonsterConfig";

/**
 * 对齐 DummyDll 中的 RPG.GameCore.AvatarRow。
 * 注意：C# 中 AvatarRow 无基类，此处 extends 为仓库内手动抽象（AvatarConfigEnhanceableInfo）
 */
export interface AvatarConfig extends AvatarConfigEnhanceableInfo {
  AvatarName: {
    Hash: bigint;
  };
  AvatarFullName: {
    Hash: bigint;
  };
  AdventurePlayerID: number;
  AvatarVOTag: string;
  Rarity: CombatPowerAvatarRarityType;
  DamageType: AttackDamageType;
  ExpGroup: number;
  MaxPromotion: number;
  MaxRank: number;
  AvatarBaseType: AvatarBaseType;
  DefaultAvatarModelPath: string;
  DefaultAvatarHeadIconPath: string;
  AvatarSideIconPath: string;
  AvatarMiniIconPath: string;
  AvatarGachaResultImgPath: string;
  ActionAvatarHeadIconPath: string;
  UltraSkillCutInPrefabPath: string;
  UIAvatarModelPath: string;
  ManikinJsonPath: string;
  SkilltreePrefabPath: string;
  DamageTypeResistance: ElementResistanceConfig[];
  Release: boolean;
  SideAvatarHeadIconPath: string;
  WaitingAvatarHeadIconPath: string;
  AvatarCutinImgPath: string;
  AvatarCutinBgImgPath: string;
  AvatarCutinFrontImgPath: string;
  AvatarCutinIntroText?: {
    Hash: bigint;
  };
  AvatarDropOffset: number[];
  AvatarTrialOffset: number[];
  PlayerCardOffset: number[];
  AssistOffset: number[];
  AssistBgOffset: number[];
  AvatarSelfShowOffset: number[];
  /** DummyDll 字段，当前 JSON 数据未观测 */
  AvatarInitialSkinName?: {
    Hash: bigint;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  NatureID?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  AvatarDesc?: {
    Hash: bigint;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  AvatarInitialSkinDesc?: {
    Hash: bigint;
  };
}

/** 对齐 DummyDll 中的 RPG.GameCore.ItemRow。 */
export interface ItemConfigAvatar {
  ID: number;
  ItemMainType: ItemMainType;
  ItemSubType: ItemSubType;
  InventoryDisplayTag: number;
  Rarity: ItemRarity;
  ItemName: {
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
  /** DummyDll 字段，当前 JSON 数据未观测 */
  ItemGroup?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  isVisible?: boolean;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  IsShowRedDot?: boolean;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  PurposeType?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  SellType?: ItemSellType;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  UseMethod?: ItemUseMethod;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  ItemDesc?: {
    Hash: bigint;
  };
}
