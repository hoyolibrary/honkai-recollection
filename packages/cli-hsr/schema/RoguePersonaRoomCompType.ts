import type { RogueCompositionTypeDisableOperation } from "./enum/RogueCompositionTypeDisableOperation";
import type { RogueTournPersonaRoomBgColorType } from "./enum/RogueTournPersonaRoomBgColorType";
import type { RogueTournRoomType } from "./enum/RogueTournRoomType";

/**
 * 以下为历史版本接口：对应旧版本混淆字段布局，当前 DummyDll 已无对应类型，仅作旧数据参考。
 */

/** 房间类型（差分宇宙S3，V4.1） */
export interface RoguePersonaRoomCompType_V4_1 {
  /** 房间类型 */
  JOHDFHDPFOK: number;
  /** 房间类型编码 */
  NKFNONAFCIC: string;
  /** 颜色类型 */
  IEMOFMMEFGO: string;
  /** 名称 */
  LEJHBGHDDHJ: {
    Hash: bigint;
  };
  /** 描述 */
  INHDIFBOBFD: {
    Hash: bigint;
  };
  /** 升级方式 */
  FBFELDNFJEN: {
    Hash: bigint;
  };
  /** 房间类型图标（白色，走格子） */
  LEFKFFICGAI: string;
  /** 房间类型图标（金色） */
  HICNBBEEGPJ: string;
}

/** 房间类型（差分宇宙S3，V4.2） */
export interface RoguePersonaRoomCompType_V4_2 {
  /** 房间类型 */
  KLOOFAEJGKD: number;
  /** 房间类型编码 */
  LHENDOOGBCK: string;
  /** 颜色类型 */
  KOOIFNFDOPL: string;
  /** 名称 */
  MOFGCGJDBKC: {
    Hash: bigint;
  };
  /** 描述 */
  KLELLNFDBKM: {
    Hash: bigint;
  };
  /** 升级方式 */
  FOLHPBELMJF: {
    Hash: bigint;
  };
  /** 房间类型图标（白色，走格子） */
  EOGLPPDKGED: string;
  /** 房间类型图标（金色） */
  NKFOCDBEADG: string;
}

/**
 * 房间类型（差分宇宙S3，V4.3+）。
 * 对齐 DummyDll 中的 DMJOFOOPKJP（混淆类型名）。
 */
export interface RoguePersonaRoomCompType {
  /** 房间类型 */
  LLICIMBCNPF: number;
  HCBADDHNIDG: number;
  /** 房间类型编码 */
  LHLKJIDFLIN: RogueTournRoomType;
  /** 颜色类型 */
  JPLIONFJGCL: RogueTournPersonaRoomBgColorType;
  /** 名称 */
  BAAOGIMCALN: {
    Hash: bigint;
  };
  /** 描述 */
  NMAHGFAPENI: {
    Hash: bigint;
  };
  /** 升级方式 */
  LJPBJNANBLB: {
    Hash: bigint;
  };
  /** 房间类型图标（白色，走格子） */
  OLOIFNNLKJP: string;
  /** 房间类型图标（金色） */
  CILPGJAFCOK: string;
  ENFPMJCLEON: RogueCompositionTypeDisableOperation[];
  LOBGFEKCOHM?: boolean;
}
