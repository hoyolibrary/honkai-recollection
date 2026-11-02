import fs from "fs/promises";
import JSONBig from "json-bigint";
import { applyStageInvasion } from "./ChallengeInvasion";
import { calculateStoryHp } from "./StoryHp";

import TextMap from "../../text";
import { getUrl } from "../../url";
import type { EliteGroup } from "schema/EliteGroup";
import type { HardLevelGroup } from "schema/HardLevelGroup";
import type { MazeBuff } from "schema/MazeBuff";
import type { MonsterConfig } from "schema/MonsterConfig";
import type { MonsterGuideConfig } from "schema/MonsterGuideConfig";
import type { MonsterGuideTag } from "schema/MonsterGuideTag";
import type { MonsterTemplateConfig } from "schema/MonsterTemplateConfig";
import type { ScheduleDataGlobal } from "schema/ScheduleDataGlobal";
import type { StageConfig } from "schema/StageConfig";
import type { StageInfiniteGroup } from "schema/StageInfiniteGroup";
import type { StageInfiniteWaveConfig } from "schema/StageInfiniteWaveConfig";
import type { StageInfiniteMonsterGroup } from "schema/StageInfiniteMonsterGroup";
import type { StageInvasionBuff } from "schema/StageInvasionBuff";
import type { StageInvasionConfig } from "schema/StageInvasionConfig";
import type {
  HsrChallengeBuff,
  HsrChallengeEnemy,
  HsrChallengeStage,
  HsrChallengeTarget,
  HsrChallengeTrait,
} from "@game/games/hsr/challenge";

/**
 * 逐光捡金（深渊挑战）公共解析。
 *
 * 语义唯一来源 doc/abyss-challenge-extractor-plan.md（§3 公共模型、§5 HP 公式、§6 工程约定）。
 * StageConfig / MonsterConfig / MonsterTemplateConfig / HardLevelGroup / EliteGroup / MazeBuff /
 * MonsterGuideConfig / MonsterGuideTag 为语言无关表，模块级缓存一次加载、跨语言与四模式复用。
 */

interface CurveGroup {
  /** 组内等级行升序 */
  levels: number[];
  rows: Map<number, HardLevelGroup>;
}

/** StatusConfig.json 中侵染图标所需的字段子集（全量条目见 extract/status.ts） */
interface StatusConfigIconRow {
  StatusID: number;
  ModifierName: string;
  StatusIconPath: string;
}

interface ChallengeSharedTables {
  stageMap: Map<number, StageConfig>;
  infiniteGroupMap: Map<number, StageInfiniteGroup>;
  infiniteWaveMap: Map<number, StageInfiniteWaveConfig>;
  infiniteMonsterGroupMap: Map<number, StageInfiniteMonsterGroup>;
  monsterMap: Map<number, MonsterConfig>;
  /** MonsterName.Hash → 去重后的模板 ID；用于没有独立 Extra 表的玩法反查预览首领。 */
  monsterTemplateIdsByNameHash: Map<string, number[]>;
  templateMap: Map<number, MonsterTemplateConfig>;
  curveMap: Map<number, CurveGroup>;
  eliteMap: Map<number, EliteGroup>;
  mazeBuffMap: Map<number, MazeBuff>;
  guideConfigMap: Map<number, MonsterGuideConfig>;
  guideTagMap: Map<number, MonsterGuideTag>;
  scheduleGlobalMap: Map<number, ScheduleDataGlobal>;
  /** 贪饕污染：StageID → StageInvasionConfig 行 */
  stageInvasionMap: Map<number, StageInvasionConfig>;
  /** 贪饕污染：InvasionID → StageInvasionBuff 行 */
  invasionBuffMap: Map<number, StageInvasionBuff>;
  /** 「饕噬」状态图标（StatusConfig ModifierName = MCommon_Gluttony_DirtyHp），未命中省略 */
  gluttonyStatusIcon: string | undefined;
}

let tables: ChallengeSharedTables | undefined;
let tablesPromise: Promise<ChallengeSharedTables> | null = null;

async function readJson<T>(name: string): Promise<T[]> {
  const json = await fs.readFile(`./data/ExcelOutput/${name}.json`, "utf-8");
  return JSONBig.parse(json) as T[];
}

