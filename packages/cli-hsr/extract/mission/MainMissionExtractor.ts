import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import JSONBig from "json-bigint";
import { HsrMainMission, HsrMainMissionChapter, HsrMainMissionPack, HsrMainMissionStoryline } from "@game/games/hsr/mission";
import { HsrMainMissionCombo, HsrMainMissionEdge, HsrMainMissionGraph, HsrMainMissionNode } from "@game/games/hsr/mission/graph";
import TextMap from "../../text";
import _ from "lodash";
import { MainMission, MainMissionPack, ChronicleConclusion, MissionChapterConfig, EndmostChronicle } from "schema/MainMission";
import { StroyLineUIData } from "schema/StroyLineUIData";
import { SubMission } from "schema/SubMission";
import { WorldUnlockConfig } from "schema/WorldUnlockConfig";
import { getUrl } from "../../url";
import { chapterWorldMapFix, endmostChapterIds, mainMissionIconIdFix } from "../manual/missionFixMap";
import { getS3Config } from "../../s3";

const ChronicleIconAssetPrefix = "SpriteOutput/chronicle";

const MISSION_PREREQ_TYPES = new Set(["MultiSequence", "SequenceNextDay"]);

/** 编年史章节：开拓 → 间章/续闻 → 同行 → 冒险 */
const CHAPTER_TYPE_ORDER: Record<string, number> = {
  Main: 0,
  Gap: 1,
  Companion: 2,
  Branch: 3,
  Daily: 4,
};

function chapterTypeRank(type: string | undefined): number {
  if (!type) {
    return 9;
  }
  return CHAPTER_TYPE_ORDER[type] ?? 9;
}

function chapterSortKey(chapter: HsrMainMissionChapter): [number, number, number] {
  return [
    chapterTypeRank(chapter.type),
    chapter.displayPriority ?? 0,
    chapter.id,
  ];
}

function collectUnlockPrereqIds(params: { type: string; value?: number }[] | undefined): number[] {
  const ids: number[] = [];
  for (const param of params || []) {
    if (MISSION_PREREQ_TYPES.has(param.type) && param.value) {
      ids.push(param.value);
    }
  }
  return ids;
}

function addSuccessor(map: Map<number, number[]>, from: number, to: number) {
  const list = map.get(from);
  if (list) {
    if (!list.includes(to)) {
      list.push(to);
    }
    return;
  }
  map.set(from, [to]);
}

function buildSuccessorMap(missions: HsrMainMission[]): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const mission of missions) {
    if (mission.nextTrackMainMission) {
      addSuccessor(map, mission.id, mission.nextTrackMainMission);
    }
    for (const nextId of mission.nextMainMissionList || []) {
      addSuccessor(map, mission.id, nextId);
    }
    for (const prereq of collectUnlockPrereqIds(mission.takeParam)) {
      addSuccessor(map, prereq, mission.id);
    }
  }
  return map;
}

function missionStoryCompare(ids: number[], missionMap: Map<number, HsrMainMission>): (a: number, b: number) => number {
  const idSet = new Set(ids);
  const index = new Map(ids.map((id, i) => [id, i]));
  const score = (id: number) => {
    const mission = missionMap.get(id);
    let value = index.get(id) ?? 0;
    if (mission?.nextTrackMainMission && idSet.has(mission.nextTrackMainMission)) {
      value -= 1_000_000;
    }
    if (mission?.isInRaid) {
      value += 100_000;
    }
    if (!mission?.icon) {
      value += 10_000;
    }
    return value;
  };
  return (a, b) => score(a) - score(b);
}

