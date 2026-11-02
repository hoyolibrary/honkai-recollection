/** 对齐 DummyDll 中的 RPG.GameCore.ChallengePeakBossConfigRow。 */
export interface ChallengePeakBossConfig {
  ID: number;
  HardTitle: {
    Hash: bigint;
  };
  /** 可选增益插件（→ MazeBuff） */
  BuffList: number[];
  /** → StageConfig（绝境难度，敌人等级高于同层 EventIDList） */
  HardEventIDList: number[];
  /** 绝境敌方特性（→ MazeBuff） */
  HardTagList: number[];
  ColorMedalTarget: number;
  HardTarget: number;
}
