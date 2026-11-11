import type { ActivityPanelFinishType } from "./enum/ActivityPanelFinishType";

/** 对齐 DummyDll 中的 RPG.GameCore.ActivityPanelRow。 */
export interface ActivityPanel {
  PanelID: number;
  UIPrefab: string;
  UnlockConditions: string;
  SortWeight: number;
  TabName?: { Hash: bigint };
  TitleName?: { Hash: bigint };
  PanelDesc?: { Hash: bigint };
  ActivityTagList: number[];
  TabIcon: string;
  TagDesc?: { Hash: bigint };
  IntroDesc?: { Hash: bigint };
  DisplayItemList: { ItemID: number; ItemNum?: number }[];
  FinishConditions: string;
  ActivityThemeID?: number;
  PanelBrief?: { Hash: bigint };
  DailyHint?: boolean;
  DisplayItemManualSort?: boolean;
  FinishType?: ActivityPanelFinishType;
  IsSkipSwitchStoryLine?: boolean;
  IsSocialShow?: number;
  GuideVideoID?: number;
}
