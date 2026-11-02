/** 对齐 DummyDll 中的 RPG.GameCore.RogueMiracleDisplayRow。 */
export interface RogueMiracleDisplay {
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
