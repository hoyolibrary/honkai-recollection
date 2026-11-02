import type { ChallengeGroupType } from "./enum/ChallengeGroupType";

/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeStoryGroupConfigRow。 */
export interface ChallengeStoryGroupConfig {
  GroupID: number;
  GroupName: {
    Hash: bigint;
  };
  RewardLineGroupID: number;
  PreMissionID: number;
  ScheduleDataID: number;
  /** Normal 期（2001–2010）为真实天气；Fever 期指向无文本占位 buff，游戏内不展示 */
  MazeBuffID: number;
  BackGroundPath: string;
  TabPicPath: string;
  TabPicSelectPath: string;
  ChallengeGroupType: ChallengeGroupType;
  ThemePicPath: string;
  /** 仅开启星启（TierceMode）的期（当前 2024–2026）存在 */
  TierceID?: number;
}
