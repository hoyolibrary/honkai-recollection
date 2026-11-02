import type { GridFightSkillModifyOp } from "./enum/GridFightSkillModifyOp";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightRankSkillModifyConfigRow。 */
export interface GridFightRankSkillModify {
  RankID: number;
  SkillID: number;
  ModifySkillIndexs: number[];
  ModifyOps: GridFightSkillModifyOp[];
  ModifyValues: { Value: number }[];
}
