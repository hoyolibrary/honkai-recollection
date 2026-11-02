import fs from "fs/promises";
import JSONBig from "json-bigint";

import _ from "lodash";
import TextMap from "../../text";
import { getUrl } from "../../url";
import { attachNodeInvasion, hasSeasonInvasion } from "./ChallengeInvasion";
import {
  buildChallengeStage,
  getStagePreviewMonsterIds,
  loadChallengeSharedTables,
  noteChallengeMiss,
  parseChallengeBuff,
  parseChallengeTarget,
  type ChallengeTargetRow,
} from "./ChallengeCommon";
import type { BattleTargetConfig } from "schema/BattleTargetConfig";
import type { ChallengeBadgeConfig } from "schema/ChallengeBadgeConfig";
import type { ChallengePeakBossConfig } from "schema/ChallengePeakBossConfig";
import type { ChallengePeakConfig } from "schema/ChallengePeakConfig";
import type { ChallengePeakGroupConfig } from "schema/ChallengePeakGroupConfig";
import type {
  HsrChallengeBadge,
  HsrChallengePeakFloor,
  HsrChallengePeakSeason,
} from "@game/games/hsr/challenge/HsrChallengePeak";
import type { HsrChallengeNode } from "@game/games/hsr/challenge";

/** 奖牌档位排序（Bronze → Silver → Gold → Ultra，与 RankIconPathList 顺序一致） */
const badgeLevelOrder: Record<string, number> = {
  Bronze: 0,
  Silver: 1,
  Gold: 2,
  Ultra: 3,
};

/**
 * 异相仲裁（Anomaly Arbitration）提取器，模式标识 peak。
 * 结构与其他三模式不同：每期 4 层 = 3 前置层 + 1 Boss 层（Group.PreLevelIDList + BossLevelID），
 * 每层单节点；无排期表（beginTime/endTime 缺省，期序按 ID）。
 * 目标不在 ChallengeTarget 系表而在 BattleTargetConfig（Type=ChallengeTarget，
 * 回合上限/死亡数），按 AbilityName/TargetParam 映射为公共目标形态。
 */
