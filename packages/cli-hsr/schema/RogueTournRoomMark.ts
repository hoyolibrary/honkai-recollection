import type { RogueTournMarkType } from "./enum/RogueTournMarkType";
import type { RogueTournRoomType } from "./enum/RogueTournRoomType";

/**
 * 房间类型（模拟宇宙）。
 * 对齐 DummyDll 中的 RPG.GameCore.RogueRoomTypeRow。
 */

export interface RogueRoomType {
  RogueRoomType: number;
  RogueRoomTypeTextmapID: {
    Hash: bigint;
  };
  RoomTypeDescTextmapID: {
    Hash: bigint;
  };
  RogueRoomTypeIcon: string;
  MapShowType: boolean;
  RoomIconEffect: string;
  RoomTypeDescTextmapID2?: {
    Hash: bigint;
  };
  IsSuper?: boolean;
}
/**
 * 房间类型（差分宇宙）。
 * 对齐 DummyDll 中的 FELFHPGLFGC（混淆类型名）。
 */

export interface RogueTournRoomMark {
  /** 房间类型编码 */
  LHLKJIDFLIN: RogueTournRoomType;
  /** 名称 */
  OPLOPGILKKH?: {
    Hash: bigint;
  };
  /** config path */
  LJFOMBOOEIC: string;
  /** 房间类型图标（白色，走格子） */
  ICIDICKIDCB: string;
  /** 房间类型图标（金色） */
  JLFLCFGCHHC: string;
  HLALFNEDFED?: RogueTournMarkType;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  AEEEKGOKJIH?: {
    Hash: bigint;
  };
}
