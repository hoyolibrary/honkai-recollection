import type { AttackDamageType } from "./enum/AttackDamageType";

/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeBossMazeConfigRow。 */
export interface ChallengeBossMazeConfig {
  ID: number;
  /** 未完整配置的预告层可缺省 */
  Name?: {
    Hash: bigint;
  };
  GroupID: number;
  MapEntranceID: number;
  MapEntranceID2: number;
  PreChallengeMazeID?: number;
  Floor: number;
  RewardID: number;
  /** 节点一推荐弱点 */
  DamageType1: AttackDamageType[];
  DamageType2: AttackDamageType[];
  ChallengeTargetID: number[];
  StageNum: number;
  /** 原始即为空数组，展示 Boss 见 ChallengeBossMazeExtra.MonsterID1/2/3 */
  MonsterID1: number[];
  MonsterID2: number[];
  MazeGroupID1: number;
  ConfigList1: number[];
  NpcMonsterIDList1: number[];
  EventIDList1: number[];
  MazeGroupID2: number;
  ConfigList2: number[];
  NpcMonsterIDList2: number[];
  EventIDList2: number[];
  /** 层级敌方特性（水温） */
  MazeBuffID: number;
}
