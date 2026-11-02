import type { TextJoinOverrideType } from "./enum/TextJoinOverrideType";

/** 对齐 DummyDll 中的 RPG.GameCore.TextJoinConfigRow。 */
export interface TextJoinConfig {
  TextJoinID: number;
  DefaultItem: number;
  TextJoinItemList: number[];
  IsOverride?: boolean;
  Type?: TextJoinOverrideType;
}

/** 对齐 DummyDll 中的 RPG.GameCore.TextJoinItemRow。 */
export interface TextJoinItem {
  TextJoinItemID: number;
  TextJoinText?: {
    Hash: bigint;
  };
}
