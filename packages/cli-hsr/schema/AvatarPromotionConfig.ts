import type { ItemConfigEntry } from "./ItemConfig";

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarPromotionRow。 */
export interface AvatarPromotionConfig {
  AvatarID: number;
  PromotionCostList: ItemConfigEntry[];
  MaxLevel: number;
  PlayerLevelRequire?: number;
  AttackBase: {
    Value: number;
  };
  AttackAdd: {
    Value: number;
  };
  DefenceBase: {
    Value: number;
  };
  DefenceAdd: {
    Value: number;
  };
  HPBase: {
    Value: number;
  };
  HPAdd: {
    Value: number;
  };
  SpeedBase: {
    Value: number;
  };
  CriticalChance: {
    Value: number;
  };
  CriticalDamage: {
    Value: number;
  };
  BaseAggro: {
    Value: number;
  };
  Promotion?: number;
  WorldLevelRequire?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  RankSpeedBase?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  RankDefenceAdd?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  RankSpeedAdd?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  RankDefenceBase?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  RankCriticalDamage?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  RankAttackAdd?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  RankAttackBase?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  RankHPAdd?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  MinimumFatigueRatio?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  SpeedAdd?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  RankCriticalChance?: {
    Value: number;
  };
  /** DummyDll 字段，当前 JSON 数据未观测 */
  RankHPBase?: {
    Value: number;
  };
}
