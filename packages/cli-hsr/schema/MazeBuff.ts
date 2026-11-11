import type { MazeBuffUseType } from "./enum/MazeBuffUseType";

/** 对齐 DummyDll 中的 RPG.GameCore.MazeBuffRow。 */
export interface MazeBuff {
  ID: number;
  BuffSeries: number;
  BuffRarity: number;
  Lv: number;
  LvMax: number;
  ModifierName: string;
  InBattleBindingType?: string;
  InBattleBindingKey: string;
  ParamList: {
    Value: number;
  }[];
  BuffIcon: string;
  BuffName: {
    Hash: bigint;
  };
  BuffDesc: {
    Hash: bigint;
  };
  BuffDescBattle: {
    Hash: bigint;
  };
  BuffEffect: string;
  MazeBuffType: string;
  MazeBuffIconType: string;
  DisplayType?: string;
  IsDisplayEnvInLevel?: boolean;
  MazeBuffPool?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  BuffDescParamByAvatarSkillID?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  UseType?: MazeBuffUseType;
  BuffSimpleDesc?: {
    Hash: bigint;
  };
}
