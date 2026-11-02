/** 对齐 DummyDll 中的 RPG.GameCore.GridFightCampConfigRow。 */
export interface GridFightCamp {
  ID: number;
  InitialRandomCode: number;
  IfRandomEnabled?: number;
  IconPath: string;
  ShowPicPath: string;
  CampName: {
    Hash: bigint;
  };
  MonsterList: number[];
  BattleAreaList: number[];
  SeasonID: number;
  BossBattleArea?: number;
}
