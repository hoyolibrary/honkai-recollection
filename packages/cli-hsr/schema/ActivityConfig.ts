/** 对齐 DummyDll 中的 RPG.GameCore.ActivityConfigRow。 */
export interface ActivityConfig {
  ActivityID: number;
  ActivityPanelID?: number;
  ResidentModuleList: number[];
  ActivityModuleIDList: number[];
  EarlyAccessContentID?: number;
}
