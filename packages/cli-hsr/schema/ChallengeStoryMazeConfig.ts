import type { AttackDamageType } from "./enum/AttackDamageType";

/** 对齐 DummyDll 中的 RPG.GameCore.ChallengeStoryMazeConfigRow。 */
export interface ChallengeStoryMazeConfig {
  ID: number;
  Name: {
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
  /** 得分目标（→ ChallengeStoryTargetConfig） */
  ChallengeTargetID: number[];
  StageNum: number;
  /** 原始即为空数组，展示 Boss 见 NpcMonsterIDList1/2 */
  MonsterID1: number[];
  MonsterID2: number[];
  MazeGroupID1: number;
  ConfigList1: number[];
  /** 节点主怪（模板 ID 口径），仅作展示摘要 */
  NpcMonsterIDList1: number[];
  EventIDList1: number[];
  MazeGroupID2: number;
  ConfigList2: number[];
  NpcMonsterIDList2: number[];
  EventIDList2: number[];
  /** 与期级 MazeBuffID 同源（Normal 期为天气、Fever 期为无文本占位），无层级独立敌方特性 */
  MazeBuffID: number;
}
