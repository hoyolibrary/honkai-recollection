import type { ChallengeTargetType } from "./enum/ChallengeTargetType";

/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeTargetConfigRow。 */
export interface ChallengeTargetConfig {
  ID: number;
  ChallengeTargetType: ChallengeTargetType;
  ChallengeTargetName: {
    Hash: bigint;
  };
  RewardID: number;
  ChallengeTargetParam1?: number;
}
