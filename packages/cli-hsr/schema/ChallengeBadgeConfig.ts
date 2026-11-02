/**
 * 挑战徽章/奖牌（四模式共用表）。DummyDll 未收录对应 Row 类型，字段对齐数据表。
 * 异相仲裁取 Type=Peak 行（按 ChallengePeakGroupID 关联期、ChallengePeakLevel 区分奖牌档）；
 * Memory/Story/Boss 各 1 行为成就型徽章，本提取不使用。
 */
export interface ChallengeBadgeConfig {
  BadgeID: number;
  Type: string;
  ChallengePeakGroupID?: number;
  /** Bronze / Silver / Gold / Ultra */
  ChallengePeakLevel?: string;
  Name: {
    Hash: bigint;
  };
  Prefab: string;
  IconMiddlePath: string;
  IconItemPath: string;
  IconFigurePath: string;
  ComeFromText: {
    Hash: bigint;
  };
  ComeFromGoto: number;
  Desc: {
    Hash: bigint;
  };
}
