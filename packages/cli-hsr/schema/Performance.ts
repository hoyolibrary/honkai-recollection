export type PerformanceSkipType = "Never" | "AfterSeen" | "Always";

export type PerformanceBlackType = "None" | "Full" | "NoPre" | "NoPost" | "NoPrePost";

export type PerformanceChangePlayerType = "None" | "StoryLine" | "Character";

/** 对齐 DummyDll 中的 RPG.GameCore.PerformanceARow。 */
export interface PerformanceA {
  PerformanceID: number;
  PerformancePath: string;
  PlaneID?: number;
  FloorID?: number;
  IsSkip?: PerformanceSkipType;
  StartBlack?: PerformanceBlackType;
  EndBlack?: PerformanceBlackType;
  EndWithCrack?: boolean;
}

/** PerformanceC.json 与 PerformanceA.json 的 CLR 字段定义完全相同。 */
export type PerformanceC = PerformanceA;

/** 对齐 DummyDll 中的 RPG.GameCore.PerformanceDRow。 */
export interface PerformanceD {
  PerformanceID: number;
  PerformancePath: string;
  PerformanceCharacter: string;
  PlaneID?: number;
  FloorID?: number;
  GroupID?: number;
  IsSkip?: PerformanceSkipType;
  StartBlack?: PerformanceBlackType;
  EndBlack?: PerformanceBlackType;
  EndWithCrack?: boolean;
  ChangePlayerType?: PerformanceChangePlayerType;
}

/** DummyDll 没有独立 PerformanceDSRow；PerformanceDS.json 复用 PerformanceD 的定义。 */
export type PerformanceDS = PerformanceD;

/** 对齐 DummyDll 中的 RPG.GameCore.PerformanceERow。 */
export interface PerformanceE {
  PerformanceID: number;
  PerformancePath: string;
  PerformanceCharacter: string;
  PlaneID?: number;
  FloorID?: number;
  IsSkip?: PerformanceSkipType;
  IsIntroDialogue?: boolean;
  StartBlack?: PerformanceBlackType;
  EndBlack?: PerformanceBlackType;
  EndWithCrack?: boolean;
  ChangePlayerType?: PerformanceChangePlayerType;
}

/** PerformanceVideo.json 与 PerformanceA.json 的 CLR 字段定义相同（内容为播放视频的演出）。 */
export type PerformanceVideo = PerformanceA;

/** 剧情回顾/跳过文案中标注的演出类型；与演出来源表类型不严格对应（如 D 可能实际来自 PerformanceC 表）。 */
export type PerformanceSkipOverrideType = "C" | "D" | "E" | "PlayVideo";

/** 对齐 DummyDll 中的 RPG.GameCore.PerformanceSkipOverrideRow。 */
export interface PerformanceSkipOverride {
  PerformanceID: number;
  PerformanceType: PerformanceSkipOverrideType;
  /** 回顾段落/跳过确认展示的官方文案 */
  Desc?: { Hash: bigint };
  IsOverrideCharacter?: number;
  /** 回顾界面展示的角色，元素为 TalkSentenceName_* 文本键 */
  OverrideCharacterList: string[];
  IsOverrideImportantFlag?: number;
  OverrideImportantFlag?: number;
  IsConfirmRequiredToSkipFlag?: number;
  PackID?: number;
}

/** 回放文案覆盖表标注的演出类型 */
export type PerformanceReplayOverrideType = "A" | "PlayVideo";

/** 对齐 DummyDll 中的 RPG.GameCore.PerformanceReplayOverrideRow（推断）。 */
export interface PerformanceReplayOverride {
  PerformanceID: number;
  PerformanceType: PerformanceReplayOverrideType;
  /** 剧情回放界面展示的官方文案；与 SkipOverride 同演出共存时两者文本不同 */
  Desc?: { Hash: bigint };
}

/** 对齐 DummyDll 中的 RPG.GameCore.PerformanceSkipFlagC/D/E。（推断） */
export interface PerformanceSkipFlag {
  PerformanceID: number;
  Skippable?: boolean;
  /** 演出中出现的角色，元素为 TalkSentenceName_* 文本键 */
  ActorList: string[];
  /** 官方标注该演出包含重要分支（选项/真随机结果的分歧内容） */
  ContainImportBranch?: boolean;
}
