/** 对齐 DummyDll 中的 RPG.GameCore.AvatarServantRow。 */
export interface AvatarServantConfig {
  ServantID: number;
  ServantName: {
    Hash: bigint;
  };
  HeadIcon: string;
  UnCreateHeadIconPath: string;
  WaitingServantHeadIconPath: string;
  ActionServantHeadIconPath: string;
  ServantSideIconPath: string;
  ServantMiniIconPath: string;
  Config: string;
  AIPath: string;
  Prefab: string;
  ManikinJsonPath: string;
  UIServantModelPath: string;
  SkillIDList: number[];
  HPBase: string;
  HPInherit: string;
  HPSkill?: number;
  SpeedBase: string;
  SpeedInherit: string;
  SpeedSkill?: number;
  Aggro: {
    Value: number;
  };
}
