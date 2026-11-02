/**
 * Tier 1 剧情图速览提取器。
 *
 * 与 extract-dialogue-quick.mjs 的全局字典区块推断不同，v2 先用剧情图确定句子区块的唯一任务归属：
 *   - Mission / Act / Story / Discussion 图里的 TalkSentenceID；
 *   - GroupGraph / PropDialogue 里的 TalkSentenceID；
 *   - PlayVoice_Single / PlayVoice_Sequence 里能命中 TalkSentence 字典的 VoiceID。
 * 若一个六位句子区块只被一个显示任务组引用，则补全该区块中只存在于 Timeline .playable
 * 的字典句子；归属不唯一的区块仍只保留直接证据，避免旧版的跨任务串文。
 *
 * 任务入口从 MissionInfo 的 MissionJsonPath、LevelFloorID + GroupIDList 展开，
 * 并递归跟随 LevelGraph JSON 路径和 PerformanceID。Raid 内部任务按 RaidConfig 的
 * MainMissionIDBefore/After 并回所属正式任务。没有剧情图的任务仅保留标题占位。
 *
 * 官方回顾段落（PerformanceSkipOverride/ReplayOverride，由 cli-hsr 导出并解析文案；回放文案
 * 覆盖跳过文案）按演出路径的任务目录归属到 MainMission；有句子归属的段落以 blockquote
 * 「段落NN」插在其首个句子所在区块开头（附视频/分支标记，分支取官方 ContainImportBranch
 * 与多成员 PackID 组），图缺失的段落按锚点遍历时刻近似定位，完全无证据的段落排在任务小节末尾。
 *
 * 输出目录：output/v2/，世界目录、章节文件名和 Markdown 层级与现有速览产物一致。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createHsrConverter, renderRichText } from "./lib/unity-richtext-node.mjs";

const pkgRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const dataRoot = path.join(pkgRoot, "data");
const cliHsrChsRoot = process.env.CLI_HSR_OUTPUT
  ? path.resolve(process.env.CLI_HSR_OUTPUT)
  : path.join(pkgRoot, "..", "cli-hsr", "output", "CHS");
const outRoot = path.join(pkgRoot, "output", "v2");
const LOG_PREFIX = "[dialogue:v2]";
const log = message => console.log(`${LOG_PREFIX} ${message}`);
const missionLabel = mission => `${mission.id} ${mission.name || "（无标题）"}`;

const MISSION_TYPES = new Set(["Main", "Gap"]);
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const existingFile = file => {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
};

log("读取任务图、世界和台词字典");
const graph = readJson(path.join(cliHsrChsRoot, "mission", "graph.json"));
const worlds = readJson(path.join(cliHsrChsRoot, "mission", "worlds.json"));
const dictionary = readJson(path.join(cliHsrChsRoot, "scenario", "talksentence.json"));
const subOwner = new Map(readJson(path.join(cliHsrChsRoot, "mission", "subowner.json")));

const missionNodes = graph.nodes.filter(node => node.data.kind === "mission");
const missionById = new Map(missionNodes.map(node => [node.data.id, node.data]));
const storyMissions = missionNodes.filter(node => MISSION_TYPES.has(node.data.type)).map(node => node.data);
const chapters = graph.combos.filter(combo => combo.data.kind === "chapter").map(combo => combo.data);
const worldName = new Map(worlds.map(world => [world.id, world.name || "未命名世界"]));
log(`输入就绪：${storyMissions.length} 个 Main/Gap 任务，${chapters.length} 个章节，${dictionary.length} 条台词记录`);

const textjoinRows = readJson(path.join(cliHsrChsRoot, "textjoin.json"));
const textjoinVariables = {};
for (const row of textjoinRows) {
  const defaultItem = row.items.find(item => item.id === row.defaultItemId) ?? row.items[0];
  textjoinVariables[`TEXTJOIN#${row.id}`] = defaultItem?.text ?? "";
}
const richtextConverter = await createHsrConverter({
  NICKNAME: "开拓者",
  playerGender: "M",
  ...textjoinVariables,
});

const sentenceById = new Map();
const sentenceIdsByBlock = new Map();
for (const row of dictionary) {
  if (String(row.id).length === 9 && row.text && !String(row.id).startsWith("999999")) {
    sentenceById.set(row.id, row);
    const block = String(row.id).slice(0, 6);
    if (!sentenceIdsByBlock.has(block)) sentenceIdsByBlock.set(block, []);
    sentenceIdsByBlock.get(block).push(row.id);
  }
}
for (const ids of sentenceIdsByBlock.values()) ids.sort((a, b) => a - b);

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { recursive: true })) {
    const file = path.join(dir, entry);
    if (file.endsWith(".json") && !file.endsWith(".layout.json") && existingFile(file)) result.push(file);
  }
  return result.sort((a, b) => a.localeCompare(b, "en"));
}

function resolveDataPath(value) {
  if (typeof value !== "string" || !value.toLowerCase().endsWith(".json")) return null;
  const normalized = value.replaceAll("/", path.sep).replaceAll("\\", path.sep);
  const file = path.resolve(dataRoot, normalized);
  return existingFile(file) ? file : null;
}

function numbersOf(value, result = []) {
  if (typeof value === "number") result.push(value);
  else if (Array.isArray(value)) for (const item of value) numbersOf(item, result);
  else if (value && typeof value === "object") for (const item of Object.values(value)) numbersOf(item, result);
  return result;
}

// PerformanceID -> 真实剧情图路径；官方回顾/回放文案与跳过标记由 cli-hsr 导出。
// 演出类型含 Video（PerformanceVideo 表，播放视频的演出），路径仍指向 data 内图文件。
const performanceIndexRows = readJson(path.join(cliHsrChsRoot, "scenario", "performance", "index.json"));
const skipOverrideRows = readJson(path.join(cliHsrChsRoot, "scenario", "performance", "skip-override.json"));
const replayOverrideRows = readJson(path.join(cliHsrChsRoot, "scenario", "performance", "replay-override.json"));
const skipFlagRows = readJson(path.join(cliHsrChsRoot, "scenario", "performance", "skip-flag.json"));
const performancePathById = new Map();
const performancePathByGraph = new Map();
const performancePathTextById = new Map();
for (const row of performanceIndexRows) {
  performancePathTextById.set(row.id, row.path);
  const graphFile = resolveDataPath(row.path);
  if (!graphFile) continue;
  if (!performancePathById.has(row.id)) performancePathById.set(row.id, graphFile);
  if (!performancePathByGraph.has(graphFile)) performancePathByGraph.set(graphFile, row.id);
}
log(`演出索引：${performanceIndexRows.length} 行，${performancePathById.size} 行可解析到剧情图`);

// 官方段落文案：SkipOverride 是跳过确认文案，ReplayOverride 是回放展示文案；
// 两者共存时回放文案是回顾界面的展示内容，覆盖之。
const overrideById = new Map();
for (const row of skipOverrideRows) {
  if (row.desc) overrideById.set(row.id, row);
}
for (const row of replayOverrideRows) {
  if (!row.desc) continue;
  const existing = overrideById.get(row.id);
  overrideById.set(row.id, existing ? { ...existing, desc: row.desc } : row);
}

// 分支标记：官方 ContainImportBranch（选项/真随机分歧），外加多成员 PackID 变体组
const branchPids = new Set();
for (const row of skipFlagRows) {
  if (row.containImportBranch) branchPids.add(row.id);
}
{
  const packMembers = new Map();
  for (const row of skipOverrideRows) {
    if (row.packId == null) continue;
    if (!packMembers.has(row.packId)) packMembers.set(row.packId, new Set());
    packMembers.get(row.packId).add(row.id);
  }
  for (const members of packMembers.values()) {
    if (members.size < 2) continue;
    for (const pid of members) branchPids.add(pid);
  }
}

// 视频段落：回放文案表标注或演出索引的 Video 类型
const videoPids = new Set();
for (const row of performanceIndexRows) {
  if (row.type === "Video") videoPids.add(row.id);
}

// 官方回顾段落按演出路径的任务目录归属到 MainMission：目录号优先即主任务号，
// 否则回退 subowner（目录号恰为子任务号的情况）。
const PERFORMANCE_PATH_OWNER_RE = /Mission\/(\d+)\//;
const overrideByMainMission = new Map();
let overrideLinked = 0;
for (const row of overrideById.values()) {
  const dirMatch = PERFORMANCE_PATH_OWNER_RE.exec(performancePathTextById.get(row.id) ?? "");
  if (!dirMatch) continue;
  const dirId = Number(dirMatch[1]);
  const ownerId = missionById.has(dirId) ? dirId : subOwner.get(dirId);
  const mission = ownerId != null ? missionById.get(ownerId) : null;
  if (!mission || !MISSION_TYPES.has(mission.type)) continue;
  if (!overrideByMainMission.has(ownerId)) overrideByMainMission.set(ownerId, []);
  overrideByMainMission.get(ownerId).push(row);
  overrideLinked++;
}
log(`官方段落文案：${overrideById.size} 行（含回放文案覆盖），${overrideLinked} 行归属到 Main/Gap 任务，${branchPids.size} 行带分支标记`);

// MissionInfo 是任务到子任务、楼层和场景组的权威入口。
const subMissionsByMain = new Map();
const seenSubMission = new Set();
const missionRoot = path.join(dataRoot, "Config", "Level", "Mission");
const missionInfoFiles = listJsonFiles(missionRoot).filter(file => /MissionInfo_.*\.partial\.json$/i.test(file));
log(`扫描 MissionInfo：${missionInfoFiles.length} 个文件`);
for (let fileIndex = 0; fileIndex < missionInfoFiles.length; fileIndex++) {
  const file = missionInfoFiles[fileIndex];
  if (fileIndex === 0 || (fileIndex + 1) % 100 === 0 || fileIndex === missionInfoFiles.length - 1) {
    log(`扫描 MissionInfo ${fileIndex + 1}/${missionInfoFiles.length}：${path.basename(file)}`);
  }
  let info;
  try {
    info = readJson(file);
  } catch {
    continue;
  }
  for (const sub of info.SubMissionList ?? []) {
    if (sub.ID == null || sub.MainMissionID == null || seenSubMission.has(sub.ID)) continue;
    seenSubMission.add(sub.ID);
    if (!subMissionsByMain.has(sub.MainMissionID)) subMissionsByMain.set(sub.MainMissionID, []);
    subMissionsByMain.get(sub.MainMissionID).push(sub);
  }
}

const seedsByMission = new Map(storyMissions.map(mission => [mission.id, []]));
const seedKeysByMission = new Map(storyMissions.map(mission => [mission.id, new Set()]));
function addSeed(missionId, file) {
  if (!file || !seedsByMission.has(missionId) || !existingFile(file)) return;
  const resolved = path.resolve(file);
  const keys = seedKeysByMission.get(missionId);
  if (keys.has(resolved)) return;
  keys.add(resolved);
  seedsByMission.get(missionId).push(resolved);
}

function runtimeGroupPath(planeId, floorId, groupId) {
  if (!planeId || !floorId || !groupId) return null;
  const base = `LevelGroup_P${planeId}_F${floorId}_G${groupId}.json`;
  return path.join(dataRoot, "Config", "LevelOutput", "SharedRuntimeGroup", `Groups_P${planeId}_F${floorId}`, base);
}

log("建立任务剧情图入口");
for (let missionIndex = 0; missionIndex < storyMissions.length; missionIndex++) {
  const mission = storyMissions[missionIndex];
  if (missionIndex === 0 || (missionIndex + 1) % 25 === 0 || missionIndex === storyMissions.length - 1) {
    log(`建立入口 ${missionIndex + 1}/${storyMissions.length}：${missionLabel(mission)}`);
  }
  for (const sub of subMissionsByMain.get(mission.id) ?? []) {
    addSeed(mission.id, resolveDataPath(sub.MissionJsonPath));
    addSeed(mission.id, performancePathById.get(sub.ID));
    for (const groupId of sub.GroupIDList ?? []) {
      addSeed(
        mission.id,
        path.join(dataRoot, "Config", "Level", "GroupGraph", `F${sub.LevelFloorID}`, `Group_F${sub.LevelFloorID}_G${groupId}.json`),
      );
      addSeed(mission.id, runtimeGroupPath(sub.LevelPlaneID, sub.LevelFloorID, groupId));
    }
  }
}

// 补充文件名可权威命中 subowner 的图，解决图物理存放在兄弟任务目录的情况。
const TYPED_GRAPH_FILE_RE = /^(?:Mission_|Talk_|Act|Story|DS|CS)(\d+)\.json$/i;
for (const root of [
  path.join(dataRoot, "Config", "Level", "Mission"),
  path.join(dataRoot, "Story", "Mission"),
  path.join(dataRoot, "Story", "Discussion", "Mission"),
]) {
  const files = listJsonFiles(root);
  log(`补充类型图 ${path.relative(dataRoot, root)}：${files.length} 个 JSON`);
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex];
    if (fileIndex === 0 || (fileIndex + 1) % 500 === 0 || fileIndex === files.length - 1) {
      log(`补充类型图 ${fileIndex + 1}/${files.length}：${path.basename(file)}`);
    }
    const matched = TYPED_GRAPH_FILE_RE.exec(path.basename(file));
    if (!matched) continue;
    const encodedId = Number(matched[1]);
    const relative = path.relative(root, file).split(path.sep);
    const directoryOwner = Number(relative[0]);
    const owner = subOwner.get(encodedId) ?? (missionById.has(encodedId) ? encodedId : directoryOwner);
    addSeed(owner, file);
  }
}

const jsonCache = new Map();
function readGraph(file) {
  if (jsonCache.has(file)) return jsonCache.get(file);
  try {
    const value = readJson(file);
    jsonCache.set(file, value);
    return value;
  } catch {
    jsonCache.set(file, null);
    return null;
  }
}

const directRefsByMission = new Map();
const directRefOrdersByMission = new Map();
const graphFilesByMission = new Map();
const anchorsByMission = new Map(); // missionId -> Map(pid -> 首次锚点序)
const pidSentencesByMission = new Map(); // missionId -> Map(pid -> Set(sentenceId))

// 锚点与句子的全局遍历序号：段落落点用「锚点时刻之后的首个直接句子」定位区块
let walkCounter = 0;

function extractMissionGraph(missionId) {
  const refs = [];
  const refOrders = [];
  const refSet = new Set();
  const visited = new Set();
  const narrativeFiles = new Set();
  const anchorOrder = new Map();
  const pidSentences = new Map();
  const pidStack = [];

  const addSentence = id => {
    if (!sentenceById.has(id) || refSet.has(id)) return;
    refSet.add(id);
    refs.push(id);
    refOrders.push(walkCounter++);
    const pid = pidStack[pidStack.length - 1];
    if (pid != null) {
      if (!pidSentences.has(pid)) pidSentences.set(pid, new Set());
      pidSentences.get(pid).add(id);
    }
  };

  const recordAnchor = pid => {
    if (pid == null || anchorOrder.has(pid)) return;
    anchorOrder.set(pid, walkCounter++);
  };

  const visitFile = file => {
    if (!file) return;
    const resolved = path.resolve(file);
    if (visited.has(resolved) || !existingFile(resolved)) return;
    visited.add(resolved);
    const root = readGraph(resolved);
    if (!root) return;

    const normalized = resolved.replaceAll("\\", "/");
    if (
      /\/Config\/Level\/(?:Mission|GroupGraph|PropDialogue)\//.test(normalized) ||
      /\/Story\/(?:Mission|Discussion\/Mission)\//.test(normalized)
    ) {
      narrativeFiles.add(resolved);
    }

    // 种子直接命中演出图时按路径反查演出号，句子与锚点仍可归属到段落
    const impliedPid = pidStack.length ? null : performancePathByGraph.get(resolved);
    if (impliedPid != null) {
      recordAnchor(impliedPid);
      pidStack.push(impliedPid);
    }
    try {
      const visit = node => {
        if (Array.isArray(node)) {
          for (const item of node) visit(item);
          return;
        }
        if (!node || typeof node !== "object") return;

        const type = typeof node.$type === "string" ? node.$type : "";

        for (const [key, value] of Object.entries(node)) {
          if (/^TalkSentenceID(?:List)?$/i.test(key)) {
            for (const id of numbersOf(value)) addSentence(id);
          }
        }

        if (/PlayVoice/i.test(type)) {
          for (const [key, value] of Object.entries(node)) {
            if (/^VoiceIDs?$/i.test(key)) for (const id of numbersOf(value)) addSentence(id);
          }
        }

        if (node.PerformanceID != null && (type.includes("Performance") || node.PerformanceType != null)) {
          for (const id of numbersOf(node.PerformanceID)) {
            recordAnchor(id);
            pidStack.push(id);
            try {
              visitFile(performancePathById.get(id));
            } finally {
              pidStack.pop();
            }
          }
        }

        for (const [key, value] of Object.entries(node)) {
          if (typeof value === "string") {
            const talk = /TalkSentence[_ ](\d{6,9})/.exec(value);
            if (talk) addSentence(Number(talk[1]));
            if (/Path$|Graph$|LevelGraph$/i.test(key)) visitFile(resolveDataPath(value));
          } else if (key !== "PerformanceID") {
            visit(value);
          }
        }
      };

      visit(root);
    } finally {
      if (impliedPid != null) pidStack.pop();
    }
  };

  for (const file of seedsByMission.get(missionId) ?? []) visitFile(file);
  directRefsByMission.set(missionId, refs);
  directRefOrdersByMission.set(missionId, refOrders);
  graphFilesByMission.set(missionId, narrativeFiles);
  anchorsByMission.set(missionId, anchorOrder);
  pidSentencesByMission.set(missionId, pidSentences);
}

log("按任务遍历剧情图并收集直接句子证据");
for (let missionIndex = 0; missionIndex < storyMissions.length; missionIndex++) {
  const mission = storyMissions[missionIndex];
  log(`提取任务 ${missionIndex + 1}/${storyMissions.length}：${missionLabel(mission)}，${seedsByMission.get(mission.id)?.length ?? 0} 个入口`);
  extractMissionGraph(mission.id);
  log(`  完成 ${mission.id}：${graphFilesByMission.get(mission.id)?.size ?? 0} 个剧情图，${directRefsByMission.get(mission.id)?.length ?? 0} 个直接句子`);
}

// 显示分组：与现有速览保持一致，同任务包或同章节同名任务合并。
const parent = new Map(storyMissions.map(mission => [mission.id, mission.id]));
const find = id => {
  let root = id;
  while (parent.get(root) !== root) root = parent.get(root);
  return root;
};
const union = (a, b) => {
  const rootA = find(a);
  const rootB = find(b);
  if (rootA !== rootB) parent.set(rootA, rootB);
};

const byPack = new Map();
const byName = new Map();
const embeddedRaidMissionIds = new Set();
for (const mission of storyMissions) {
  if (!mission.name) continue;
  if (mission.missionPack) {
    const key = `${mission.chapterId}|${mission.missionPack}`;
    if (byPack.has(key)) union(byPack.get(key), mission.id);
    else byPack.set(key, mission.id);
  }
  const key = `${mission.chapterId}|${mission.name}`;
  if (byName.has(key)) union(byName.get(key), mission.id);
  else byName.set(key, mission.id);
}

// 无正式描述和图标、且进入 Raid 前后回到同一正式任务的 MainMission 是演出内部容器，
// 不应在章节中另起标题。其剧情证据仍属于承载该 Raid 的正式任务。
const raidConfigFile = path.join(dataRoot, "ExcelOutput", "RaidConfig.json");
if (existingFile(raidConfigFile)) {
  for (const raid of readJson(raidConfigFile)) {
    const ownerId = raid.MainMissionIDBefore;
    if (!ownerId || ownerId !== raid.MainMissionIDAfter || !missionById.has(ownerId)) continue;
    for (const missionId of raid.MainMissionIDList ?? []) {
      const mission = missionById.get(missionId);
      const owner = missionById.get(ownerId);
      if (
        !mission || !owner ||
        !MISSION_TYPES.has(mission.type) ||
        mission.desc || mission.icon ||
        mission.chapterId !== owner.chapterId
      ) continue;
      union(missionId, ownerId);
      embeddedRaidMissionIds.add(missionId);
    }
  }
}

for (const mission of storyMissions) {
  if (mission.name) continue;
  const prefix = String(mission.id).slice(0, 6);
  const target = storyMissions.find(other =>
    other.name && other.chapterId === mission.chapterId && String(other.id).slice(0, 6) === prefix
  );
  if (target) union(mission.id, target.id);
}

const orderIndex = new Map();
for (const chapter of chapters) {
  (chapter.missionIds ?? []).forEach((id, index) => orderIndex.set(id, index));
}

const missionGroups = new Map();
for (const mission of storyMissions) {
  const root = find(mission.id);
  if (!missionGroups.has(root)) missionGroups.set(root, []);
  missionGroups.get(root).push(mission);
}
for (const members of missionGroups.values()) {
  members.sort((a, b) => (orderIndex.get(a.id) ?? Infinity) - (orderIndex.get(b.id) ?? Infinity) || a.id - b.id);
}

// 先以直接剧情图引用判定六位句子区块属于哪些最终显示任务组。只有唯一归属的区块
// 才从字典补全，从而恢复当前数据快照里缺失的 Timeline .playable 台词。
const blockOwners = new Map();
log("计算句子区块的最终任务归属");
for (const mission of storyMissions) {
  const root = find(mission.id);
  for (const id of directRefsByMission.get(mission.id) ?? []) {
    const block = String(id).slice(0, 6);
    if (!blockOwners.has(block)) blockOwners.set(block, new Set());
    blockOwners.get(block).add(root);
  }
}

// 编码回退映射：MainMission 与其专属 TalkSentence 区块保持固定数值偏移，
// 例如 1054417 -> 154170..154179。
const encodedFallbackBlock = (missionId, digit) => {
  const block = (missionId - 1_039_000) * 10 + digit;
  if (!Number.isSafeInteger(block) || block < 100000 || block > 999999) return null;
  return String(block).padStart(6, "0");
};

function groupEvidence(members) {
  const directRefs = [];
  const directSeen = new Set();
  const files = new Set();
  for (const mission of members) {
    for (const file of graphFilesByMission.get(mission.id) ?? []) files.add(file);
    for (const id of directRefsByMission.get(mission.id) ?? []) {
      if (directSeen.has(id)) continue;
      directSeen.add(id);
      directRefs.push(id);
    }
  }

  const root = find(members[0].id);
  const refs = [];
  const seen = new Set();
  const addedBlocks = new Set();
  for (const directId of directRefs) {
    const block = String(directId).slice(0, 6);
    if (addedBlocks.has(block)) continue;
    addedBlocks.add(block);
    const owners = blockOwners.get(block);
    const ids = owners?.size === 1 && owners.has(root)
      ? sentenceIdsByBlock.get(block) ?? [directId]
      : directRefs.filter(id => String(id).startsWith(block));
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      refs.push(id);
    }
  }

  // 编码回退：DS 时代的正文（如问答游戏的题目与回答）只存在于字典，正文图未随
  // 快照发布时其区块不会有任何直接引用。按 MainMission/TalkSentence 编码偏移
  // （1054417 -> 154170..154179）认领本组任务编号范围内无引用的空白区块，
  // 不能因为任务已有部分直接证据（提问前的规则说明）就丢掉其余正文区块。
  for (const mission of members) {
    for (let digit = 0; digit <= 9; digit++) {
      const block = encodedFallbackBlock(mission.id, digit);
      if (!block || addedBlocks.has(block) || blockOwners.has(block)) continue;
      const ids = sentenceIdsByBlock.get(block);
      if (!ids) continue;
      addedBlocks.add(block);
      for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        refs.push(id);
      }
    }
  }
  return { refs, directRefs, files };
}

function splitBlocks(sentenceIds) {
  // TalkSentenceID 在同一六位区块内自带发生顺序。图可能从多个子任务/分支
  // 反复引用同一区块；先按首次出现聚合区块，再在区块内按 ID 排序，避免同一区块重复分节。
  const blocks = new Map();
  for (const id of sentenceIds) {
    const prefix = String(id).slice(0, 6);
    if (!blocks.has(prefix)) blocks.set(prefix, []);
    blocks.get(prefix).push(id);
  }
  return [...blocks.entries()].map(([prefix, ids]) => ({
    prefix,
    sentenceIds: ids.sort((a, b) => a - b),
  }));
}

const flattenText = text => {
  if (text == null) return "";
  if (typeof text === "string") return text;
  if (Array.isArray(text)) return text.map(flattenText).join("");
  if (typeof text === "object") return Object.values(text).map(flattenText).join("");
  return String(text);
};
const renderLine = text => renderRichText(richtextConverter, flattenText(text));
const missionIconUrl = icon => (icon ? icon.replace(/\{F#(.)\}\{M#(.)\}/, "$2") : null);
const descQuoteLines = desc =>
  flattenText(desc).split(/\\n|\r?\n/).map(line => line.trim()).filter(Boolean).map(renderLine);
const sanitizeName = value => (value || "未命名").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();

function groupDesc(members) {
  return members.find(mission => mission.desc)?.desc
    ?? members.find(mission => mission.descFallback)?.descFallback
    ?? "";
}

function segmentMarkerText(row) {
  const markers = [];
  if (row.performanceType === "PlayVideo" || videoPids.has(row.id)) markers.push("视频");
  if (branchPids.has(row.id)) markers.push("分支");
  return markers.length ? `（${markers.join("·")}）` : "";
}

function speakerLabel(sentence) {
  if (!sentence.name) return "";
  return renderLine(sentence.name);
}

function segmentQuoteLines(row, ordinal) {
  const lines = [`> **段落${String(ordinal).padStart(2, "0")}${segmentMarkerText(row)}**`];
  const descLines = descQuoteLines(row.desc);
  if (descLines.length) {
    lines.push(">");
    for (const line of descLines) lines.push(`> ${line}`);
  }
  return lines;
}

// 官方回顾段落的落点：有直接句子归属的段落落在其首个句子所在区块；仅有锚点的
// 段落（演出图缺失时）落在锚点时刻之后首个直接句子所在区块；两者皆无的段落排在任务小节末尾。
function missionSegments(members) {
  const rows = [];
  const seenPid = new Set();
  for (const mission of members) {
    for (const row of overrideByMainMission.get(mission.id) ?? []) {
      if (seenPid.has(row.id)) continue;
      seenPid.add(row.id);
      rows.push(row);
    }
  }
  if (!rows.length) return { byBlock: new Map(), tail: [], ordered: [] };

  const mergedAnchorOrder = new Map();
  for (const mission of members) {
    for (const [pid, order] of anchorsByMission.get(mission.id) ?? []) {
      if (!mergedAnchorOrder.has(pid)) mergedAnchorOrder.set(pid, order);
    }
  }
  const directRefs = [];
  const directOrders = [];
  const seenRef = new Set();
  const orderOfRef = new Map();
  for (const mission of members) {
    const refs = directRefsByMission.get(mission.id) ?? [];
    const orders = directRefOrdersByMission.get(mission.id) ?? [];
    for (let index = 0; index < refs.length; index++) {
      if (seenRef.has(refs[index])) continue;
      seenRef.add(refs[index]);
      directRefs.push(refs[index]);
      directOrders.push(orders[index]);
      if (!orderOfRef.has(refs[index])) orderOfRef.set(refs[index], orders[index]);
    }
  }

  const firstOrderByPid = new Map();
  for (const mission of members) {
    for (const [pid, sids] of pidSentencesByMission.get(mission.id) ?? []) {
      if (firstOrderByPid.has(pid)) continue;
      let min = null;
      for (const sid of sids) {
        const order = orderOfRef.get(sid);
        if (order != null && (min == null || order < min)) min = order;
      }
      if (min != null) firstOrderByPid.set(pid, min);
    }
  }
  for (const row of rows) {
    if (!firstOrderByPid.has(row.id)) {
      const order = mergedAnchorOrder.get(row.id);
      if (order != null) firstOrderByPid.set(row.id, order);
    }
  }

  const byBlock = new Map();
  const tail = [];
  for (const row of rows) {
    const firstOrder = firstOrderByPid.get(row.id);
    let blockKey = null;
    if (firstOrder != null) {
      for (let index = 0; index < directOrders.length; index++) {
        if (directOrders[index] > firstOrder) {
          blockKey = String(directRefs[index]).slice(0, 6);
          break;
        }
      }
    }
    if (blockKey == null) tail.push(row);
    else {
      if (!byBlock.has(blockKey)) byBlock.set(blockKey, []);
      byBlock.get(blockKey).push(row);
    }
  }
  for (const list of byBlock.values()) {
    list.sort((a, b) => (firstOrderByPid.get(a.id) ?? 0) - (firstOrderByPid.get(b.id) ?? 0) || a.id - b.id);
  }
  tail.sort((a, b) => a.id - b.id);
  // 段落最终渲染顺序：区块按首次出现顺序，区块内按段落起始时刻，最后是无证据段落
  const ordered = [];
  const seenBlockKey = new Set();
  for (const ref of directRefs) {
    const blockKey = String(ref).slice(0, 6);
    if (seenBlockKey.has(blockKey)) continue;
    seenBlockKey.add(blockKey);
    ordered.push(...(byBlock.get(blockKey) ?? []));
  }
  ordered.push(...tail);
  return { byBlock, tail, ordered };
}

function renderMissionSection(index, members) {
  const { refs, files } = groupEvidence(members);
  const displayMembers = members.filter(mission => !embeddedRaidMissionIds.has(mission.id));
  // 组内始终使用章节 missionIds 中最先出现的有名任务作为代表，
  // 不因某个 Raid 成员恰好拥有直接句子引用而改变标题 ID。
  const representative = displayMembers.find(mission => mission.name) ?? members.find(mission => mission.name) ?? members[0];
  const title = representative.name || `未命名任务 ${representative.id}`;
  const lines = [`## ${index}. ${title}（MainMission ${representative.id}${displayMembers.length > 1 ? ` 等 ${displayMembers.length} 个` : ""}）`, ""];

  const segments = missionSegments(members);
  const segmentOrdinal = new Map();
  segments.ordered.forEach((row, index) => segmentOrdinal.set(row.id, index + 1));

  // 无剧情图时仅保留 MainMission 标题与官方回顾段落，不用字典编号推断正文。
  if (!files.size) {
    for (const row of segments.ordered) {
      lines.push(...segmentQuoteLines(row, segmentOrdinal.get(row.id)), "");
    }
    return lines;
  }

  const icon = missionIconUrl(members.find(mission => mission.icon)?.icon);
  const desc = groupDesc(members);
  if (icon) {
    lines.push(`> ![${title}](${icon})`);
    if (desc) lines.push(">");
  }
  if (desc) for (const line of descQuoteLines(desc)) lines.push(`> ${line}`);
  if (displayMembers.length > 1) {
    if (icon || desc) lines.push(">");
    lines.push(`> 合并任务：${displayMembers.map(mission => mission.id).join("、")}`);
  }
  if (icon || desc || displayMembers.length > 1) lines.push("");

  for (const block of splitBlocks(refs)) {
    lines.push(`### 区块 ${block.prefix}`, "");
    for (const row of segments.byBlock.get(block.prefix) ?? []) {
      lines.push(...segmentQuoteLines(row, segmentOrdinal.get(row.id)), "");
    }
    let listRun = [];
    const flushList = () => {
      if (!listRun.length) return;
      lines.push(...listRun, "");
      listRun = [];
    };
    for (const id of block.sentenceIds) {
      const sentence = sentenceById.get(id);
      if (!sentence) continue;
      const text = renderLine(sentence.text);
      if (!text) continue;
      const speaker = speakerLabel(sentence);
      if (speaker) listRun.push(`- **${speaker}**：${text}`);
      else {
        flushList();
        lines.push(text, "");
      }
    }
    flushList();
  }

  for (const row of segments.tail) lines.push(...segmentQuoteLines(row, segmentOrdinal.get(row.id)), "");

  return lines;
}

function renderChapterDoc(chapter, groups) {
  const lines = [
    `# ${chapter.name || "未命名章节"}`,
    "",
    `> 章节 ${chapter.id} · ${chapter.chapterType ?? "?"} · 世界 ${chapter.worldId} ${worldName.get(chapter.worldId) ?? ""}`,
  ];
  if (chapter.stageName) lines.push(`> ${renderLine(chapter.stageName)}`);
  lines.push("");
  groups.forEach((group, index) => {
    if (index) lines.push("---", "");
    lines.push(...renderMissionSection(index + 1, group.members));
  });
  return lines.join("\n");
}

function cleanOutputRoot() {
  if (!fs.existsSync(outRoot)) return;
  for (const entry of fs.readdirSync(outRoot)) {
    const target = path.join(outRoot, entry);
    let stat;
    try {
      stat = fs.statSync(target);
    } catch {
      continue;
    }
    if (!stat.isDirectory() || !/^\d+_/.test(entry)) continue;
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  }
}

log(`清理输出目录 ${path.relative(pkgRoot, outRoot)}`);
cleanOutputRoot();
fs.mkdirSync(outRoot, { recursive: true });

let chaptersWritten = 0;
let groupsWritten = 0;
let groupsWithGraph = 0;
let groupsWithDirectText = 0;
let directSentences = 0;
let expandedSentences = 0;

const chaptersWithStory = chapters
  .filter(chapter => (chapter.missionIds ?? []).some(id => MISSION_TYPES.has(missionById.get(id)?.type)))
  .sort((a, b) => (a.worldId ?? 0) - (b.worldId ?? 0) || (a.order ?? 0) - (b.order ?? 0) || a.id - b.id);

for (let chapterIndex = 0; chapterIndex < chaptersWithStory.length; chapterIndex++) {
  const chapter = chaptersWithStory[chapterIndex];
  const chapterGroups = [];
  const seenRoots = new Set();
  for (const id of chapter.missionIds ?? []) {
    const mission = missionById.get(id);
    if (!mission || !MISSION_TYPES.has(mission.type)) continue;
    const root = find(id);
    if (seenRoots.has(root)) continue;
    seenRoots.add(root);
    const members = missionGroups.get(root);
    // 与现有速览结构一致：无名内部占位组不生成章节；有 MainMission 标题但无图的组仍保留标题占位。
    if (!members.some(member => member.name)) continue;
    chapterGroups.push({ root, members });
  }

  const typeCounts = new Map();
  log(`生成章节 ${chapterIndex + 1}/${chaptersWithStory.length}：${chapter.id} ${chapter.name || "（无标题）"}，${chapterGroups.length} 个任务组`);
  for (let groupIndex = 0; groupIndex < chapterGroups.length; groupIndex++) {
    const group = chapterGroups[groupIndex];
    for (const mission of group.members) typeCounts.set(mission.type, (typeCounts.get(mission.type) ?? 0) + 1);
    const evidence = groupEvidence(group.members);
    log(`  任务 ${groupIndex + 1}/${chapterGroups.length}：${group.members.map(missionLabel).join(" / ")}，图 ${evidence.files.size}，直接 ${evidence.directRefs.length}，补全后 ${evidence.refs.length} 句`);
    groupsWritten++;
    if (evidence.files.size) groupsWithGraph++;
    if (evidence.directRefs.length) groupsWithDirectText++;
    directSentences += evidence.directRefs.length;
    expandedSentences += evidence.refs.length;
  }
  const docType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const worldDir = path.join(outRoot, `${chapter.worldId}_${sanitizeName(worldName.get(chapter.worldId))}`);
  fs.mkdirSync(worldDir, { recursive: true });
  const file = path.join(worldDir, `${chapter.id}_${docType}_${sanitizeName(chapter.name)}.md`);
  fs.writeFileSync(file, renderChapterDoc(chapter, chapterGroups), "utf8");
  chaptersWritten++;
}

assert.ok(chaptersWritten >= 34, `expected at least 34 Main/Gap chapters, got ${chaptersWritten}`);
assert.ok(embeddedRaidMissionIds.has(1043712), "1043712 was not recognized as an embedded Raid mission");
assert.ok(embeddedRaidMissionIds.has(1043714), "1043714 was not recognized as an embedded Raid mission");
assert.equal(find(1043712), find(1043708), "1043712 should be merged into its Raid owner 1043708");
assert.equal(find(1043714), find(1043710), "1043714 should be merged into its Raid owner 1043710");
assert.ok(groupEvidence(missionGroups.get(find(1043710))).refs.includes(146790708), "1043710 Timeline block lost 146790708");
assert.ok(groupEvidence(missionGroups.get(find(1043710))).refs.includes(146790805), "1043710 Timeline block lost 146790805");

console.log(`chapters: ${chaptersWritten}`);
console.log(`mission groups: ${groupsWritten} (with graph: ${groupsWithGraph}, with direct text: ${groupsWithDirectText})`);
console.log(`direct graph sentences: ${directSentences}`);
console.log(`sentences after unique-block completion: ${expandedSentences}`);
console.log(`104010 Raid redirects: 1043712 -> 1043708, 1043714 -> 1043710`);
console.log(`files written under ${path.relative(pkgRoot, outRoot)}`);
