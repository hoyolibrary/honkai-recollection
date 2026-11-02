/** 对齐 DummyDll 中的 RPG.GameCore.GridFightAffixMazebuffConfigRow。结构镜像 MazeBuff。 */
export interface GridFightAffixMazebuff {
  ID: number;
  BuffSeries: number;
  BuffRarity: number;
  Lv: number;
  LvMax: number;
  ModifierName: string;
  InBattleBindingType: string;
  InBattleBindingKey: string;
  ParamList: { Value: number }[];
  BuffIcon: string;
  BuffName: {
    Hash: bigint;
  };
  BuffDesc: {
    Hash: bigint;
  };
  BuffEffect: string;
  MazeBuffType: string;
}
