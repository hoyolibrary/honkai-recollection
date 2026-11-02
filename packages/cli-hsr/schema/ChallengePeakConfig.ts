import type { AttackDamageType } from "./enum/AttackDamageType";

/** 对齐 DummyDll 中的 RPG.GameCore.ChallengePeakConfigRow。 */
export interface ChallengePeakConfig {
  ID: number;
  Title: {
    Hash: bigint;
  };
  /** 目标（→ BattleTargetConfig，回合上限/死亡数等；设计文档原稿误记为 ChallengeTargetConfig） */
  NormalTargetList: number[];
  /** 推荐弱点 */
  DamageType: AttackDamageType[];
  /** → StageConfig */
  EventIDList: number[];
  /** 敌方特性（→ MazeBuff） */
  TagList: number[];
  /** 原样输出，语义未确认（设计文档 §7） */
  ProgressValueList: number[];
  HPProgressValueList: number[];
}
