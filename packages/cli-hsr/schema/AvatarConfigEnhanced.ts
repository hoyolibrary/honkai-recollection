/**
 * AvatarRow 与 EnhancedAvatarRow 的公共字段抽象（仓库内手动维护，DummyDll 无此类型）。
 * 对齐 DummyDll 中的 RPG.GameCore.AvatarRow / RPG.GameCore.EnhancedAvatarRow 的同名公共字段。
 */
export interface AvatarConfigEnhanceableInfo {
  AvatarID: number;
  JsonPath: string;
  AIPath: string;
  SPNeed: { Value: number };
  RankIDList: number[];
  SkillList: number[];
}

/**
 * 对齐 DummyDll 中的 RPG.GameCore.EnhancedAvatarRow。
 * 注意：C# 中 EnhancedAvatarRow 无基类，此处 extends 为仓库内手动抽象
 */
export interface AvatarConfigEnhanced extends AvatarConfigEnhanceableInfo {
  EnhancedID: number;
}
