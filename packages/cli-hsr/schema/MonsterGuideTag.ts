/**
 * 对齐 DummyDll 中的 RPG.GameCore.MonsterGuideTagRow。
 * 首领特性条目：名称 + 简介富文本（#N[i] 占位符由 ParameterList 插值）。
 */
export interface MonsterGuideTag {
  /** 特性 ID，前四位标识首领（如 101601），末两位 01 为核心特性 */
  TagID: number;
  TagName: {
    Hash: bigint;
  };
  TagBriefDescription: {
    Hash: bigint;
  };
  ParameterList: number[];
  SkillID?: number;
  EffectID: number[];
}
