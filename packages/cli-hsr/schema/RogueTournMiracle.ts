import type { RogueMiracleCategory } from "./enum/RogueMiracleCategory";
import type { RogueTournMode } from "./enum/RogueTournMode";

/** 对齐 DummyDll 中的 RPG.GameCore.RogueTournMiracleRow。 */
export interface RogueTournMiracle {
  MiracleID: number;
  TournMode: RogueTournMode;
  MiracleCategory?: RogueMiracleCategory;
  MiracleDisplayID: number;
  MiracleEffectID: number;
  HandbookMiracleID?: number;
}