export class ChallengePeakExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  groups: ChallengePeakGroupConfig[] = [];
  private configMap = new Map<number, ChallengePeakConfig>();
  private bossMap = new Map<number, ChallengePeakBossConfig>();
  private badgeMap = new Map<number, ChallengeBadgeConfig[]>();
  private targetMap = new Map<number, BattleTargetConfig>();

  async init() {
    await loadChallengeSharedTables();

    const [groups, configs, bosses, badges, targets] = await Promise.all([
      this.readJson<ChallengePeakGroupConfig>("ChallengePeakGroupConfig"),
      this.readJson<ChallengePeakConfig>("ChallengePeakConfig"),
      this.readJson<ChallengePeakBossConfig>("ChallengePeakBossConfig"),
      this.readJson<ChallengeBadgeConfig>("ChallengeBadgeConfig"),
      this.readJson<BattleTargetConfig>("BattleTargetConfig"),
    ]);

    this.groups = groups;
    this.configMap = new Map(configs.map(row => [row.ID, row]));
    this.bossMap = new Map(bosses.map(row => [row.ID, row]));
    // 同期多枚奖牌按档位归组排序（Bronze → Silver → Gold → Ultra）
    this.badgeMap = new Map();
    for (const badge of badges.filter(
      row => row.Type === "Peak" && row.ChallengePeakGroupID != null,
    )) {
      const list = this.badgeMap.get(badge.ChallengePeakGroupID!) ?? [];
      list.push(badge);
      this.badgeMap.set(badge.ChallengePeakGroupID!, list);
    }
    for (const list of this.badgeMap.values()) {
      list.sort(
        (a, b) =>
          (badgeLevelOrder[a.ChallengePeakLevel!] ?? 99) -
          (badgeLevelOrder[b.ChallengePeakLevel!] ?? 99),
      );
    }
    this.targetMap = new Map(targets.map(row => [row.ID, row]));

    await TextMap.loadMap(this.lang);
  }

  private async readJson<T>(name: string): Promise<T[]> {
    const json = await fs.readFile(`./data/ExcelOutput/${name}.json`, "utf-8");
    return JSONBig.parse(json) as T[];
  }

  getSeasonList(): HsrChallengePeakSeason[] {
    return _.sortBy(this.groups, "ID").map(group => {
      const seasonId = group.ID;
      const bossRow = this.bossMap.get(group.BossLevelID);

      TextMap.setTagInfo(this.lang, group.Title.Hash, {
        category: { challengepeak: seasonId + "", type: "ChallengePeakGroupConfig" },
        tags: ["challenge", "challengepeak"],
      });

      const floors = [...group.PreLevelIDList, group.BossLevelID].map((levelId, i) =>
        this.buildFloor(seasonId, levelId, i + 1),
      );

      const season: HsrChallengePeakSeason = {
        id: seasonId,
        code: seasonId + "",
        name: TextMap.getText(this.lang, group.Title.Hash),
        icon: getUrl(group.ThemeIconPicPath, "dicloud") ?? "",
        poster: getUrl(group.ThemePosterTabPicPath, "dicloud") || undefined,
        // Boss 层可选增益插件（三选一），单组（9 期均有 Boss 行）
        selectableBuffs: [
          (bossRow?.BuffList ?? []).flatMap(id => flat(parseChallengeBuff(this.lang, id))),
        ],
        badges: (this.badgeMap.get(seasonId) ?? []).map(badge =>
          this.buildBadge(seasonId, badge),
        ),
        hasInvasion: hasSeasonInvasion(floors),
        floors,
      };
      return season;
    });
  }

  private buildBadge(seasonId: number, badge: ChallengeBadgeConfig): HsrChallengeBadge {
    TextMap.setTagInfo(this.lang, badge.Name.Hash, {
      category: {
        challengepeak: seasonId + "",
        challengebadge: badge.BadgeID + "",
        type: "ChallengeBadgeConfig",
      },
      tags: ["challenge", "challengepeak"],
    });

    return {
      level: badge.ChallengePeakLevel ?? "",
      name: TextMap.getText(this.lang, badge.Name.Hash),
      icon: getUrl(badge.IconMiddlePath, "dicloud") || undefined,
    };
  }

  private buildFloor(
    seasonId: number,
    levelId: number,
    floorIndex: number,
  ): HsrChallengePeakFloor {
    const config = this.configMap.get(levelId);
    if (!config) {
      noteChallengeMiss(`ChallengePeakConfig:${levelId}`);
      throw new Error(`ChallengePeakConfig 未收录层 ${levelId}`);
    }
    const boss = this.bossMap.get(levelId);

    TextMap.setTagInfo(this.lang, config.Title.Hash, {
      category: {
        challengepeak: seasonId + "",
        challengefloor: config.ID + "",
        type: "ChallengePeakConfig",
      },
      tags: ["challenge", "challengepeak"],
    });

    // 每层单节点：弱点/敌方特性/关卡都挂在层配置上，不拆上下半
    const node: HsrChallengeNode = {
      index: 1,
      damageTypes: config.DamageType,
      enemyBuffs: config.TagList.flatMap(id => flat(parseChallengeBuff(this.lang, id))),
      // Peak 无独立 Extra 展示位表；StageName 与预览首领 MonsterName 共用文本 Hash。
      bossMonsterIds: getStagePreviewMonsterIds(config.EventIDList),
      bossTraits: [],
      stages: this.buildStages(config.EventIDList),
    };
    attachNodeInvasion(this.lang, node);

    // Boss 层的绝境难度（HardEventIDList 为独立 Stage，敌人同款但等级更高）
    let hard: HsrChallengePeakFloor["hard"];
    if (boss) {
      TextMap.setTagInfo(this.lang, boss.HardTitle.Hash, {
        category: {
          challengepeak: seasonId + "",
          challengefloor: boss.ID + "",
          type: "ChallengePeakBossConfig",
        },
        tags: ["challenge", "challengepeak"],
      });
      const hardTargets = this.parseTargets([boss.HardTarget], seasonId);
      hard = {
        title: TextMap.getText(this.lang, boss.HardTitle.Hash),
        enemyBuffs: boss.HardTagList.flatMap(id => flat(parseChallengeBuff(this.lang, id))),
        stages: this.buildStages(boss.HardEventIDList),
        colorMedalTarget: boss.ColorMedalTarget,
        hardTarget: hardTargets[0],
      };
      attachNodeInvasion(this.lang, hard);
    }

    return {
      id: config.ID,
      index: floorIndex,
      name: TextMap.getText(this.lang, config.Title.Hash),
      nodes: [node],
      progressValues: config.ProgressValueList,
      hpProgressValues: config.HPProgressValueList,
      targets: this.parseTargets(config.NormalTargetList, seasonId),
      isBoss: boss != null,
      hard,
    };
  }

  private buildStages(stageIds: number[]) {
    return stageIds.flatMap(id => flat(buildChallengeStage(this.lang, id)));
  }

  /** BattleTargetConfig → 公共目标形态（type ← AbilityName、param ← TargetParam） */
  private parseTargets(targetIds: number[], seasonId: number) {
    return targetIds.flatMap(id => {
      const row = this.targetMap.get(id);
      if (!row) {
        noteChallengeMiss(`BattleTargetConfig:${id}`);
        return [];
      }
      const targetRow: ChallengeTargetRow = {
        ID: row.ID,
        ChallengeTargetType: row.AbilityName,
        ChallengeTargetName: row.TargetName,
        ChallengeTargetParam1: row.TargetParam,
      };
      return [parseChallengeTarget(this.lang, targetRow, "peak", seasonId, "BattleTargetConfig")];
    });
  }
}

function flat<T>(value: T | null): T[] {
  return value == null ? [] : [value];
}
