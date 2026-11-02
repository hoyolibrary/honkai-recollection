/** 对齐 DummyDll 中的 RPG.GameCore.GridFightPortalBuffConfigRow。投资环境。 */
export interface GridFightPortalBuff {
  ID: number;
  JsonPath: string;
  EffectParamList: { Value: number }[];
  PortalBuffTitle: {
    Hash: bigint;
  };
  PortalBuffDesc: {
    Hash: bigint;
  };
  IconPath: string;
  ShowBonusID?: number;
  ShowBonusIDList: number[];
  IsOCEffective?: number;
  PortalGameRefTrait: number[];
  PortalGameRefScore: number[];
  DelayedShowBonus: number[];
  IfInBook?: boolean;
  ShowNpcIDList: number[];
}
