import fs from "fs/promises";
import JSONBig from "json-bigint";

import _ from "lodash";
import TextMap from "../../text";
import { getUrl } from "../../url";
import { attachNodeInvasion, hasSeasonInvasion } from "./ChallengeInvasion";
import {
  buildChallengeStage,
  loadChallengeSharedTables,
  noteChallengeMiss,
  parseChallengeBuff,
  parseChallengeTarget,
  resolveChallengeScheduleTime,
} from "./ChallengeCommon";
import type { ChallengeGroupConfig } from "schema/ChallengeGroupConfig";
import type { ChallengeMazeConfig } from "schema/ChallengeMazeConfig";
import type { ChallengeMazeTierce } from "schema/ChallengeMazeTierce";
import type { ChallengeTargetConfig } from "schema/ChallengeTargetConfig";
import type { ScheduleDataChallengeMaze } from "schema/ScheduleDataChallengeMaze";
import type {
  HsrChallengeMazeFloor,
  HsrChallengeMazeSeason,
} from "@game/games/hsr/challenge/HsrChallengeMaze";
import type { HsrChallengeNode } from "@game/games/hsr/challenge";

/**
 * 混沌回忆（Memory of Chaos）提取器，模式标识 maze。
 * 期过滤（设计文档 §1.1）：只取 ChallengeGroupConfig.ScheduleDataID 非空的 Group
 * （固定内容组 100「回忆」/ 900「天艟求仙迷航录」排除），当前 54 期与
 * ScheduleDataChallengeMaze 行数一一对应。
 */
export class ChallengeMazeExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  groups: ChallengeGroupConfig[] = [];
  mazeConfigs: ChallengeMazeConfig[] = [];
  private tierceMap = new Map<number, ChallengeMazeTierce>();
  private targetMap = new Map<number, ChallengeTargetConfig>();
  private scheduleMap = new Map<number, ScheduleDataChallengeMaze>();

  async init() {
    await loadChallengeSharedTables();

    const [groups, mazeConfigs, tierces, targets, schedules] = await Promise.all([
      this.readJson<ChallengeGroupConfig>("ChallengeGroupConfig"),
      this.readJson<ChallengeMazeConfig>("ChallengeMazeConfig"),
      this.readJson<ChallengeMazeTierce>("ChallengeMazeTierce"),
      this.readJson<ChallengeTargetConfig>("ChallengeTargetConfig"),
      this.readJson<ScheduleDataChallengeMaze>("ScheduleDataChallengeMaze"),
    ]);

    this.groups = groups.filter(group => group.ScheduleDataID != null);
    this.mazeConfigs = mazeConfigs;
    this.tierceMap = new Map(tierces.map(row => [row.PHFMCACHFIJ, row]));
    this.targetMap = new Map(targets.map(row => [row.ID, row]));
    this.scheduleMap = new Map(schedules.map(row => [row.ID, row]));

    await TextMap.loadMap(this.lang);
  }

  private async readJson<T>(name: string): Promise<T[]> {
    const json = await fs.readFile(`./data/ExcelOutput/${name}.json`, "utf-8");
    return JSONBig.parse(json) as T[];
  }

  getSeasonList(): HsrChallengeMazeSeason[] {
    return _.sortBy(this.groups, "GroupID").map(group => {
      const seasonId = group.GroupID;
      const schedule = this.scheduleMap.get(group.ScheduleDataID!);
      const time = resolveChallengeScheduleTime(schedule, group.ScheduleDataID!, "ScheduleDataChallengeMaze");

      // 最新期行缺失 GroupName 键（如 1035），期名输出空串，前端按期号兜底
      if (group.GroupName) {
        TextMap.setTagInfo(this.lang, group.GroupName.Hash, {
          category: { challengemaze: seasonId + "", type: "ChallengeGroupConfig" },
          tags: ["challenge", "challengemaze"],
        });
      }

      const tierce =
        group.TierceID != null ? this.tierceMap.get(group.TierceID) : undefined;
      const floors = _.sortBy(
        this.mazeConfigs.filter(maze => maze.GroupID === seasonId),
        "Floor",
      ).map(maze => this.buildFloor(seasonId, maze, tierce));

      const season: HsrChallengeMazeSeason = {
        id: seasonId,
        code: seasonId + "",
        name: TextMap.getText(this.lang, group.GroupName?.Hash),
        icon: getUrl(group.TabPicPath, "dicloud") ?? "",
        poster: getUrl(group.ThemePicPath, "dicloud") || undefined,
        beginTime: time.beginTime,
        endTime: time.endTime,
        mazeBuff: parseChallengeBuff(this.lang, group.MazeBuffID!) ?? undefined,
        // 混沌回忆无期级可选 buff
        selectableBuffs: [],
        hasTierce: group.TierceID != null,
        hasInvasion: hasSeasonInvasion(floors),
        floors,
      };
      return season;
    });
  }

  private buildFloor(
    seasonId: number,
    maze: ChallengeMazeConfig,
    tierce?: ChallengeMazeTierce,
  ): HsrChallengeMazeFloor {
    TextMap.setTagInfo(this.lang, maze.Name.Hash, {
      category: {
        challengemaze: seasonId + "",
        challengefloor: maze.ID + "",
        type: "ChallengeMazeConfig",
      },
      tags: ["challenge", "challengemaze"],
    });

    const starTargets = maze.ChallengeTargetID.flatMap(id =>
      this.parseTarget(id, seasonId),
    );

    // 层级 MazeBuffID 与期级天气（记忆紊流）一致，由期级 mazeBuff 承载，节点不重复挂敌方特性
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

    // 星启第三节点独立挂 tierce（游戏内可开关）：开启时前端追加显示，关闭时层保持标准 2 节点状态
    let tierceData: HsrChallengeMazeFloor["tierce"];
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
        starTargets: [...tierce.OGEOMCGNNMP, tierce.GNGENMHNLAH].flatMap(id =>
          this.parseTarget(id, seasonId),
        ),
      };
      attachNodeInvasion(this.lang, tierceData.node);
    }

    return {
      id: maze.ID,
      index: maze.Floor ?? 0,
      name: TextMap.getText(this.lang, maze.Name.Hash),
      nodes,
      starTargets,
      tierce: tierceData,
    };
  }

  private buildStages(stageIds: number[]) {
    return stageIds.flatMap(id => flat(buildChallengeStage(this.lang, id)));
  }

  private parseTarget(targetId: number, seasonId: number) {
    const row = this.targetMap.get(targetId);
    if (!row) {
      noteChallengeMiss(`ChallengeTargetConfig:${targetId}`);
      return [];
    }
    return [parseChallengeTarget(this.lang, row, "maze", seasonId, "ChallengeTargetConfig")];
  }
}

function flat<T>(value: T | null): T[] {
  return value == null ? [] : [value];
}
