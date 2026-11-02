import type { ChallengeTargetType } from "./enum/ChallengeTargetType";

/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeStoryTargetConfigRow。 */
export interface ChallengeStoryTargetConfig {
  ID: number;
  ChallengeTargetType: ChallengeTargetType;
  ChallengeTargetName: {
    Hash: bigint;
  };
  ChallengeTargetParam1?: number;
}
