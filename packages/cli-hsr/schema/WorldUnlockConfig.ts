/** 对齐 DummyDll 中的 RPG.GameCore.WorldUnlockConfigRow。 */
export interface WorldUnlockConfig {
  ID: number;
  InitMainMissionList: number[];
  DirectUnlockCondition: string;
  WorldPreUnlockStartMission: number;
  WorldPreUnlockEndMission: number;
  NewWorldHintDialogPrefab: string;
  NewWorldHintDialogActivityID?: number;
  PreWorldID?: number;
}
