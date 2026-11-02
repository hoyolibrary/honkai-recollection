import type { LogicOperation } from "./enum/LogicOperation";
import type { MainMissionSubType } from "./enum/MainMissionSubType";
import type { MainMissionType } from "./enum/MainMissionType";
import type { MissionBeginType } from "./enum/MissionBeginType";
import type { MissionChapterType } from "./enum/MissionChapterType";

/** 对齐 DummyDll 中的 RPG.GameCore.MainMissionRow。 */
export interface MainMission {
  MainMissionID: number;
  Type: MainMissionType;
  WorldID?: number;
  DisplayPriority: number;
  NextMainMissionList: number[];
  Name?: {
    Hash: bigint;
  };
  TakeOperation: LogicOperation;
  BeginOperation: LogicOperation;
  TakeParam: MissionCondition[];
  BeginParam: MissionCondition[];
  NextTrackMainMission?: number;
  TrackWeight?: number;
  RewardID?: number;
  DisplayRewardID?: number;
  ChapterID?: number;
  SubRewardList: number[];
  MissionPack?: number;
  MissionAdvance?: number;
  IsInRaid?: boolean;
  SubType?: MainMissionSubType;
  MissionStoryEvent?: number;
}

/** 对齐 DummyDll 中的 RPG.GameCore.MainMissionPackRow。 */
export interface MainMissionPack {
  MissionPack: number;
  MainMissionIdList: number[];
}

/** 对齐 DummyDll 中的 RPG.GameCore.MissionChronicleFinishConclusionRow。 */
export interface ChronicleConclusion {
  MissionID: number;
  MissionConclusion: {
    Hash: bigint;
  };
}

/** 对齐 DummyDll 中的 BPIGEIIACAM（混淆类型名）。 */
export interface EndmostChronicle {
  /** 终末任务条目ID；通常与 MainMissionID 对应 */
  PHFMCACHFIJ: number;
  /** 描述文本（已确认：与 LGPDIDLJFOI 相比，这个字段用于 desc） */
  GFOGDOBBJAF: {
    Hash: bigint;
  };
  /** 标题文本（已确认：这个字段用于 name） */
  LGPDIDLJFOI: {
    Hash: bigint;
  };
  /** 图标路径：通用图或男性主角图 */
  FBKAMIHGLFK: string;
  /** 图标路径：女性主角图 */
  LDIHBHDHOMF: string;
  /** 疑似关联主线任务ID；当前样本中通常与 PHFMCACHFIJ 一致 */
  KEMBKKLCPBD?: number;
  /** 疑似后续终末条目ID列表 */
  PCFNMMOAGLA: number[];
  /** 用途待确认 */
  OFABOLACEEN: number[];
  /** 疑似终末剧情分组/阶段ID */
  JMEJCLEBFHN?: number;
  /** 疑似引用上一终末剧情分组/阶段ID */
  FPGMJLNEJCF?: number;
}

/**
 * 编年史章节配置（V4.5 及以前）。
 * 对齐历史数据中的 RPG.GameCore.MissionChapterConfigRow。
 */
export interface MissionChapterConfig_V4_5 {
  ID: number;
  ChapterName: string;
  StageName: string;
  ChapterDesc: string;
  ChapterType: MissionChapterType;
  LinkChapterList: number[];
  ChapterDisplayPriority: number;
  ChapterIconPath: string;
  ChapterFigureIconPath: string;
  OriginMainMission?: number;
  FinalMainMission?: number;
  ChapterSequence?: {
    Hash: bigint;
  };
}

/**
 * 编年史章节配置（V4.6+，当前）。
 * V4.6 起章节文本由内部标识符字符串改为 TextID，占位章节可缺省这些字段。
 */
export interface MissionChapterConfig {
  ID: number;
  ChapterName?: {
    Hash: bigint;
  };
  StageName?: {
    Hash: bigint;
  };
  ChapterDesc?: {
    Hash: bigint;
  };
  ChapterType: MissionChapterType;
  LinkChapterList: number[];
  ChapterDisplayPriority: number;
  ChapterIconPath: string;
  ChapterFigureIconPath: string;
  OriginMainMission?: number;
  FinalMainMission?: number;
  ChapterSequence?: {
    Hash: bigint;
  };
}

/** 对齐 DummyDll 中的 RPG.GameCore.MissionCondition。 */
export interface MissionCondition {
  Value?: number;
  Type: MissionBeginType;
}
