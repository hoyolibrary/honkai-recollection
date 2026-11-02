import fs from "fs/promises";
import JSONBig from "json-bigint";

import _ from "lodash";
import TextMap from "../../text";
import { getUrl } from "../../url";
import { attachNodeInvasion, hasSeasonInvasion } from "./ChallengeInvasion";
import {
  buildChallengeStage,
  getStoryChallengeWaves,
  loadChallengeSharedTables,
  noteChallengeMiss,
  parseChallengeBuff,
  parseChallengeTarget,
  resolveChallengeScheduleTime,
} from "./ChallengeCommon";
import type { ChallengeStoryGroupConfig } from "schema/ChallengeStoryGroupConfig";
import type { ChallengeStoryGroupExtra } from "schema/ChallengeStoryGroupExtra";
import type { ChallengeStoryMazeConfig } from "schema/ChallengeStoryMazeConfig";
import type { ChallengeStoryMazeExtra } from "schema/ChallengeStoryMazeExtra";
import type { ChallengeStoryMazeTierce } from "schema/ChallengeStoryMazeTierce";
import type { ChallengeStoryTargetConfig } from "schema/ChallengeStoryTargetConfig";
import type { ChallengeStoryTheme } from "schema/ChallengeStoryTheme";
import type { ScheduleDataChallengeStory } from "schema/ScheduleDataChallengeStory";
import type {
  HsrChallengeStoryFloor,
  HsrChallengeStorySeason,
} from "@game/games/hsr/challenge/HsrChallengeStory";
import type { HsrChallengeNode } from "@game/games/hsr/challenge";

