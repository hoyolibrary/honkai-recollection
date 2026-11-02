/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeBossGroupConfigRow。 */
export interface ChallengeBossGroupConfig {
  GroupID: number;
  /** 未完整配置的预告期可缺省 */
  GroupName?: {
    Hash: bigint;
  };
  RewardLineGroupID: number;
  PreMissionID: number;
  ScheduleDataID: number;
  MazeBuffID: number;
  BackGroundPath: string;
  TabPicPath: string;
  TabPicSelectPath: string;
  ChallengeGroupType: string;
  ThemePicPath: string;
  /** 仅开启星启（TierceMode）的期（当前 3018+）存在 */
  TierceID?: number;
}