/** 共享表加载（幂等）；提取流程必须在各 Extractor.init 中先 await 本方法 */
export function loadChallengeSharedTables(): Promise<ChallengeSharedTables> {
  tablesPromise ||= (async () => {
    const [stages, monsters, templates, curves, elites, mazeBuffs, guideConfigs, guideTags, scheduleGlobals,
      infiniteGroups, infiniteWaves, infiniteMonsterGroups, stageInvasions, invasionBuffs, statusConfigs] =
      await Promise.all([
        readJson<StageConfig>("StageConfig"),
        readJson<MonsterConfig>("MonsterConfig"),
        readJson<MonsterTemplateConfig>("MonsterTemplateConfig"),
        readJson<HardLevelGroup>("HardLevelGroup"),
        readJson<EliteGroup>("EliteGroup"),
        readJson<MazeBuff>("MazeBuff"),
        readJson<MonsterGuideConfig>("MonsterGuideConfig"),
        readJson<MonsterGuideTag>("MonsterGuideTag"),
        readJson<ScheduleDataGlobal>("ScheduleDataGlobal"),
        readJson<StageInfiniteGroup>("StageInfiniteGroup"),
        readJson<StageInfiniteWaveConfig>("StageInfiniteWaveConfig"),
        readJson<StageInfiniteMonsterGroup>("StageInfiniteMonsterGroup"),
        readJson<StageInvasionConfig>("StageInvasionConfig"),
        readJson<StageInvasionBuff>("StageInvasionBuff"),
        readJson<StatusConfigIconRow>("StatusConfig"),
      ]);

    const curveMap = new Map<number, CurveGroup>();
    for (const row of curves) {
      let group = curveMap.get(row.HardLevelGroup);
      if (!group) {
        group = { levels: [], rows: new Map() };
        curveMap.set(row.HardLevelGroup, group);
      }
      group.levels.push(row.Level);
      group.rows.set(row.Level, row);
    }
    for (const group of curveMap.values()) {
      group.levels.sort((a, b) => a - b);
    }

    const templateIdSetsByNameHash = new Map<string, Set<number>>();
    for (const monster of monsters) {
      const hash = String(monster.MonsterName.Hash);
      const templateIds = templateIdSetsByNameHash.get(hash) ?? new Set<number>();
      templateIds.add(monster.MonsterTemplateID);
      templateIdSetsByNameHash.set(hash, templateIds);
    }

    const gluttonyStatus = statusConfigs.find(row => row.ModifierName === "MCommon_Gluttony_DirtyHp");

    tables = {
      stageMap: new Map(stages.map(row => [row.StageID, row])),
      infiniteGroupMap: new Map(infiniteGroups.map(row => [row.WaveGroupID, row])),
      infiniteWaveMap: new Map(infiniteWaves.map(row => [row.InfiniteWaveID, row])),
      infiniteMonsterGroupMap: new Map(infiniteMonsterGroups.map(row => [row.InfiniteMonsterGroupID, row])),
      monsterMap: new Map(monsters.map(row => [row.MonsterID, row])),
      monsterTemplateIdsByNameHash: new Map(
        [...templateIdSetsByNameHash].map(([hash, ids]) => [hash, [...ids]]),
      ),
      templateMap: new Map(templates.map(row => [row.MonsterTemplateID, row])),
      curveMap,
      eliteMap: new Map(elites.map(row => [row.EliteGroup, row])),
      mazeBuffMap: new Map(mazeBuffs.map(row => [row.ID, row])),
      guideConfigMap: new Map(guideConfigs.map(row => [row.MonsterID, row])),
      guideTagMap: new Map(guideTags.map(row => [row.TagID, row])),
      scheduleGlobalMap: new Map(scheduleGlobals.map(row => [row.ID, row])),
      stageInvasionMap: new Map(stageInvasions.map(row => [row.StageID, row])),
      invasionBuffMap: new Map(invasionBuffs.map(row => [row.InvasionID, row])),
      gluttonyStatusIcon: gluttonyStatus ? getUrl(gluttonyStatus.StatusIconPath, "dicloud") : undefined,
    };
    return tables;
  })();
  return tablesPromise;
}

/** 供已 init 的提取流程同步访问共享表 */
export function getChallengeTables(): ChallengeSharedTables {
  if (!tables) {
    throw new Error("challenge shared tables not loaded; call loadChallengeSharedTables first");
  }
  return tables;
}

/** 未命中引用去重记录，提取过程打日志、verify 脚本据此 fail */
const missLog = new Set<string>();

export function getChallengeMisses(): string[] {
  return [...missLog];
}

function miss(key: string) {
  if (missLog.has(key)) {
    return;
  }
  missLog.add(key);
  console.warn(`[challenge] 引用未命中: ${key}`);
}

/** 模式侧（Extractor）记录未命中引用 */
export function noteChallengeMiss(key: string) {
  miss(key);
}

