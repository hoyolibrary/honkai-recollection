/** 对齐 DummyDll 中的 RPG.GameCore.BattleTargetConfigRow。 */
export interface BattleTargetConfig {
  ID: number;
  /** 行类别（ChallengeTarget / PassTarget），非语义类型 */
  Type: string;
  /** 语义类型（BattleTarget_TurnLimit_PeakBattle_4 / BattleTarget_DeathCount 等） */
  AbilityName: string;
  ParamType: string;
  TargetParam?: number;
  HintStep: number[];
  TargetName: {
    Hash: bigint;
  };
  TargetNameSimple: {
    Hash: bigint;
  };
  MultiTarget: number[];
  MultiTargetIconType: string[];
  IconType?: string;
  IconNum?: number;
  SkipWhenSuccessOnEnterBattle?: boolean;
  ShowInScoreCounter?: boolean;
  IsFixableHeight?: boolean;
  IsShowProgress?: boolean;
}
