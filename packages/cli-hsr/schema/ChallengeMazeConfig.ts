import type { AttackDamageType } from "./enum/AttackDamageType";

/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeMazeConfigRow。 */
export interface ChallengeMazeConfig {
  ID: number;
  Name: {
    Hash: bigint;
  };
  GroupID: number;
  MapEntranceID: number;
  MapEntranceID2: number;
  PreLevel: number;
  RewardID: number;
  /** 节点一推荐弱点 */
  DamageType1: AttackDamageType[];
  DamageType2: AttackDamageType[];
  /** 三星星数条件（→ ChallengeTargetConfig） */
  ChallengeTargetID: number[];
  StageNum: number;
  /** 原始即为空数组，展示 Boss 见 NpcMonsterIDList1/2 */
  MonsterID1: number[];
  MonsterID2: number[];
  ChallengeCountDown: number;
  MazeGroupID1: number;
  ConfigList1: number[];
  /** 节点主怪（模板 ID 口径），仅作展示摘要 */
  NpcMonsterIDList1: number[];
  EventIDList1: number[];
  PreChallengeMazeID?: number;
  MazeGroupID2?: number;
  ConfigList2: number[];
  NpcMonsterIDList2: number[];
  EventIDList2: number[];
  /** 保留期内与期级 MazeBuffID 一致（记忆紊流），无层级独立敌方特性 */
  MazeBuffID: number;
  /** 固定内容组（100/900）的行缺失 */
  Floor?: number;
}