/** 组内稀疏等级（如 g4501 仅 20/50/75/100）回退到不高于目标等级的最近一行。 */
function getCurveRow(group: CurveGroup | undefined, level: number) {
  if (!group) {
    return undefined;
  }
  const target = Math.min(Math.max(level, group.levels[0]), group.levels[group.levels.length - 1]);
  let current = group.levels[0];
  for (const lv of group.levels) {
    if (lv > target) {
      break;
    }
    current = lv;
  }
  return group.rows.get(current);
}

/** MonsterID → 模板 ID（展示 Boss 换算口径），未命中返回 null */
export function toTemplateId(monsterId: number): number | null {
  const monster = getChallengeTables().monsterMap.get(monsterId);
  if (!monster) {
    miss(`MonsterConfig:${monsterId}`);
    return null;
  }
  return monster.MonsterTemplateID;
}

/**
 * Stage 展示名 → 唯一预览首领模板 ID。
 *
 * 异相仲裁没有 Challenge*Extra 展示位表，但 StageName 与预览首领的 MonsterName 共用文本 Hash。
 * 当前普通/绝境 Stage 均唯一命中；缺失或多义时记录引用错误，不按波次站位猜测。
 */
export function getStagePreviewMonsterIds(stageIds: number[]): number[] {
  const result = new Set<number>();
  for (const stageId of stageIds) {
    const stage = getChallengeTables().stageMap.get(stageId);
    if (!stage) {
      miss(`StageConfig:${stageId}`);
      continue;
    }
    const nameHash = stage.StageName?.Hash;
    if (nameHash == null) {
      miss(`StageConfig.StageName:${stageId}`);
      continue;
    }
    const templateIds = getChallengeTables().monsterTemplateIdsByNameHash.get(String(nameHash)) ?? [];
    if (templateIds.length !== 1) {
      miss(`StageConfig.StageNamePreview:${stageId} (${templateIds.length} matches)`);
      continue;
    }
    result.add(templateIds[0]);
  }
  return [...result];
}

/**
 * HP = HPBase × 等级曲线 HPRatio × 生效 EliteGroup HPRatio × HPModifyRatio × 波次 hpMultiplier。
 * 默认双精度与向上取整；仅明确指定 story 时使用曲线 Single + Q32 乘法 + floor（§5.4）。
 */
export function calcChallengeHp(
  templateId: number,
  hardLevelGroup: number | undefined,
  level: number,
  eliteGroup: number | undefined,
  hpModifyRatio: number | undefined,
  hpMultiplier = 1,
  hpCalculation?: HsrChallengeEnemy["hpCalculation"],
): number {
  const hpBase = getChallengeTables().templateMap.get(templateId)?.HPBase?.Value;
  if (hpBase == null) {
    miss(`MonsterTemplateConfig.HPBase:${templateId}`);
    return 0;
  }
  const curve = hardLevelGroup == null ? undefined : getCurveRow(getChallengeTables().curveMap.get(hardLevelGroup), level);
  const elite = eliteGroup == null ? undefined : getChallengeTables().eliteMap.get(eliteGroup);
  if (hpCalculation === "story") {
    return calculateStoryHp(hpBase, curve?.HPRatio.Value ?? 1, elite?.HPRatio.Value ?? 1, hpModifyRatio ?? 1, hpMultiplier);
  }
  const product = hpBase * (curve?.HPRatio.Value ?? 1) * (elite?.HPRatio.Value ?? 1) * (hpModifyRatio ?? 1) * hpMultiplier;
  return Math.ceil(product - 1e-6);
}

interface ChallengeWaveInput {
  enemies: { monsterId: number; eliteGroup?: number }[];
  hpMultiplier: number;
}

