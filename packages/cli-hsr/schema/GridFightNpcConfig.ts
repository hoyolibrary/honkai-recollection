/** 对齐 DummyDll 中的 RPG.GameCore.GridFightNpcConfigRow。 */
export interface GridFightNpcConfig {
  ID: number;
  NpcType: number;
  NpcName: {
    Hash: bigint;
  };
  NpcDesc: {
    Hash: bigint;
  };
  Icon: string;
  RoundIcon: string;
  PositionRegion: string;
}
