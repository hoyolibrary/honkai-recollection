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
  /** DummyDll 字段，当前 JSON 数据未观测 */
  ChallengeTargetParam2?: number;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  ChallengeTargetParam3?: number;
}
