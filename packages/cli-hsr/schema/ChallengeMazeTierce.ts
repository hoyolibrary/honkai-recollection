import type { AttackDamageType } from "./enum/AttackDamageType";

/**
 * 对齐 DummyDll 中的 RPG.GameCore.ChallengeMazeTierceRow（字段名混淆，DummyDll 未收录该行类型，
 * 语义见 doc/abyss-challenge-extractor-plan.md §2.1/§7）。
 */
export interface ChallengeMazeTierce {
  /** TierceID，对应 ChallengeGroupConfig.TierceID */
  PHFMCACHFIJ: number;
  /** 触发层（期末层层 ID，如 5412） */
  DLCKKJFMJOB: number;
  EMNJGCPDIFF: number;
  LCHKKJDBLGM: number[];
  PHOIICMCGIH: number;
  MLMEGBLDFKE: number[];
  /** 星启节点展示 Boss 模板列表（模板 ID 口径） */
  JEBMBCLBIOI: number[];
  /** 星启节点 Stage 列表（→ StageConfig.StageID） */
  HFIAAGAKFMD: number[];
  /** 星启节点推荐弱点 */
  LOJCIDLKPKG: AttackDamageType[];
  /** 疑似星启轮数上限（当前恒 45，未确认） */
  GNOOAGPBNLD: number;
  /** 星启星数目标 ID 列表（→ ChallengeTargetConfig.ID，如 601/602/603） */
  OGEOMCGNNMP: number[];
  /** 星启最高档目标 ID（→ ChallengeTargetConfig.ID，如 600） */
  GNGENMHNLAH: number;
  IMCMJHAMMKK: number;
  EGEEJLHBALB: {
    ItemID: number;
    ItemNum?: number;
  }[];
  OGALGHMIIAH: {
    ItemID: number;
  }[];
}
