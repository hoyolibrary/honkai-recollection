import type { AttackDamageType } from "./enum/AttackDamageType";

/**
 * 对齐 DummyDll 中的 RPG.GameCore.ChallengeStoryMazeTierceRow（字段名混淆，DummyDll 未收录该行类型，
 * 语义见 doc/abyss-challenge-extractor-plan.md §2.2/§7）。
 */
export interface ChallengeStoryMazeTierce {
  /** TierceID，对应 ChallengeStoryGroupConfig.TierceID */
  PHFMCACHFIJ: number;
  /** 触发层（期末层层 ID，如 20244） */
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
  /** 星启得分目标 ID 列表（→ ChallengeStoryTargetConfig.ID，如 4001/4002/4003） */
  OGEOMCGNNMP: number[];
  /** 星启最高档得分目标 ID（→ ChallengeStoryTargetConfig.ID，如 4000 = 99000 分） */
  GNGENMHNLAH: number;
  /** 星启通关分（如 45000） */
  IDBJENCBJHM: number;
  /** 星启战斗目标（→ ChallengeStoryTargetConfig.ID） */
  LDKPJPCMMAE: number[];
  IMCMJHAMMKK: number;
  EGEEJLHBALB: {
    ItemID: number;
    ItemNum?: number;
  }[];
  OGALGHMIIAH: {
    ItemID: number;
  }[];
}
