/**
 * 历史版本接口：对应旧版本混淆字段布局，当前 DummyDll 已无对应类型，仅作旧数据参考。
 */

export interface ActivityDiceSkill_V4_0 {
  /** skillId */
  MPBBBEHANOJ: number;
  /** 技能图标 */
  GDOLCABIKJI: string;
  /** params */
  FDKCKECMFHL: number[];
  PKHPHOPBLCN: number[];
  /** 技能描述 */
  INHPMMFHPFN: {
    Hash: bigint;
  };
  CDAJHBAKDGN: number[];
}

export interface ActivityDiceSkill_V4_1 {
  /** skillId */
  LMDKONPLNBI: number;
  /** 技能图标 */
  ILMEMDNMODC: string;
  /** params */
  JNMAMOELCIB: number[];
  PFLMKFCLIEJ: number[];
  /** 技能描述 */
  INHDIFBOBFD: {
    Hash: bigint;
  };
  IDBOOAEHIDJ: number[];
}

/** V4.2改结构了 */
export interface ActivityDiceSkill_V4_2 {
  /** skillId */
  GKEMENLDNNC: number;
  /** 技能图标 */
  AGKDIBJPOBG: string;
  /** params */
  EKHPCGCECOH: number[];
  IDFPCABEAGE: number[];
  /** 技能描述 */
  KLELLNFDBKM: {
    Hash: bigint;
  };
  MGOPGNCGABN: number[];
}

/**
 * 活动骰子技能（差分宇宙，V4.3+，当前）。
 * 对齐 DummyDll 中的 EPOFOGGGMEH（混淆类型名）。
 */
export interface ActivityDiceSkill {
  /** skillId */
  CDNGHDNMMAG: number;
  /** 技能图标/配置路径 */
  PMKEDGGOLKD: string;
  /** params */
  PBLPLDJKPEI: number[];
  NJJEIJGIENP: number[];
  /** 技能描述 */
  NMAHGFAPENI: {
    Hash: bigint;
  };
  PGAMJHMNLLN: number[];
}