function topoSortIds(
  ids: number[],
  successorMap: Map<number, number[]>,
  compare?: (a: number, b: number) => number,
): number[] {
  if (ids.length <= 1) {
    return ids;
  }

  const idSet = new Set(ids);
  const index = new Map(ids.map((id, i) => [id, i]));
  const indeg = new Map(ids.map(id => [id, 0]));
  const adj = new Map(ids.map(id => [id, [] as number[]]));
  const seen = new Set<string>();

  for (const id of ids) {
    for (const nxt of successorMap.get(id) || []) {
      if (!idSet.has(nxt)) {
        continue;
      }
      const key = `${id}->${nxt}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      adj.get(id)!.push(nxt);
      indeg.set(nxt, (indeg.get(nxt) || 0) + 1);
    }
  }

  const remaining = new Set(ids);
  const result: number[] = [];
  const better = (candidate: number, current: number) => {
    if (compare) {
      return compare(candidate, current) < 0;
    }
    return (index.get(candidate) ?? Infinity) < (index.get(current) ?? Infinity);
  };

  const nextReady = () => {
    let chosen: number | undefined;
    for (const id of remaining) {
      if ((indeg.get(id) || 0) > 0) {
        continue;
      }
      if (chosen == null || better(id, chosen)) {
        chosen = id;
      }
    }
    return chosen;
  };

  let current = nextReady();
  while (current != null) {
    remaining.delete(current);
    result.push(current);
    for (const nxt of adj.get(current) || []) {
      indeg.set(nxt, (indeg.get(nxt) || 0) - 1);
    }
    current = nextReady();
  }

  for (const id of ids) {
    if (remaining.has(id)) {
      result.push(id);
    }
  }
  return result;
}

function parseMainMissionIconFileName(fileName: string) {
  // 后缀大小写不敏感匹配（桶内存在 1040206_M.png 等大写文件）；gender 保留原始大小写供 URL 使用
  const match = /^(\d+)(?:_([fmFM]))?\.png$/i.exec(fileName);
  if (!match) {
    return null;
  }

  return {
    id: Number(match[1]),
    gender: match[2] as string | undefined,
  };
}

/** 编年史图标各形态的桶内文件名后缀（值为实际大小写字符，用于生成可命中的 URL） */
interface ChronicleIconFiles {
  common?: boolean;
  /** 女性版文件名后缀字符（"f" 或 "F"） */
  f?: string;
  /** 男性版文件名后缀字符（"m" 或 "M"） */
  m?: string;
}

export class MainMissionExtractor {
  private static sharedMainMissionIconMap?: Map<number, string | undefined>;

  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  mainMissions: MainMission[] = [];
  mainMissionPacks: MainMissionPack[] = [];
  chronicleConclusions: ChronicleConclusion[] = [];
  missionChapterConfigs: MissionChapterConfig[] = [];
  endmostChronicles: EndmostChronicle[] = [];
  endmostMissionPacks: MainMissionPack[] = [];
  worldUnlockConfigs: WorldUnlockConfig[] = [];
  splitWorldIds = new Set<number>();
  storyLineConfigs: StroyLineUIData[] = [];
  mainMissionIconMap = new Map<number, string | undefined>();
  /** 子任务描述 Hash：SubMissionID → DescrptionText.Hash */
  subDescHash = new Map<number, unknown>();
  /** MainMissionID → 子任务 ID（按 MissionInfo 声明顺序；跨目录存放的子任务也以它为准） */
  ownedSubIds = new Map<number, number[]>();
  /** MainMissionID → 子任务 ID（SubMissionID 前 7 位归组的兜底口径） */
  prefixedSubIds = new Map<number, number[]>();

  async init() {
    // 主线任务表
    const json1 = await fs.readFile(`./data/ExcelOutput/MainMission.json`, "utf-8");
    this.mainMissions = JSONBig.parse(json1);

    // 任务包表
    const json2 = await fs.readFile(`./data/ExcelOutput/MainMissionPack.json`, "utf-8");
    this.mainMissionPacks = JSONBig.parse(json2);

    // 任务剧情总结表
    const json3 = await fs.readFile(`./data/ExcelOutput/ChronicleConclusion.json`, "utf-8");
    this.chronicleConclusions = JSONBig.parse(json3);

    // 任务章节表
    const json4 = await fs.readFile(`./data/ExcelOutput/MissionChapterConfig.json`, "utf-8");
    this.missionChapterConfigs = JSONBig.parse(json4);

    // 终末任务表，去混淆后和主线任务表基本一致
    const json5 = await fs.readFile(`./data/ExcelOutput/EndmostChronicle.json`, "utf-8");
    this.endmostChronicles = JSONBig.parse(json5);

    // 终末任务包表
    const json6 = await fs.readFile(`./data/ExcelOutput/EndmostChronicleMissionPack.json`, "utf-8");
    this.endmostMissionPacks = JSONBig.parse(json6);

    // 世界解锁表
    const json7 = await fs.readFile(`./data/ExcelOutput/WorldUnlockConfig.json`, "utf-8");
    this.worldUnlockConfigs = JSONBig.parse(json7);
    this.splitWorldIds = new Set(
      this.worldUnlockConfigs.filter(item => item.PreWorldID).map(item => item.ID)
    );

    // 子任务描述（desc 回退源）
    const json8 = await fs.readFile(`./data/ExcelOutput/SubMission.json`, "utf-8");
    for (const sub of JSONBig.parse(json8) as SubMission[]) {
      if (sub.DescrptionText?.Hash) {
        this.subDescHash.set(sub.SubMissionID, sub.DescrptionText.Hash);
      }
      const mainId = Math.floor(sub.SubMissionID / 100);
      if (!this.prefixedSubIds.has(mainId)) this.prefixedSubIds.set(mainId, []);
      this.prefixedSubIds.get(mainId)!.push(sub.SubMissionID);
    }

    // 多视角故事线 UI 表（编年史泳道）
    const json9 = await fs.readFile(`./data/ExcelOutput/StroyLineUIData.json`, "utf-8");
    this.storyLineConfigs = JSONBig.parse(json9);

    await this.loadSubOwnership();
    await TextMap.loadMap(this.lang);
    this.mainMissionIconMap = await this.getSharedMainMissionIconMap();
  }

  /**
   * 从 Config/Level/Mission 下各任务目录的 MissionInfo_*.partial.json 读取子任务归属。
   * 权威口径：子任务图文件可能存放在兄弟任务目录下（如 1020702 的子任务号在 1020701 段内），
   * SubMissionID 前 7 位归组在交错号段上会认错任务。Config 不存在时静默退回前缀口径。
   */
  private async loadSubOwnership() {
    const root = path.join(process.cwd(), "data", "Config", "Level", "Mission");
    let dirs;
    try {
      dirs = await fs.readdir(root, { withFileTypes: true });
    } catch {
      return;
    }
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      let files: string[];
      try {
        files = await fs.readdir(path.join(root, dir.name));
      } catch {
        continue;
      }
      for (const file of files) {
        if (!/^MissionInfo_.*\.partial\.json$/.test(file)) continue;
        let info: { SubMissionList?: { ID: number; MainMissionID: number }[] };
        try {
          info = JSON.parse(await fs.readFile(path.join(root, dir.name, file), "utf-8"));
        } catch {
          continue; // 单个 Info 损坏不阻断提取
        }
        for (const sub of info.SubMissionList ?? []) {
          if (sub.ID == null || sub.MainMissionID == null) continue;
          if (!this.ownedSubIds.has(sub.MainMissionID)) this.ownedSubIds.set(sub.MainMissionID, []);
          this.ownedSubIds.get(sub.MainMissionID)!.push(sub.ID);
        }
      }
    }
  }

  /** 任务描述回退：终末描述/剧情总结缺失时，取首个带描述子任务的 DescrptionText（游戏内任务栏描述） */
  private resolveDescFallback(missionId: number) {
    const subs = this.ownedSubIds.get(missionId) ?? this.prefixedSubIds.get(missionId) ?? [];
    for (const subId of subs) {
      const hash = this.subDescHash.get(subId);
      if (hash == null) continue;
      const text = TextMap.getText(this.lang, hash);
      if (text) return text;
    }
    return "";
  }

  private async getSharedMainMissionIconMap() {
    if (MainMissionExtractor.sharedMainMissionIconMap) {
      return MainMissionExtractor.sharedMainMissionIconMap;
    }

    try {
      MainMissionExtractor.sharedMainMissionIconMap = await this.loadMainMissionIconMap();
    } catch (error) {
      console.error("[MainMissionExtractor] failed to load chronicle icon list from s3", error);
      MainMissionExtractor.sharedMainMissionIconMap = new Map<number, string | undefined>();
    }

    return MainMissionExtractor.sharedMainMissionIconMap;
  }

  private async loadMainMissionIconMap() {
    const output = await this.listChronicleIconFiles();
    const iconMap = new Map<number, ChronicleIconFiles>();

    for (const line of output.split(/\r?\n/)) {
      const fileName = line.trim().split(/\s+/).pop();
      if (!fileName) {
        continue;
      }

      const parsed = parseMainMissionIconFileName(fileName);
      if (!parsed) {
        continue;
      }

      const current = iconMap.get(parsed.id) ?? {};
      if (!parsed.gender) {
        current.common = true;
      } else if (parsed.gender.toLowerCase() === "f") {
        current.f = parsed.gender;
      } else {
        current.m = parsed.gender;
      }
      iconMap.set(parsed.id, current);
    }

    const missionIconMap = new Map<number, string | undefined>(
      [...iconMap.entries()].map(([id, files]) => [id, this.buildMainMissionIconPath(id, files)])
    );

    // 将已核对的异常图片 ID 作为任务 ID 的回退别名。
    // 优先保留规范命名图片，以便今后补传 <MainMissionID>.png 后自动脱离手工补丁。
    for (const [missionIdText, iconId] of Object.entries(mainMissionIconIdFix)) {
      const missionId = Number(missionIdText);
      if (missionIconMap.has(missionId)) {
        continue;
      }
      const files = iconMap.get(iconId);
      if (files) {
        missionIconMap.set(missionId, this.buildMainMissionIconPath(iconId, files));
      }
    }

    return missionIconMap;
  }

  private buildMainMissionIconPath(id: number, files: ChronicleIconFiles) {
    // 性别插值表达式 {F#x}{M#y} 的替换字符跟随桶内实际文件名大小写（消费端按占位符内容替换）
    if (files.f && files.m) {
      return getUrl(`${ChronicleIconAssetPrefix}/${id}_{F#${files.f}}{M#${files.m}}.png`, "dicloud");
    }
    if (files.common) {
      return getUrl(`${ChronicleIconAssetPrefix}/${id}.png`, "dicloud");
    }
    if (files.f) {
      return getUrl(`${ChronicleIconAssetPrefix}/${id}_${files.f}.png`, "dicloud");
    }
    if (files.m) {
      return getUrl(`${ChronicleIconAssetPrefix}/${id}_${files.m}.png`, "dicloud");
    }
    return undefined;
  }

  private async listChronicleIconFiles() {
    const config = getS3Config();
    if (!config) return "";
    const iconPrefix = [config.prefix, "spriteoutput/chronicle"].filter(Boolean).join("/");

    return new Promise<string>((resolve, reject) => {
      const child = spawn(
        process.platform === "win32" ? "s5cmd.exe" : "s5cmd",
        [
          "--endpoint-url",
          config.endpoint,
          "ls",
          `s3://${config.bucket}/${iconPrefix}/`,
        ],
        {
          cwd: process.cwd(),
          env: { ...process.env, AWS_REGION: config.region },
          shell: false,
        }
      );

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", data => {
        stdout += data.toString();
      });
      child.stderr.on("data", data => {
        stderr += data.toString();
      });
      child.on("error", reject);
      child.on("close", code => {
        if (code === 0) {
          const fileCount = stdout.split(/\r?\n/).filter(line => {
            const fileName = line.trim().split(/\s+/).pop();
            return fileName && parseMainMissionIconFileName(fileName);
          }).length;
          console.log(`[MainMissionExtractor] S3 chronicle icon query succeeded: ${fileCount} files`);
          resolve(stdout);
          return;
        }
        reject(new Error(stderr || `s5cmd exited with code ${code}`));
      });
    });
  }

  missions: HsrMainMission[] = [];
  getMainMissions() {
    const endmostChronicleMap = new Map(this.endmostChronicles.map(item => [item.PHFMCACHFIJ, item]));

    // 创建任务ID到描述的映射
    const conclusionMap = this.chronicleConclusions.reduce<Record<number, string>>((acc, cur) => {
      acc[cur.MissionID] = TextMap.getText(this.lang, cur.MissionConclusion?.Hash);
      return acc;
    }, {});

    const data = this.mainMissions.map(d => {
      const endmost = endmostChronicleMap.get(d.MainMissionID);
      const isEndmost = !!endmost;
      const mission: HsrMainMission = {
        kind: "mission",
        id: d.MainMissionID,
        code: d.MainMissionID + "",
        name: TextMap.getText(this.lang, endmost?.LGPDIDLJFOI?.Hash ?? d.Name?.Hash),
        desc: endmost?.GFOGDOBBJAF?.Hash
          ? TextMap.getText(this.lang, endmost.GFOGDOBBJAF.Hash)
          : (conclusionMap[d.MainMissionID] || ""),
        icon: endmost
          ? this.getEndmostIconPath(endmost)
          : (this.mainMissionIconMap.get(d.MainMissionID) || ""),
        type: d.Type,
        worldId: d.WorldID || 100,
        isEndmost,
        displayPriority: d.DisplayPriority,
        nextMainMissionList: d.NextMainMissionList,
        takeOperation: d.TakeOperation,
        beginOperation: d.BeginOperation,
        takeParam: d.TakeParam.map(param => ({
          type: param.Type,
          value: param.Value!
        })),
        isInRaid: d.IsInRaid,
        beginParam: d.BeginParam.map(param => ({
          type: param.Type
        })),
        nextTrackMainMission: d.NextTrackMainMission!,
        trackWeight: d.TrackWeight!,
        rewardId: d.RewardID!,
        displayRewardId: d.DisplayRewardID!,
        missionPack: d.MissionPack,
        chapterId: d.ChapterID!,
        subRewardList: d.SubRewardList,
      };
      // desc 只保留终末描述/剧情总结；缺失时的回退内容单独放 descFallback，便于排查
      if (!mission.desc) {
        mission.descFallback = this.resolveDescFallback(d.MainMissionID);
      }

      TextMap.setTagInfo(this.lang, d.Name?.Hash, {
        category: {
          mainMission: d.MainMissionID + "",
          type: "MainMission",
        },
        tags: ["mission","mainmission"]
      });

      // MissionConclusion在ChronicleConclusion中，不在MainMission中；终末任务由EndmostChronicle描述替代
      if (endmost?.GFOGDOBBJAF?.Hash) {
        TextMap.setTagInfo(this.lang, endmost.GFOGDOBBJAF.Hash, {
          category: {
            mainMission: d.MainMissionID + "",
            type: "EndmostChronicle",
          },
          tags: ["mission","mainmission"]
        });
      } else {
        const conclusion = this.chronicleConclusions.find(c => c.MissionID === d.MainMissionID);
        if (conclusion?.MissionConclusion?.Hash) {
          TextMap.setTagInfo(this.lang, conclusion.MissionConclusion.Hash, {
            category: {
              mainMission: d.MainMissionID + "",
              type: "ChronicleConclusion",
            },
            tags: ["mission","mainmission"]
          });
        }
      }

      return mission;
    });

    const sorted = _.sortBy(data, "id");
    this.assignSplitWorlds(sorted);
    return sorted;
  }

  private assignSplitWorlds(missions: HsrMainMission[]) {
    const byId = new Map(missions.map(mission => [mission.id, mission]));
    const successorMap = buildSuccessorMap(missions);

    for (const unlock of this.worldUnlockConfigs) {
      if (!unlock.PreWorldID || !unlock.WorldPreUnlockEndMission) {
        continue;
      }

      const preWorld = unlock.PreWorldID;
      const targetWorld = unlock.ID;
      const canTake = (mission: HsrMainMission) =>
        mission.worldId === preWorld || mission.worldId === targetWorld || mission.worldId === 100;

      const visited = new Set<number>();
      const queue = [unlock.WorldPreUnlockEndMission];

      while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) {
          continue;
        }
        const mission = byId.get(id);
        if (!mission || !canTake(mission)) {
          continue;
        }
        visited.add(id);
        mission.worldId = targetWorld;
        for (const nextId of successorMap.get(id) || []) {
          queue.push(nextId);
        }
      }

      const chapterIds = new Set(
        [...visited]
          .map(id => byId.get(id)?.chapterId)
          .filter((id): id is number => !!id)
      );
      for (const mission of missions) {
        if (mission.chapterId && chapterIds.has(mission.chapterId) && canTake(mission)) {
          mission.worldId = targetWorld;
        }
      }
    }
  }

  private getEndmostIconPath(item: EndmostChronicle) {
    if (item.FBKAMIHGLFK && item.LDIHBHDHOMF) {
      return getUrl(item.FBKAMIHGLFK.replace(/_m\.png$/i, "_{F#f}{M#m}.png"), "dicloud");
    }
    if (item.FBKAMIHGLFK) {
      return getUrl(item.FBKAMIHGLFK, "dicloud");
    }
    if (item.LDIHBHDHOMF) {
      return getUrl(item.LDIHBHDHOMF, "dicloud");
    }
    return "";
  }

  getMainMissionPacks(mainMissions: HsrMainMission[]) {
    const mainMissionsByPack = _.groupBy(mainMissions, x => x.missionPack || 0);
    const allMissionPacks = _.uniqBy([
      ...this.mainMissionPacks,
      ...this.endmostMissionPacks,
    ], item => item.MissionPack);

    const data = allMissionPacks.map(d => {
      // 获取该任务包中的第一个任务
      const missions = mainMissionsByPack[d.MissionPack] || [];
      const firstMission = missions.find(m => m.desc) || {} as HsrMainMission;
      const pack: HsrMainMissionPack = {
        kind: "pack",

        id: d.MissionPack,
        code: d.MissionPack + "",
        mainMissionIds: d.MainMissionIdList,
        ..._.pick(firstMission, ["name"])
      };

      return pack;
    });

    return data;
  }

  // private fillMainMissionsInPacks(mainMissionPackList: HsrMainMissionPack[], mainMissionList: HsrMainMission[]) {
  //   return mutateGroupJoin(
  //     mainMissionPackList,
  //     {
  //       list: mainMissionList,
  //       bIdsKey: "mainMissionIds",
  //       bListKey: "mainMissions",
  //       key: "id",
  //       aggregate: (missions, pack) => {
  //         return {};
  //       },
  //     }
  //   );
  // }

  getChapters(mainMissions: HsrMainMission[]) {
    const mainMissionsByChapter = _.groupBy(mainMissions, x => x.chapterId || 0);
    const successorMap = buildSuccessorMap(mainMissions);

    return this.missionChapterConfigs.map(d => {
      const missions = mainMissionsByChapter[d.ID] || [];
      const origin = missions.find(m => m.id === d.OriginMainMission);
      const startMission = origin || missions.find(m => m.desc) || missions[0];
      const missionIds = topoSortIds(
        missions.map(m => m.id),
        successorMap,
        missionStoryCompare(missions.map(m => m.id), new Map(missions.map(m => [m.id, m]))),
      );

      TextMap.setTagInfo(this.lang, d.ChapterName?.Hash, {
        category: {
          chapter: d.ID + "",
          type: "MissionChapterConfig",
        },
        tags: ["mission","chapter"]
      });
      TextMap.setTagInfo(this.lang, d.ChapterDesc?.Hash, {
        category: {
          chapter: d.ID + "",
          type: "MissionChapterConfig",
        },
        tags: ["mission","chapter"]
      });

      return {
        kind: "chapter",
        id: d.ID,
        code: d.ID + "",
        name: TextMap.getText(this.lang, d.ChapterName?.Hash),
        desc: TextMap.getText(this.lang, d.ChapterDesc?.Hash),
        stageName: TextMap.getText(this.lang, d.StageName?.Hash),
        chapterType: d.ChapterType,
        icon: getUrl(d.ChapterIconPath),
        startMission: d.OriginMainMission,
        endMission: d.FinalMainMission,
        // 章节剧情可跨多张地图展开，worldId 只跟随开始任务（手工覆盖优先），禁止按成员多数投票
        worldId: chapterWorldMapFix[d.ID] ?? startMission?.worldId,
        type: origin?.type ?? startMission?.type,
        isEndmost: endmostChapterIds.includes(d.ID),
        missionIds,
        displayPriority: d.ChapterDisplayPriority,
      } as HsrMainMissionChapter
    });
  }

  /** 多视角故事线：StroyLineUIData 按 (解析后视角名, 头像) 分组——同一文本在上游挂在多个 Hash 上，
   *  按 Hash 分组会拆散同 POV；标记节点横跨任务链、可跨章节。开拓者性别行（无 StoryLineID）与
   *  指向已删除任务的行不产出。ID 仅在 storyline type 内唯一递增，按最小成员任务号排序保证跨语言稳定。 */
  getStorylineCombos() {
    const missionIds = new Set(this.mainMissions.map(m => m.MainMissionID));
    const groups = new Map<string, {
      nameHashes: bigint[]; iconPath?: string; chronicleIconPath?: string; mediumImgPath?: string; color?: string; missionIds: number[];
    }>();
    for (const row of this.storyLineConfigs) {
      if (row.StoryLineID == null || !missionIds.has(row.StoryLineID) || !row.Name?.Hash) continue;
      const key = `${TextMap.getText(this.lang, row.Name.Hash)}|${row.IconPath ?? ""}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          nameHashes: [],
          iconPath: row.IconPath,
          chronicleIconPath: row.ChronicleIconPath,
          mediumImgPath: row.MediumImgPath,
          color: row.Color,
          missionIds: [],
        };
        groups.set(key, group);
      }
      if (!group.nameHashes.some(h => h === row.Name!.Hash)) group.nameHashes.push(row.Name.Hash);
      group.missionIds.push(row.StoryLineID);
    }
    const sorted = [...groups.values()].sort((a, b) =>
      Math.min(...a.missionIds) - Math.min(...b.missionIds) || (a.iconPath ?? "").localeCompare(b.iconPath ?? "")
    );
    return sorted.map((group, index) => {
      const id = index + 1;
      for (const nameHash of group.nameHashes) {
        TextMap.setTagInfo(this.lang, nameHash, {
          category: {
            storyline: id + "",
            type: "StroyLineUIData",
          },
          tags: ["story_line"],
        });
      }
      return {
        kind: "storyline",
        id,
        name: TextMap.getText(this.lang, group.nameHashes[0]),
        icon: getUrl(group.iconPath ?? ""),
        chronicleIcon: getUrl(group.chronicleIconPath ?? ""),
        mediumImg: getUrl(group.mediumImgPath ?? ""),
        color: group.color ?? "",
        missionIds: group.missionIds.sort((a, b) => a - b),
      } as HsrMainMissionStoryline;
    });
  }

  getExtractedData() {
    const mainMissions = this.getMainMissions();
    const mainMissionPacks = this.getMainMissionPacks(mainMissions);
    const chapters = this.getChapters(mainMissions);
    const storylines = this.getStorylineCombos();

    const nodes: HsrMainMissionNode[] = mainMissions.map(m =>({
      id: m.id,
      data: m,
      combo: m.missionPack,
    }));
    const combos: HsrMainMissionCombo[] = [
      ...mainMissionPacks,
      ...chapters,
      ...storylines,
    ].map(m => ({
      id: m.id,
      data: m,
    }));
    const edges: HsrMainMissionEdge[] = [];
    const edgeKeys = new Set<string>();
    const addEdge = (source: number, target: number, kind: "track" | "unlock") => {
      if (!source || !target || source === target) {
        return;
      }
      const key = `${source}->${target}`;
      if (edgeKeys.has(key)) {
        return;
      }
      edgeKeys.add(key);
      edges.push({ source, target, kind });
    };

    for (const node of mainMissions) {
      if (node.nextTrackMainMission) {
        addEdge(node.id, node.nextTrackMainMission, "track");
      }
      for (const nextId of node.nextMainMissionList || []) {
        addEdge(node.id, nextId, "track");
      }
      for (const prereq of collectUnlockPrereqIds(node.takeParam)) {
        addEdge(prereq, node.id, "unlock");
      }
    }

    return this.cleanGraphData({
      nodes,
      edges,
      combos,
    });
 
  }

  cleanGraphData(graph: HsrMainMissionGraph): HsrMainMissionGraph { 
    const { nodes, edges, combos } = graph;
    
    // 创建节点ID到节点的映射
    const nodeMap = new Map<number, HsrMainMissionNode>();
    nodes.forEach(node => nodeMap.set(node.id, node));
    
    // 创建目标节点的入度映射（用于判断是否被其他mission关联）
    const inDegree = new Map<number, number>();
    edges.forEach(edge => {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });
    
    // 1. 清理没有chapterId或者没有name的mission，并且不被其他mission关联
    const validNodes = nodes.filter(node => {
      const mission = node.data;
      // 如果有chapterId且有name，保留
      if (mission.chapterId && mission.name) {
        return true;
      }
      // 如果没有chapterId或没有name，但被其他mission关联（入度>0），保留
      if ((inDegree.get(node.id) || 0) > 0) {
        return true;
      }
      // 否则删除
      if (this.lang == "CHS") {
        console.log(`删除未关联的任务：${mission.id} (${mission.name})`);
      }
      return false;
    });
    
    // 更新节点映射
    const validNodeMap = new Map<number, HsrMainMissionNode>();
    validNodes.forEach(node => validNodeMap.set(node.id, node));
    
    // 2. 邻接修正：仅看 nextTrack 主线链（unlock/分支边跨章节、跨世界，不参与）。
    // 只有当前后连接的任务都处于同一世界、且与当前任务同属一章时，才修正孤悬跨地图的任务；
    // 邻居世界不一致（如 A-B1-B2-A 的环）或跨章节时一律不动——章节间本就存在跨地图剧情。
    const trackNeighbors = new Map<number, number[]>();
    for (const node of validNodes) {
      const next = node.data.nextTrackMainMission;
      if (!next || !validNodeMap.has(next)) continue;
      if (!trackNeighbors.has(node.id)) trackNeighbors.set(node.id, []);
      trackNeighbors.get(node.id)!.push(next);
      if (!trackNeighbors.has(next)) trackNeighbors.set(next, []);
      trackNeighbors.get(next)!.push(node.id);
    }

    validNodes.forEach(node => {
      const mission = node.data;
      const neighbors = (trackNeighbors.get(node.id) ?? [])
        .map(id => validNodeMap.get(id)?.data)
        .filter((m): m is HsrMainMission => !!m);
      const connectedWorldIds = neighbors.map(m => m.worldId).filter(id => id !== undefined);

      // 如果所有连接的节点都有相同的worldId，且与当前节点不同，则修正
      if (connectedWorldIds.length > 0) {
        const uniqueWorldIds = [...new Set(connectedWorldIds)];
        if (uniqueWorldIds.length === 1 && uniqueWorldIds[0] !== mission.worldId) {
          // 跨章节禁止修正
          if (mission.chapterId && neighbors.every(m => m.chapterId === mission.chapterId)) {
            // 子世界（如千星城 602）不能被邻接的父世界改回去
            if (!this.splitWorldIds.has(mission.worldId)) {
              mission.worldId = uniqueWorldIds[0]!;
            }
          }
        }
      }
    });

    const successorMap = buildSuccessorMap(validNodes.map(node => node.data));
    const missionMap = new Map(validNodes.map(node => [node.id, node.data]));

    // 3. 修正chapter，并按剧情拓扑重排 missionIds
    const chapterCombos = combos.filter(c => c.data.kind === "chapter");
    for (const chapterNode of chapterCombos) {
      const chapter = chapterNode.data as HsrMainMissionChapter;
      const missions = chapter.missionIds.map(id => validNodeMap.get(id)!).filter(m => !!m);
      const chapterMissionIds = missions.map(m => m.id);
      chapter.missionIds = topoSortIds(
        chapterMissionIds,
        successorMap,
        missionStoryCompare(chapterMissionIds, missionMap),
      );

      // 章节 worldId 只跟随开始任务（其 worldId 已在上一步完成邻接修正），手工覆盖优先；
      // 章节剧情可跨多张地图展开，禁止按成员多数投票
      const startMission = missions.find(m => m.id === chapter.startMission) || missions.find(m => m.data.desc) || missions[0];
      const correctWorldId = chapterWorldMapFix[chapter.id] ?? startMission?.data.worldId;
      if (correctWorldId) {
        chapter.worldId = correctWorldId;
      }
    }

    // 4. 章节按类型分组，组内用游戏编年史 ChapterDisplayPriority（不再用跨章节解锁拓扑）
    for (const chapterNode of chapterCombos) {
      const chapter = chapterNode.data as HsrMainMissionChapter;
      const [typeRank, displayPriority] = chapterSortKey(chapter);
      chapter.order = typeRank * 1_000_000 + displayPriority;
      chapter.missionIds.forEach((missionId, i) => {
        const node = validNodeMap.get(missionId);
        if (node) {
          node.data.order = i;
        }
      });
    }

    const sortedChapterCombos = _.sortBy(chapterCombos, [
      c => (c.data as HsrMainMissionChapter).worldId ?? 0,
      c => (c.data as HsrMainMissionChapter).order ?? 0,
      c => c.id,
    ]);
    const chapterIndex = new Map(sortedChapterCombos.map((c, i) => [c.id, i]));
    const missionPosInChapter = new Map<number, number>();
    for (const chapterNode of sortedChapterCombos) {
      const chapter = chapterNode.data as HsrMainMissionChapter;
      chapter.missionIds.forEach((id, i) => missionPosInChapter.set(id, i));
    }

    const packCombos = combos.filter(c => c.data.kind !== "chapter");
    
    // 5. 过滤有效的边（只保留两端都在有效节点中的边）
    const validEdges = edges.filter(edge => 
      validNodeMap.has(edge.source) && validNodeMap.has(edge.target)
    );

    const sortedNodes = _.sortBy(validNodes, [
      node => chapterIndex.get(node.data.chapterId) ?? 10000,
      node => missionPosInChapter.get(node.id) ?? node.data.displayPriority ?? node.id,
      node => node.id,
    ]);
    
    return {
      nodes: sortedNodes,
      edges: validEdges,
      combos: [...sortedChapterCombos, ...packCombos],
    }
  }
}
