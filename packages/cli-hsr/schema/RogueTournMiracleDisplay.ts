/**
 * 对齐 DummyDll 中的 RPG.GameCore.RogueMiracleDisplayRow。
 * 与 RogueMiracleDisplay.json 共用同一行类型。
 */
export interface RogueTournMiracleDisplay {
  MiracleDisplayID: number;
  MiracleName: {
    Hash: bigint;
  };
  MiracleBGDesc?: {
    Hash: bigint;
  };
  MiracleIconPath: string;
  MiracleFigureIconPath: string;
}
