export interface RogueTournHandBookEventNPCProgress {
  /** 对应 RogueTournNPC.RogueNPCID，即图鉴解锁进度关联的 NPC 配置 ID。 */
  FDOELDMEBPE: number;
}

/** 对齐 DummyDll 中的 RPG.GameCore.RogueTournHandBookEventRow。 */
export interface RogueTournHandBookEvent {
  EventHandbookID: number;
  UnlockNPCProgressIDList: RogueTournHandBookEventNPCProgress[];
  EventTitle: { Hash: bigint };
  TypeDisplayID: number;
  UnlockDisplayID: number;
  Priority: number;
  IsUsed: boolean;
  ImageID: number;
}
