import type { RogueRoomAttributeCategory } from "./enum/RogueRoomAttributeCategory";

/**
 * 历史版本接口：对应旧版本混淆字段布局，当前 DummyDll 已无对应类型，仅作旧数据参考。
 */

/** 差分宇宙S3信标表 */
export interface RoguePersonaRoomAttribute_V4_1 {
  /** id */
  FNHLKMBOLPD: number;
  /** 名称 */
  NJAPIHOAHAN: {
    Hash: bigint;
  };
  /** 技能 */
  INHDIFBOBFD: {
    Hash: bigint;
  };
  /** params */
  JNMAMOELCIB: {
    Value: number;
  }[];
  /** 正面/负面效果 */
  ODDLLABICOP: string;
  /** 图标 */
  LEFKFFICGAI: string;
}

/** 差分宇宙S3信标表 (V4.2) */
export interface RoguePersonaRoomAttribute_V4_2 {
  /** id */
  HKKKHAEIDFG: number;
  /** 名称 */
  PPHCAJEFDJN: {
    Hash: bigint;
  };
  /** 技能 */
  KLELLNFDBKM: {
    Hash: bigint;
  };
  /** params */
  EKHPCGCECOH: {
    Value: number;
  }[];
  /** 正面/负面效果 */
  LJBHHIDILON: string;
  /** 图标 */
  EOGLPPDKGED: string;
}

/**
 * 差分宇宙S3信标表（V4.3，当前）。
 * 对齐 DummyDll 中的 KCALGNOKBJH（混淆类型名）。
 */
export interface RoguePersonaRoomAttribute {
  /** id */
  HHPFKDEBMGP: number;
  /** 名称 */
  MJOOFPBABEA: {
    Hash: bigint;
  };
  /** 技能 */
  NMAHGFAPENI: {
    Hash: bigint;
  };
  /** params */
  PBLPLDJKPEI: { Value: number }[];
  /** 正面/负面效果 */
  OOMBNFMJLEO: RogueRoomAttributeCategory;
  /** 图标 */
  OLOIFNNLKJP: string;
}
