import type { ChallengeGroupType } from "./enum/ChallengeGroupType";

/**
 * 对齐 DummyDll 中的 RPG.GameCore.ChallengeGroupConfigRow。
 * 忘却之庭期配置；按 ChallengeGroupType 区分（含 Story/Boss 的共用字段形态）。
 */
export interface ChallengeGroupConfig {
  GroupID: number;
  /** 仅最新期的行缺失该键（如 1035），期名输出空串 */
  GroupName?: {
    Hash: bigint;
  };
  RewardLineGroupID: number;
  PreMissionID: number;
  /** 非空即分期更新的混沌回忆期；空为固定内容（回忆 100 / 活动变体 900），提取时按此过滤 */
  ScheduleDataID?: number;
  /** 期级 MazeBuff（记忆紊流，各期独立） */
  MazeBuffID?: number;
  MapEntranceID: number;
  MappingInfoID: number;
  /** 仅固定内容组（100/900）存在 */
  WorldID?: number;
  BackGroundPath: string;
  TabPicPath: string;
  TabPicSelectPath: string;
  ChallengeGroupType: ChallengeGroupType;
  ThemePicPath: string;
  /** 仅开启星启（TierceMode）的期（当前 1033+）存在 */
  TierceID?: number;
}
