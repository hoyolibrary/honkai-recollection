/** 对齐 DummyDll 中的 RPG.GameCore.HardLevelGroupRow。 */
export interface HardLevelGroup {
  HardLevelGroup: number;
  Level: number;
  AttackRatio: {
    Value: number;
  };
  DefenceRatio: {
    Value: number;
  };
  HPRatio: {
    Value: number;
  };
  SpeedRatio: {
    Value: number;
  };
  StanceRatio: {
    Value: number;
  };
  CombatPowerList: {
    Value: number;
  }[];
  StatusProbability?: {
    Value: number;
  };
  StatusResistance?: {
    Value: number;
  };
}
