import type { ChallengeStoryType } from "./enum/ChallengeStoryType";

/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeStoryGroupExtraRow。 */
export interface ChallengeStoryGroupExtra {
  GroupID: number;
  ThemeToastPicPath: string;
  ThemeIconPicPath: string;
  ThemePosterEffectPrefabPath: string;
  ThemePosterBgPicPath: string;
  ThemePosterTabPicPath: string;
  /** → ChallengeStoryTheme.ThemeID */
  ThemeID: number;
  SubMazeBuffList: number[];
  StoryType: ChallengeStoryType;
  /** 期级可选 buff（三选一），单组（→ MazeBuff） */
  BuffList: number[];
}
