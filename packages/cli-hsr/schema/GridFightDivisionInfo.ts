/** 对齐 DummyDll 中的 RPG.GameCore.GridFightDivisionInfoConfigRow。ID 编码 1{Season}{Level:02}{Progress:02}。 */
export interface GridFightDivisionInfo {
  ID: number;
  SeasonID: number;
  Progress: number;
  DivisionRewardQuest: number[];
  DivisionIcon: string;
  DivisionShowPic: string;
  DivisionName: {
    Hash: bigint;
  };
  DivisionLevel?: number;
  IsPromotion?: boolean;
}
