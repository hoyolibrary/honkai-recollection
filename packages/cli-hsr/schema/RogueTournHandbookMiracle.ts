import type { RogueMiracleCategory } from "./enum/RogueMiracleCategory";

/** 对齐 DummyDll 中的 RPG.GameCore.RogueTournHandbookMiracleRow。 */
export interface RogueTournHandbookMiracle {
  HandbookMiracleID: number;
  MiracleDisplayID: number;
  MiracleCategory?: RogueMiracleCategory;
  UnlockDesc: number;
  MiracleEffectID?: number;
}
