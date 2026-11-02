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
  parseChallengeTraits,
  toTemplateId,
} from "./ChallengeCommon";
import type { ChallengeBossGroupConfig } from "schema/ChallengeBossGroupConfig";
import type { ChallengeBossGroupExtra } from "schema/ChallengeBossGroupExtra";
import type { ChallengeBossMazeConfig } from "schema/ChallengeBossMazeConfig";
import type { ChallengeBossMazeExtra } from "schema/ChallengeBossMazeExtra";
import type { ChallengeBossMazeTierce } from "schema/ChallengeBossMazeTierce";
import type { ChallengeBossTargetConfig } from "schema/ChallengeBossTargetConfig";
import type { ScheduleDataChallengeBoss } from "schema/ScheduleDataChallengeBoss";
import type {
  HsrChallengeBossFloor,
  HsrChallengeBossSeason,
} from "@game/games/hsr/challenge/HsrChallengeBoss";
import type {
  HsrChallengeBuff,
  HsrChallengeNode,
  HsrChallengeTarget,
} from "@game/games/hsr/challenge";

/** 末日幻影（Apocalyptic Shadow）提取器，模式标识 boss */
export class ChallengeBossExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  groups: ChallengeBossGroupConfig[] = [];
  mazeConfigs: ChallengeBossMazeConfig[] = [];
  private groupExtraMap = new Map<number, ChallengeBossGroupExtra>();
  private mazeExtraMap = new Map<number, ChallengeBossMazeExtra>();
  private tierceMap = new Map<number, ChallengeBossMazeTierce>();
  private tierceByFloorMap = new Map<number, ChallengeBossMazeTierce>();
  private targetMap = new Map<number, ChallengeBossTargetConfig>();
  private scheduleMap = new Map<number, ScheduleDataChallengeBoss>();

  async init() {
    await loadChallengeSharedTables();

    const [groups, groupExtras, mazeConfigs, mazeExtras, tierces, targets, schedules] =
      await Promise.all([
        this.readJson<ChallengeBossGroupConfig>("ChallengeBossGroupConfig"),
        this.readJson<ChallengeBossGroupExtra>("ChallengeBossGroupExtra"),
        this.readJson<ChallengeBossMazeConfig>("ChallengeBossMazeConfig"),
        this.readJson<ChallengeBossMazeExtra>("ChallengeBossMazeExtra"),
        this.readJson<ChallengeBossMazeTierce>("ChallengeBossMazeTierce"),
        this.readJson<ChallengeBossTargetConfig>("ChallengeBossTargetConfig"),
        this.readJson<ScheduleDataChallengeBoss>("ScheduleDataChallengeBoss"),
      ]);

    this.groups = groups;
    this.mazeConfigs = mazeConfigs;
    this.groupExtraMap = new Map(groupExtras.map(row => [row.GroupID, row]));
    this.mazeExtraMap = new Map(mazeExtras.map(row => [row.ID, row]));
    this.tierceMap = new Map(tierces.map(row => [row.PHFMCACHFIJ, row]));
    this.tierceByFloorMap = new Map(tierces.map(row => [row.DLCKKJFMJOB, row]));
    this.targetMap = new Map(targets.map(row => [row.ID, row]));
    this.scheduleMap = new Map(schedules.map(row => [row.ID, row]));

    await TextMap.loadMap(this.lang);
  }

  private async readJson<T>(name: string): Promise<T[]> {
    const json = await fs.readFile(`./data/ExcelOutput/${name}.json`, "utf-8");
    return JSONBig.parse(json) as T[];
  }

  getSeasonList(): HsrChallengeBossSeason[] {
    return _.sortBy(this.groups, "GroupID").map(group => {
      const seasonId = group.GroupID;
      const extra = this.groupExtraMap.get(seasonId);
      const schedule = this.scheduleMap.get(group.ScheduleDataID);
      if (!schedule) {
        noteChallengeMiss(`ScheduleDataChallengeBoss:${group.ScheduleDataID}`);
      }

      TextMap.setTagInfo(this.lang, group.GroupName?.Hash, {
        category: { challengeboss: seasonId + "", type: "ChallengeBossGroupConfig" },
        tags: ["challenge", "challengeboss"],
      });

      const tierce =
        group.TierceID != null ? this.tierceMap.get(group.TierceID) : undefined;
      const floors = _.sortBy(
        this.mazeConfigs.filter(maze => maze.GroupID === seasonId),
        "Floor",
      ).map(maze => this.buildFloor(group, maze, tierce));

      const season: HsrChallengeBossSeason = {
        id: seasonId,
        code: seasonId + "",
        name: TextMap.getText(this.lang, group.GroupName?.Hash),
        icon: getUrl(group.TabPicPath, "dicloud") ?? "",
        poster: getUrl(group.ThemePicPath, "dicloud") || undefined,
        beginTime: schedule?.BeginTime,
        endTime: schedule?.EndTime,
        // 末日幻影无期天气：Group.MazeBuffID 恒为 3031001（虚构叙事基础能力「词语爆裂」的
        // 借用默认值），游戏内不作为天气展示，故不输出
        selectableBuffs: (
          [extra?.BuffList1 ?? [], extra?.BuffList2 ?? [], extra?.BuffList3 ?? []] as number[][]
        ).map(list => list.flatMap(id => flat(parseChallengeBuff(this.lang, id)))),
        hasTierce: group.TierceID != null,
        hasInvasion: hasSeasonInvasion(floors),
        floors,
      };
      return season;
    });
  }

  private buildFloor(
    group: ChallengeBossGroupConfig,
    maze: ChallengeBossMazeConfig,
    tierce?: ChallengeBossMazeTierce,
  ): HsrChallengeBossFloor {
    const seasonId = group.GroupID;
    const mazeExtra = this.mazeExtraMap.get(maze.ID);

    TextMap.setTagInfo(this.lang, maze.Name?.Hash, {
      category: {
        challengeboss: seasonId + "",
        challengefloor: maze.ID + "",
        type: "ChallengeBossMazeConfig",
      },
      tags: ["challenge", "challengeboss"],
    });

    // 层级敌方特性（水温）作用于该层全部节点
    const floorBuff = parseChallengeBuff(this.lang, maze.MazeBuffID);
    const enemyBuffs: HsrChallengeBuff[] = floorBuff ? [floorBuff] : [];

    const scoreTargets = maze.ChallengeTargetID.flatMap(id => {
      const row = this.targetMap.get(id);
      if (!row) {
        noteChallengeMiss(`ChallengeBossTargetConfig:${id}`);
        return [];
      }
      return [parseChallengeTarget(this.lang, row, "boss", seasonId, "ChallengeBossTargetConfig")];
    });

    const nodes: HsrChallengeNode[] = [
      {
        index: 1,
        damageTypes: maze.DamageType1,
        enemyBuffs,
        bossMonsterIds: this.bossMonsterIds(mazeExtra?.MonsterID1),
        bossTraits: this.bossTraits(mazeExtra?.MonsterID1),
        stages: this.buildStages(maze.EventIDList1),
      },
      {
        index: 2,
        damageTypes: maze.DamageType2,
        enemyBuffs,
        bossMonsterIds: this.bossMonsterIds(mazeExtra?.MonsterID2),
        bossTraits: this.bossTraits(mazeExtra?.MonsterID2),
        stages: this.buildStages(maze.EventIDList2),
      },
    ];
    for (const node of nodes) {
      attachNodeInvasion(this.lang, node);
    }

    // 星启第三节点独立挂 tierce（游戏内可开关）：开启时前端追加显示，关闭时层保持标准 2 节点状态
    let tierceData: HsrChallengeBossFloor["tierce"];
    if (tierce && tierce.DLCKKJFMJOB === maze.ID) {
      tierceData = {
        node: {
          index: 3,
          damageTypes: tierce.LOJCIDLKPKG,
          enemyBuffs,
          bossMonsterIds: this.bossMonsterIds(mazeExtra?.MonsterID3, tierce.JEBMBCLBIOI),
          bossTraits: this.bossTraits(mazeExtra?.MonsterID3),
          stages: this.buildStages(tierce.HFIAAGAKFMD),
        },
        scoreTargets: this.tierceScoreTargets(tierce, seasonId),
      };
      attachNodeInvasion(this.lang, tierceData.node);
    }

    return {
      id: maze.ID,
      index: maze.Floor,
      name: TextMap.getText(this.lang, maze.Name?.Hash),
      nodes,
      scoreTargets,
      tierce: tierceData,
    };
  }

  private buildStages(stageIds: number[]) {
    return stageIds.flatMap(id => flat(buildChallengeStage(this.lang, id)));
  }

  /**
   * 星启得分目标：OGEOMCGNNMP 为目标 ID 列表，GNGENMHNLAH 为最高档目标 ID
   * （如 3020 期 → 5001/5002/5003 + 5000，按分值升序 6000/7800/9900/10200）。
   */
  private tierceScoreTargets(tierce: ChallengeBossMazeTierce, seasonId: number) {
    return _.sortBy(
      [...tierce.OGEOMCGNNMP, tierce.GNGENMHNLAH].flatMap(id => {
        const row = this.targetMap.get(id);
        if (!row) {
          noteChallengeMiss(`ChallengeBossTargetConfig:${id}`);
          return [];
        }
        return [parseChallengeTarget(this.lang, row, "boss", seasonId, "ChallengeBossTargetConfig")];
      }),
      "param",
    );
  }

  /** 展示 Boss：战斗 MonsterID 换算模板 ID；缺省时回退 Tierce 模板列表 */
  private bossMonsterIds(
    monsterId: number | undefined,
    templateFallback?: number[],
  ): number[] {
    if (monsterId == null) {
      return templateFallback ? [...templateFallback] : [];
    }
    const templateId = toTemplateId(monsterId);
    if (templateId != null) {
      return [templateId];
    }
    return templateFallback ? [...templateFallback] : [];
  }

  /** 展示 Boss 图鉴特性；Tierce 模板列表为模板口径、无图鉴行，不做回退 */
  private bossTraits(monsterId: number | undefined) {
    return monsterId == null ? [] : parseChallengeTraits(this.lang, monsterId);
  }
}

function flat<T>(value: T | null): T[] {
  return value == null ? [] : [value];
}