/** 虚构叙事（Pure Fiction）提取器，模式标识 story */
export class ChallengeStoryExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  groups: ChallengeStoryGroupConfig[] = [];
  mazeConfigs: ChallengeStoryMazeConfig[] = [];
  private groupExtraMap = new Map<number, ChallengeStoryGroupExtra>();
  private mazeExtraMap = new Map<number, ChallengeStoryMazeExtra>();
  private tierceMap = new Map<number, ChallengeStoryMazeTierce>();
  private targetMap = new Map<number, ChallengeStoryTargetConfig>();
  private themeMap = new Map<number, ChallengeStoryTheme>();
  private scheduleMap = new Map<number, ScheduleDataChallengeStory>();

  async init() {
    await loadChallengeSharedTables();

    const [groups, groupExtras, mazeConfigs, mazeExtras, tierces, targets, themes, schedules] =
      await Promise.all([
        this.readJson<ChallengeStoryGroupConfig>("ChallengeStoryGroupConfig"),
        this.readJson<ChallengeStoryGroupExtra>("ChallengeStoryGroupExtra"),
        this.readJson<ChallengeStoryMazeConfig>("ChallengeStoryMazeConfig"),
        this.readJson<ChallengeStoryMazeExtra>("ChallengeStoryMazeExtra"),
        this.readJson<ChallengeStoryMazeTierce>("ChallengeStoryMazeTierce"),
        this.readJson<ChallengeStoryTargetConfig>("ChallengeStoryTargetConfig"),
        this.readJson<ChallengeStoryTheme>("ChallengeStoryTheme"),
        this.readJson<ScheduleDataChallengeStory>("ScheduleDataChallengeStory"),
      ]);

    this.groups = groups;
    this.mazeConfigs = mazeConfigs;
    this.groupExtraMap = new Map(groupExtras.map(row => [row.GroupID, row]));
    this.mazeExtraMap = new Map(mazeExtras.map(row => [row.ID, row]));
    this.tierceMap = new Map(tierces.map(row => [row.PHFMCACHFIJ, row]));
    this.targetMap = new Map(targets.map(row => [row.ID, row]));
    this.themeMap = new Map(themes.map(row => [row.ThemeID, row]));
    this.scheduleMap = new Map(schedules.map(row => [row.ID, row]));

    await TextMap.loadMap(this.lang);
  }

  private async readJson<T>(name: string): Promise<T[]> {
    const json = await fs.readFile(`./data/ExcelOutput/${name}.json`, "utf-8");
    return JSONBig.parse(json) as T[];
  }

  getSeasonList(): HsrChallengeStorySeason[] {
    return _.sortBy(this.groups, "GroupID").map(group => {
      const seasonId = group.GroupID;
      const extra = this.groupExtraMap.get(seasonId);
      const theme = extra ? this.themeMap.get(extra.ThemeID) : undefined;
      if (extra && !theme) {
        noteChallengeMiss(`ChallengeStoryTheme:${extra.ThemeID}`);
      }
      const schedule = this.scheduleMap.get(group.ScheduleDataID);
      const time = resolveChallengeScheduleTime(schedule, group.ScheduleDataID, "ScheduleDataChallengeStory");

      TextMap.setTagInfo(this.lang, group.GroupName.Hash, {
        category: { challengestory: seasonId + "", type: "ChallengeStoryGroupConfig" },
        tags: ["challenge", "challengestory"],
      });

      const tierce =
        group.TierceID != null ? this.tierceMap.get(group.TierceID) : undefined;
      const floors = _.sortBy(
        this.mazeConfigs.filter(maze => maze.GroupID === seasonId),
        "Floor",
      ).map(maze => this.buildFloor(seasonId, maze, tierce));

      // Normal 期（2001–2010）Group.MazeBuffID 为真实天气；Fever 期指向无文本占位 buff
      // （天气已由主题/可选 buff 系统取代，游戏内不展示），名称与描述皆空时不输出
      const weather = parseChallengeBuff(this.lang, group.MazeBuffID);

      const season: HsrChallengeStorySeason = {
        id: seasonId,
        code: seasonId + "",
        name: TextMap.getText(this.lang, group.GroupName.Hash),
        icon: getUrl(group.TabPicPath, "dicloud") ?? "",
        poster: getUrl(group.ThemePicPath, "dicloud") || undefined,
        beginTime: time.beginTime,
        endTime: time.endTime,
        mazeBuff: weather && (weather.name || weather.desc) ? weather : undefined,
        // 期级可选 buff（三选一），单组
        selectableBuffs: [
          (extra?.BuffList ?? []).flatMap(id => flat(parseChallengeBuff(this.lang, id))),
        ],
        hasTierce: group.TierceID != null,
        hasInvasion: hasSeasonInvasion(floors),
        themeId: extra?.ThemeID,
        themeColors: theme
          ? {
              main: theme.ThemeMainColor,
              sub1: theme.ThemeSubColor1,
              sub2: theme.ThemeSubColor2,
              eff: theme.ThemeEffColor,
            }
          : undefined,
        floors,
      };
      return season;
    });
  }

  private buildFloor(
    seasonId: number,
    maze: ChallengeStoryMazeConfig,
    tierce?: ChallengeStoryMazeTierce,
  ): HsrChallengeStoryFloor {
    const mazeExtra = this.mazeExtraMap.get(maze.ID);

    TextMap.setTagInfo(this.lang, maze.Name.Hash, {
      category: {
        challengestory: seasonId + "",
        challengefloor: maze.ID + "",
        type: "ChallengeStoryMazeConfig",
      },
      tags: ["challenge", "challengestory"],
    });

    // 层级 MazeBuffID 与期级同源（Normal 期为天气、Fever 期为无文本占位），节点不挂敌方特性
    const nodes: HsrChallengeNode[] = [
      {
        index: 1,
        damageTypes: maze.DamageType1,
        enemyBuffs: [],
        bossMonsterIds: [...maze.NpcMonsterIDList1],
        bossTraits: [],
        stages: this.buildStages(maze.EventIDList1),
      },
      {
        index: 2,
        damageTypes: maze.DamageType2,
        enemyBuffs: [],
        bossMonsterIds: [...maze.NpcMonsterIDList2],
        bossTraits: [],
        stages: this.buildStages(maze.EventIDList2),
      },
    ];
    for (const node of nodes) {
      attachNodeInvasion(this.lang, node);
    }

    // 星启第三节点独立挂 tierce（游戏内可开关）：开启时前端追加显示并切换通关分/目标口径
    let tierceData: HsrChallengeStoryFloor["tierce"];
    if (tierce && tierce.DLCKKJFMJOB === maze.ID) {
      tierceData = {
        node: {
          index: 3,
          damageTypes: tierce.LOJCIDLKPKG,
          enemyBuffs: [],
          bossMonsterIds: [...tierce.JEBMBCLBIOI],
          bossTraits: [],
          stages: this.buildStages(tierce.HFIAAGAKFMD),
        },
        clearScore: tierce.IDBJENCBJHM,
        battleTargets: tierce.LDKPJPCMMAE.flatMap(id =>
          this.parseTarget(id, seasonId),
        ),
        scoreTargets: [...tierce.OGEOMCGNNMP, tierce.GNGENMHNLAH].flatMap(id =>
          this.parseTarget(id, seasonId),
        ),
      };
      attachNodeInvasion(this.lang, tierceData.node);
    }

    return {
      id: maze.ID,
      index: maze.Floor,
      name: TextMap.getText(this.lang, maze.Name.Hash),
      nodes,
      turnLimit: mazeExtra?.TurnLimit,
      clearScore: mazeExtra?.ClearScore,
      battleTargets: (mazeExtra?.BattleTargetID ?? []).flatMap(id =>
        this.parseTarget(id, seasonId),
      ),
      scoreTargets: maze.ChallengeTargetID.flatMap(id => this.parseTarget(id, seasonId)),
      tierce: tierceData,
    };
  }

  private buildStages(stageIds: number[]) {
    return stageIds.flatMap(id => flat(buildChallengeStage(this.lang, id, getStoryChallengeWaves(id), "story")));
  }

  private parseTarget(targetId: number, seasonId: number) {
    const row = this.targetMap.get(targetId);
    if (!row) {
      noteChallengeMiss(`ChallengeStoryTargetConfig:${targetId}`);
      return [];
    }
    return [
      parseChallengeTarget(this.lang, row, "story", seasonId, "ChallengeStoryTargetConfig"),
    ];
  }
}

function flat<T>(value: T | null): T[] {
  return value == null ? [] : [value];
}
