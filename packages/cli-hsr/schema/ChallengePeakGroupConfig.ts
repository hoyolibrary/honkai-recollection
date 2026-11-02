/** 对齐 DummyDll 中的 RPG.GameCore.ChallengePeakGroupConfigRow。 */
export interface ChallengePeakGroupConfig {
  ID: number;
  Title: {
    Hash: bigint;
  };
  RecommendID: number;
  ActivityModule: number;
  /** 3 个前置层 ID（骑士一/二/三，→ ChallengePeakConfig） */
  PreLevelIDList: number[];
  /** Boss 层 ID（将杀王棋，→ ChallengePeakConfig + ChallengePeakBossConfig） */
  BossLevelID: number;
  RewardGroupID: number;
  BossUI3DPrefabPath: string;
  BossUI3DAnimatorPath: string;
  ThemePosterTabPicPath: string;
  ThemeIconPicPath: string;
  HandBookPanelBannerPath: string;
  /** 奖牌图标，按 Bronze/Silver/Gold/Ultra 顺序 */
  RankIconPathList: string[];
  /** 仅个别行存在，语义未确认 */
  HintGoodsID?: number;
}