/** StageConfig 波次展开 → HsrChallengeStage；虚构叙事可传入实际无限波次。 */
export function buildChallengeStage(
  lang: string,
  stageId: number,
  waveInputs?: ChallengeWaveInput[],
  hpCalculation?: HsrChallengeEnemy["hpCalculation"],
): HsrChallengeStage | null {
  const stage = getChallengeTables().stageMap.get(stageId);
  if (!stage) {
    miss(`StageConfig:${stageId}`);
    return null;
  }

  const waves: HsrChallengeEnemy[][] = [];
  let eliteGroup = stage.EliteGroup;
  const inputs = waveInputs ?? (stage.MonsterList ?? []).map(wave => ({
    hpMultiplier: 1,
    enemies: Object.keys(wave)
      .filter(key => /^Monster\d+$/.test(key))
      .sort((a, b) => Number(a.slice(7)) - Number(b.slice(7)))
      .map(key => ({ monsterId: wave[key], eliteGroup: undefined })),
  }));
  for (const wave of inputs) {
    const hpMultiplier = wave.hpMultiplier;
    const enemies: HsrChallengeEnemy[] = [];
    for (const input of wave.enemies) {
      const monsterId = input.monsterId;
      const monster = getChallengeTables().monsterMap.get(monsterId);
      if (!monster) {
        miss(`MonsterConfig:${monsterId}`);
        continue;
      }
      const effectiveElite = input.eliteGroup ?? stage.EliteGroup ?? monster.EliteGroup ?? 1;
      eliteGroup ??= effectiveElite;
      // 库内基准口径：同公式但不含战斗组与波次能力倍率，供详情页对照挑战倍率差
      const rawHp = calcChallengeHp(
        monster.MonsterTemplateID,
        stage.HardLevelGroup,
        stage.Level ?? 0,
        undefined,
        monster.HPModifyRatio?.Value,
      );
      enemies.push({
        monsterId,
        templateId: monster.MonsterTemplateID,
        hp: calcChallengeHp(
          monster.MonsterTemplateID,
          stage.HardLevelGroup,
          stage.Level ?? 0,
          effectiveElite,
          monster.HPModifyRatio?.Value,
          hpMultiplier,
          hpCalculation,
        ),
        rawHp,
        hpCalculation,
        hpMultiplier: hpMultiplier === 1 ? undefined : hpMultiplier,
        eliteGroup: input.eliteGroup,
      });
    }
    waves.push(enemies);
  }

  const result: HsrChallengeStage = {
    stageId,
    level: stage.Level ?? 0,
    hardLevelGroup: stage.HardLevelGroup,
    eliteGroup,
    waves,
  };
  // 贪饕污染实例标记（doc/stage-invasion-report.md §5.4）：一处挂接，四模式自动生效
  applyStageInvasion(stageId, result);
  return result;
}

/**
 * 虚构叙事实际无限波次；同波同组重复刷新同一敌人时合并展示，保留不同战斗组的独立条目。
 * 当前支持经能力图确认的 FantasticStory_Wave_Ability_0001（第二参数为 HPAddedRatio）。
 */
export function getStoryChallengeWaves(stageId: number): ChallengeWaveInput[] | undefined {
  const shared = getChallengeTables();
  const stage = shared.stageMap.get(stageId);
  const groupId = stage?.StageConfigData?.find(row => row.BFLIFKBEOPJ === "_StageInfiniteGroup")?.MNDFOPKBHKP;
  if (groupId == null) return undefined;
  const group = shared.infiniteGroupMap.get(Number(groupId));
  if (!group) {
    miss(`StageInfiniteGroup:${groupId}`);
    return undefined;
  }
  return group.WaveIDList.map(id => {
    const wave = shared.infiniteWaveMap.get(id);
    if (!wave) miss(`StageInfiniteWaveConfig:${id}`);
    const enemies = (wave?.MonsterGroupIDList ?? []).flatMap(monsterGroupId => {
      const monsters = shared.infiniteMonsterGroupMap.get(monsterGroupId);
      if (!monsters) miss(`StageInfiniteMonsterGroup:${monsterGroupId}`);
      return [...new Set(monsters?.MonsterList ?? [])].map(monsterId => ({
        monsterId,
        eliteGroup: monsters?.EliteGroup,
      }));
    });
    let hpMultiplier = 1;
    if (wave?.Ability === "FantasticStory_Wave_Ability_0001") {
      const addedRatio = wave.ParamList[1]?.Value;
      if (addedRatio == null || !Number.isFinite(addedRatio) || addedRatio <= -1) {
        miss(`StageInfiniteWaveConfig.HPAddedRatio:${id}`);
      } else {
        hpMultiplier += addedRatio;
      }
    } else if (wave?.Ability) {
      miss(`StageInfiniteWaveConfig.Ability:${id}/${wave.Ability}`);
    }
    return { enemies, hpMultiplier };
  });
}

/** 各模式 ScheduleData 本地表的公共行形态（BeginTime/EndTime 恒非空） */
export interface ChallengeScheduleRow {
  ID: number;
  BeginTime: string;
  EndTime: string;
}

/**
 * 期时间关联：ScheduleDataChallenge* 本地表优先，未命中时回退 ScheduleDataGlobal
 * （如忘却之庭 1034/1035 期）；Global 表 Begin/GlobalBegin、End/GlobalEnd 互斥，取非空者。
 */
