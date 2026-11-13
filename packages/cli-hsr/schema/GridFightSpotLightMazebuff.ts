import type { MazeBuffType } from "./enum/MazeBuffType";
import type { MazeBuffInBattleBindingType } from "./enum/MazeBuffInBattleBindingType";

/** 原始 GridFightSpotLightMazebuff JSON；字段使用 RPG.GameCore.MazeBuffRow 的公共布局。 */
export interface GridFightSpotLightMazebuff {
  ID: number;
  BuffSeries: number;
  BuffRarity: number;
  Lv: number;
  LvMax: number;
  ModifierName: string;
  InBattleBindingType: MazeBuffInBattleBindingType;
  InBattleBindingKey: string;
  ParamList: { Value: number }[];
  BuffIcon: string;
  BuffName: { Hash: bigint };
  BuffDesc: { Hash: bigint };
  BuffEffect: string;
  MazeBuffType: MazeBuffType;
}
