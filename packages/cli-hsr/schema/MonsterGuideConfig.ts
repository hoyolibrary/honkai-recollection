/**
 * 对齐 DummyDll 中的 RPG.GameCore.MonsterGuideConfigRow。
 * 末日幻影等挑战玩法的首领图鉴配置：按展示 Boss 战斗 MonsterID（含难度变体）
 * 关联特性、阶段与攻略文本；四难度行的 TagList 一致。
 */
export interface MonsterGuideConfig {
  /** 战斗 MonsterID（如 501401404，对应 ChallengeBossMazeExtra.MonsterID1/2/3） */
  MonsterID: number;
  /** 难度 1–4，同首领四行数据一致 */
  Difficulty: number;
  DifficultyList: number[];
  /** 特性列表（→ MonsterGuideTag.TagID），首个为核心特性，其余为常规特性 */
  TagList: number[];
  PhaseList: number[];
  DifficultyGuideList: number[];
  TextGuideList: number[];
}
