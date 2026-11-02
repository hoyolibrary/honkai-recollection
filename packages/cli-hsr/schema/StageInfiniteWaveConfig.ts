/** StageInfiniteWaveConfig.json：无限波次及其属性加成能力。 */
export interface StageInfiniteWaveConfig {
  InfiniteWaveID: number;
  MonsterGroupIDList: number[];
  MaxMonsterCount: number;
  MaxTeammateCount: number;
  Ability: string;
  ParamList: { Value: number }[];
  ClearPreviousAbility: boolean;
}