export function resolveChallengeScheduleTime(
  local: ChallengeScheduleRow | undefined,
  scheduleDataId: number,
  localTableName: string,
): { beginTime?: string; endTime?: string } {
  const global = getChallengeTables().scheduleGlobalMap.get(scheduleDataId);
  if (!local && !global) {
    miss(`${localTableName}:${scheduleDataId} (ScheduleDataGlobal:${scheduleDataId} 亦未命中)`);
  }
  const first = (...times: (string | undefined)[]) => times.find(time => !!time);
  return {
    beginTime: first(local?.BeginTime, global?.BeginTime, global?.GlobalBeginTime),
    endTime: first(local?.EndTime, global?.EndTime, global?.GlobalEndTime),
  };
}

/** MazeBuff → HsrChallengeBuff（文本 + 图标 + 参数），打 challengebuff 标 */
export function parseChallengeBuff(lang: string, buffId: number): HsrChallengeBuff | null {
  const row = getChallengeTables().mazeBuffMap.get(buffId);
  if (!row) {
    miss(`MazeBuff:${buffId}`);
    return null;
  }

  TextMap.setTagInfo(lang, row.BuffName.Hash, {
    category: { challengebuff: row.ID + "", type: "MazeBuff" },
    tags: ["challenge", "challengebuff"],
  });
  TextMap.setTagInfo(lang, row.BuffDesc.Hash, {
    category: { challengebuff: row.ID + "", type: "MazeBuff" },
    tags: ["challenge", "challengebuff"],
  });

  return {
    id: row.ID,
    name: TextMap.getText(lang, row.BuffName.Hash),
    desc: TextMap.getText(lang, row.BuffDesc.Hash),
    icon: getUrl(row.BuffIcon, "dicloud") || undefined,
    params: row.ParamList.map(p => p.Value),
  };
}

/**
 * 各模式 Target 表公共行形态（ChallengeTarget 系与 ChallengeBossTargetConfig 等字段一致）；
 * 异相仲裁的目标在 BattleTargetConfig，由提取器映射为本形态（type ← AbilityName、param ← TargetParam）。
 */
export interface ChallengeTargetRow {
  ID: number;
  /** 游戏内语义类型（ChallengeTarget 系枚举 / BattleTargetConfig.AbilityName），统一 string */
  ChallengeTargetType: string;
  ChallengeTargetName: {
    Hash: bigint;
  };
  ChallengeTargetParam1?: number;
}

/** Target 行 → HsrChallengeTarget，期分类下追加 challengetarget 标 */
export function parseChallengeTarget(
  lang: string,
  row: ChallengeTargetRow,
  mode: string,
  seasonId: number,
  tableType: string,
): HsrChallengeTarget {
  TextMap.setTagInfo(lang, row.ChallengeTargetName.Hash, {
    category: {
      [`challenge${mode}`]: seasonId + "",
      challengetarget: row.ID + "",
      type: tableType,
    },
    tags: ["challenge", `challenge${mode}`],
  });

  return {
    id: row.ID,
    type: row.ChallengeTargetType,
    name: TextMap.getText(lang, row.ChallengeTargetName.Hash),
    param: row.ChallengeTargetParam1,
  };
}

/**
 * 展示 Boss 战斗 MonsterID → 首领图鉴特性（MonsterGuideConfig.TagList → MonsterGuideTag），
 * 按源顺序输出，首个为核心特性、其余为常规特性（游戏内首领特性页口径）。无图鉴行返回空数组。
 */
export function parseChallengeTraits(lang: string, monsterId: number): HsrChallengeTrait[] {
  const guide = getChallengeTables().guideConfigMap.get(monsterId);
  if (!guide) {
    noteChallengeMiss(`MonsterGuideConfig:${monsterId}`);
    return [];
  }
  return guide.TagList.flatMap(tagId => {
    const tag = getChallengeTables().guideTagMap.get(tagId);
    if (!tag) {
      noteChallengeMiss(`MonsterGuideTag:${tagId}`);
      return [];
    }

    TextMap.setTagInfo(lang, tag.TagName.Hash, {
      category: { challengetrait: tag.TagID + "", type: "MonsterGuideTag" },
      tags: ["challenge", "challengetrait"],
    });
    TextMap.setTagInfo(lang, tag.TagBriefDescription.Hash, {
      category: { challengetrait: tag.TagID + "", type: "MonsterGuideTag" },
      tags: ["challenge", "challengetrait"],
    });

    return [
      {
        id: tag.TagID,
        name: TextMap.getText(lang, tag.TagName.Hash),
        desc: TextMap.getText(lang, tag.TagBriefDescription.Hash),
        params: [...tag.ParameterList],
      },
    ];
  });
}
