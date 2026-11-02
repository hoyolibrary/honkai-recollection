import type { AttackDamageType } from "./enum/AttackDamageType";

/**
 * 对齐 DummyDll 中的 RPG.GameCore.ChallengeBossMazeTierceRow（字段名混淆，语义见
 * doc/abyss-challenge-extractor-plan.md §2.3/§7）。
 */
export interface ChallengeBossMazeTierce {
  /** TierceID，对应 ChallengeBossGroupConfig.TierceID */
  PHFMCACHFIJ: number;
  /** 触发层（期末层层 ID，如 30204） */
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
  /** 星启得分目标 ID 列表（→ ChallengeBossTargetConfig.ID，如 5001/5002/5003） */
  OGEOMCGNNMP: number[];
  /** 星启最高档得分目标 ID（→ ChallengeBossTargetConfig.ID，如 5000 = 10200 分） */
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
