/** 对齐 DummyDll 中的 RPG.GameCore.GridFightDivisionLevelShowConfigRow。按 DivisionLevel + SeasonID。 */
export interface GridFightDivisionLevelShow {
  SeasonID: number;
  DivisionIcon: string;
  DivisionShowPic: string;
  DivisionName: {
    Hash: bigint;
  };
  DivisionNameWithNum: {
    Hash: bigint;
  };
  DivisionLevel?: number;
  DivisionRewardQuest?: number;
  DivisionAbbr?: {
    Hash: bigint;
  };
  DivisionSPRewardQuest?: number;
}
