import TextMap from "../../text";
import { getUrl } from "../../url";
import { calcChallengeHp, getChallengeTables, noteChallengeMiss } from "./ChallengeCommon";
import type { HsrChallengeInvasion, HsrChallengeStage } from "@game/games/hsr/challenge";

/**
 * 贪饕污染（StageInvasion）实例标记与节点摘要。
 *
 * 语义唯一来源 doc/stage-invasion-report.md：
 * §4.2 参数/系数（INVASION_HP_BOOST）、§4.4 原生二进制验证、§5.4 标记算法。
 * LMEBOHHDIAG 为按配置条目内出怪序号的循环掩码；侵染比率与虚构波次 HPAddedRatio
 * 同槽叠加，invasionHp 以叠加倍率整体重算（一次取整），不做除法回推。
 */

/**
 * 污染血量系数 = MazeBuff 3034001-3 ParamList[1]（0.1/0.2/0.3，客户端修饰器 MDF_Param2 口径）。
 * 2026-10-06 经外部站点（来生泅渡其十二 = Stage 30125121，等级 3）逐怪数值交叉验证收敛，
 * 半整数样例证实 ceil 口径；校准依据见 doc/stage-invasion-report.md §4.2。
 */
export const INVASION_HP_BOOST: Record<1 | 2 | 3, number> = { 1: 0.1, 2: 0.2, 3: 0.3 };

/** buildChallengeStage 末尾挂接：按出怪序号循环掩码标记侵染实例并物化 invasionHp（§5.4） */
export function applyStageInvasion(stageId: number, stage: HsrChallengeStage): void {
  const shared = getChallengeTables();
  const row = shared.stageInvasionMap.get(stageId);
  if (!row) return;
  const level = row.InvasionID as 1 | 2 | 3;
  const boost = INVASION_HP_BOOST[level];
  if (boost == null) {
    noteChallengeMiss(`StageInvasionConfig.InvasionID:${stageId}/${row.InvasionID}`);
    return;
  }
  const stageRow = shared.stageMap.get(stageId);
  // 每个配置条目独立计数：第 n 只同名怪看 flags[n % len]，非 0 即侵染；空数组 = 全部（§4.4）
  const spawnCount = new Map<number, number>();
  for (const wave of stage.waves) {
    for (const enemy of wave) {
      const entryIndex = row.MonsterInvasionList.findIndex(m => m.DBLDCKODNEN === enemy.monsterId);
      if (entryIndex < 0) continue;
      const flags = row.MonsterInvasionList[entryIndex].LMEBOHHDIAG;
      const n = spawnCount.get(entryIndex) ?? 0;
      spawnCount.set(entryIndex, n + 1);
      if (flags.length > 0 && flags[n % flags.length] === 0) continue;
      const monster = shared.monsterMap.get(enemy.monsterId);
      if (!monster) continue; // buildChallengeStage 已记录未命中
      const effectiveElite = enemy.eliteGroup ?? stageRow?.EliteGroup ?? monster.EliteGroup ?? 1;
      const multiplier = enemy.hpMultiplier ?? 1;
      enemy.invasionLevel = level;
      // 与波次 HPAddedRatio 同槽叠加（属性管道单 Ratio 聚合）：以叠加倍率整体重算
      enemy.invasionHp = calcChallengeHp(
        enemy.templateId,
        stageRow?.HardLevelGroup,
        stageRow?.Level ?? 0,
        effectiveElite,
        monster.HPModifyRatio?.Value,
        1 + (multiplier - 1) + boost,
        enemy.hpCalculation,
      );
    }
  }
}

/**
 * 节点级污染摘要：等级按「stageId 命中 StageInvasionConfig」推导（不依赖实例标记）。
 * 末日幻影等关卡的侵染对象是战斗中变身/召唤出的形态（不在静态波次内，如 420504 的
 * 202206018/202303204），此时仅节点徽章生效、无逐怪 invasionHp；混编关的实例标记
 * 仍由 applyStageInvasion 按掩码精确控制。
 */
export function deriveNodeInvasion(lang: string, stages: HsrChallengeStage[]): HsrChallengeInvasion | undefined {
  const shared = getChallengeTables();
  let level: 1 | 2 | 3 | undefined;
  for (const stage of stages) {
    const row = shared.stageInvasionMap.get(stage.stageId);
    if (row && (level == null || row.InvasionID > level)) {
      level = row.InvasionID as 1 | 2 | 3;
    }
  }
  if (level == null) return undefined;
  const row = shared.invasionBuffMap.get(level);
  if (!row) {
    noteChallengeMiss(`StageInvasionBuff:${level}`);
    return { level, desc: "" };
  }
  TextMap.setTagInfo(lang, row.InvasionDesc.Hash, {
    category: { challengeinvasion: level + "", type: "StageInvasionBuff" },
    tags: ["challenge", "challengeinvasion"],
  });
  return {
    level,
    desc: TextMap.getText(lang, row.InvasionDesc.Hash),
    icon: shared.gluttonyStatusIcon,
  };
}

/** 节点（及绝境层等 stage 载体）统一补挂污染摘要；无侵染实例时保持缺省 */
export function attachNodeInvasion(
  lang: string,
  carrier: { stages: HsrChallengeStage[]; invasion?: HsrChallengeInvasion },
): void {
  const invasion = deriveNodeInvasion(lang, carrier.stages);
  if (invasion) carrier.invasion = invasion;
}

/** 期级 hasInvasion：任一层的标准节点、星启节点或绝境层携带污染摘要（供期数下拉标签） */
export function hasSeasonInvasion<
  F extends {
    nodes: { invasion?: HsrChallengeInvasion }[];
    tierce?: { node: { invasion?: HsrChallengeInvasion } };
    hard?: { invasion?: HsrChallengeInvasion };
  },
>(floors: F[]): boolean {
  return floors.some(
    floor =>
      floor.nodes.some(node => node.invasion != null) ||
      floor.tierce?.node.invasion != null ||
      floor.hard?.invasion != null,
  );
}
