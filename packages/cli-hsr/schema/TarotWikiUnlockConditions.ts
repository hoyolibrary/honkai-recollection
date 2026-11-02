import type { ConditionType } from "./enum/ConditionType";
import type { EntranceShowType } from "./enum/EntranceShowType";

/** 对齐 DummyDll 中的 RPG.GameCore.FuncUnlockConfigRow。 */
export interface TarotWikiUnlockConditions {
  UnlockID: number;
  Conditions: ConditionParam[];
  ShowCondition: EntranceShowType[];
}

/** 对齐 DummyDll 中的 RPG.GameCore.ConditionParam。 */
export interface ConditionParam {
  Param: string;
  Type: ConditionType;
}
