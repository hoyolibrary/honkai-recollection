/** 差分宇宙S3 - 面具 */
export interface RoguePersonaStyle_V4_1 {
  /** id */
  JGGMMHNKCEJ: number;
  /** 大图标 */
  NLAPOPICKMA: string;
  /** 中图标 */
  HIBCAPBAGMF: string;
  /** 名称 */
  NJAPIHOAHAN: {
    Hash: bigint;
  };
  /** 描述 */
  LNENPEJPFJN: {
    Hash: bigint;
  };
  /** 特性 */
  INHDIFBOBFD: {
    Hash: bigint;
  };
  /** 愿力获取 */
  IJNAGNNILJK: {
    Hash: bigint;
  };
  /** 面具效果（技能） */
  IDKKBEMKAGP: {
    Hash: bigint;
  };
  /** params （{@link IJNAGNNILJK}和{@link IDKKBEMKAGP}共用） */
  JNMAMOELCIB: {
    Value: number;
  }[];
  PIACDCJBEAA: number[];
  /** visible */
  HMDABDFALIN: boolean;
  DCIFIGMEJGI: number;

  /** unlock ID */
  LJAPFLGMMIL?: number;
}

/** 差分宇宙S3 - 面具 (V4.2) */
export interface RoguePersonaStyle_V4_2 {
  /** id */
  GOJHJGEFGGN: number;
  /** 大图标 */
  JMJKLOFEDOI: string;
  /** 中图标 */
  ABIAOGCCOCO: string;
  /** 名称 */
  PPHCAJEFDJN: {
    Hash: bigint;
  };
  /** 描述 */
  NNGNENPFOIH: {
    Hash: bigint;
  };
  /** 特性 */
  KLELLNFDBKM: {
    Hash: bigint;
  };
  /** 愿力获取 */
  HOLOJHGGIOG: {
    Hash: bigint;
  };
  /** 面具效果（技能） */
  JMIALJBDFOH: {
    Hash: bigint;
  };
  /** params （{@link HOLOJHGGIOG}和{@link JMIALJBDFOH}共用） */
  EKHPCGCECOH: {
    Value: number;
  }[];
  /** unlock ID */
  HICJIGNCDOL?: number;
  HCHANMKMJEF: number[];
  /** visible */
  LFCFLNGOFED: boolean;
  LFMHMLPDCJN: number;

}

/**
 * 差分宇宙S3 - 面具 (V4.3+)
 * 对齐 DummyDll 中的混淆类型 MMCJMOHNKCB。
 */
export interface RoguePersonaStyle {
  /** id */
  KLOEJIMMPJM: number;
  /** 大图标 */
  BCGJNNDCIFH: string;
  /** 中图标 */
  DOKOMKFGOOC: string;
  /** 名称 */
  MJOOFPBABEA: {
    Hash: bigint;
  };
  /** 描述 */
  DDGDJCKKHPH: {
    Hash: bigint;
  };
  /** 特性 */
  NMAHGFAPENI: {
    Hash: bigint;
  };
  /** 愿力获取 */
  PJNNPOKJEFD: {
    Hash: bigint;
  };
  /** 面具效果（技能） */
  FBOICELIKNJ: {
    Hash: bigint;
  };
  /** params （{@link PJNNPOKJEFD}和{@link FBOICELIKNJ}共用） */
  PBLPLDJKPEI: {
    Value: number;
  }[];
  /** unlock ID */
  JJKLIJNFIBB?: number;
  JEHDKAKMCGC: number[];
  /** visible */
  GIFCDPFAKKP: boolean;
  PILOLAAEAHB: number;

  /** DummyDll 字段，当前 JSON 数据未观测 */
  OHBMLDNKGMD?: string;
  /** DummyDll 字段，当前 JSON 数据未观测 */
  LCNLDGGAOBH?: string;
}

/** 对齐 DummyDll 中的 RPG.GameCore.RogueUnlockConfigRow。 */
export interface RogueTournUnlock {
  RogueUnlockID: number;
  UnlockFinishWay: number;
  RogueUnlockDetail: {
    Hash: bigint;
  };
}
