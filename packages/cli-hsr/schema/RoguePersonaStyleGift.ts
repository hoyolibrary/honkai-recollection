import type { RogueTournPersonaStyleGiftRarityType } from "./enum/RogueTournPersonaStyleGiftRarityType";

/**
 * 历史版本接口：对应旧版本混淆字段布局，当前 DummyDll 已无对应类型，仅作旧数据参考。
 */

export interface RoguePersonaStyleGift_V4_1 {
  /** id */
  BOEBFBLHFKG: number;
  /** 名称 */
  NJAPIHOAHAN: {
    Hash: bigint;
  };
  /** 图标 */
  LEFKFFICGAI: string;
  /** 描述（技能） */
  INHDIFBOBFD: {
    Hash: bigint;
  };
  OECFNFCINOB: boolean;
  /** params */
  JNMAMOELCIB: {
    Value: number;
  }[];
  /** 稀有度, `Common`, `Rare`, `Epic`, `Core` */
  ONNCAKOELMA: string;
  /** 适用的面具id列表 */
  MDNJHLKNANO: number[];
}

/** V4.2 */
export interface RoguePersonaStyleGift_V4_2 {
  /** id */
  FMKEDIDLCEG: number;
  /** 名称 */
  PPHCAJEFDJN: {
    Hash: bigint;
  };
  /** 图标 */
  EOGLPPDKGED: string;
  /** 描述（技能） */
  KLELLNFDBKM: {
    Hash: bigint;
  };
  OECFNFCINOB: boolean;
  /** params */
  EKHPCGCECOH: {
    Value: number;
  }[];
  /** 稀有度, `Common`, `Rare`, `Epic`, `Core` */
  MPNIDOCDOPG: string;
  /** 适用的面具id列表 */
  PMBIFNEHOHJ: number[];
}

/**
 * 差分宇宙S3 - 面具赠礼（V4.3+，当前）。
 * 对齐 DummyDll 中的 JEBLBMDOOML（混淆类型名）。
 */
export interface RoguePersonaStyleGift {
  /** id */
  FMDMDDCBPAM: number;
  /** 名称 */
  MJOOFPBABEA: {
    Hash: bigint;
  };
  /** 图标 */
  OLOIFNNLKJP: string;
  /** 描述（技能） */
  NMAHGFAPENI: {
    Hash: bigint;
  };
  /** params */
  PBLPLDJKPEI: { Value: number }[];
  /** 稀有度, `Common`, `Rare`, `Epic`, `Core` */
  PMIEAEGJNMJ: RogueTournPersonaStyleGiftRarityType;
  /** 适用的面具id列表 */
  NIKKAPEIDJO: number[];
  HILFNIOLPHN?: boolean;
  DEGHFCJNECP?: {
    Hash: bigint;
  };
  KGOEAGHJFKD?: number;
}
