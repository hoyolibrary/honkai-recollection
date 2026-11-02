/** 对齐 DummyDll 中的 RPG.GameCore.GridFightItemConfigRow。玩法装备展示名与图标。 */
export interface GridFightItems {
  ID: number;
  ItemPriority: number;
  IconPath: string;
  SmallIconPath: string;
  ItemName: {
    Hash: bigint;
  };
}
