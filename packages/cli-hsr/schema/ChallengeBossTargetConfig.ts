import type { ChallengeTargetType } from "./enum/ChallengeTargetType";

/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeBossTargetConfigRow。 */
export interface ChallengeBossTargetConfig {
  ID: number;
  ChallengeTargetType: ChallengeTargetType;
  ChallengeTargetName: {
    Hash: bigint;
  };
  ChallengeTargetParam1: number;
}
