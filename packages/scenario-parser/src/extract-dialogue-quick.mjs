/**
 * Tier 1 快速浏览提取器：为全部主线任务（type=Main）与开拓续闻（type=Gap）生成速览 markdown。
 *
 * 输入（均为已解析/上游数据）：
 *   - packages/cli-hsr/output/CHS/mission/graph.json        任务图（章节/任务结构、剧情拓扑排序、图标/总结/descFallback）
 *   - packages/cli-hsr/output/CHS/mission/worlds.json       世界名
 *   - packages/cli-hsr/output/CHS/mission/subowner.json     子任务→主任务归属映射（源头扫描 MissionInfo 生成）
 *   - packages/cli-hsr/output/CHS/scenario/talksentence.json 台词字典
 *   - ./data（extern/TurnBasedGameData）下演出图：
 *       Config/Level/Mission/<id>/**   （Act 对话 / Talk 跳板 / Mission_*.json 走图旁白）
 *       Story/Mission/<id>/**          （Story/D 演出）
 *       Story/Discussion/Mission/<id>/**（DS 时代：正文由 Timeline 播放，图内只有锚点/选项）
 *
 * 演出图文件归属（关键修正：文件可能物理存放在兄弟任务目录下，如 1020702 的全部图在 1020701/ 内）：
 *   1. subowner.json 提供 子任务ID → MainMissionID 权威映射（cli-hsr 源头扫描 MissionInfo 生成）；
 *   2. 文件名带子任务/演出号（Mission_/Talk_/Act/Story/DS/CS + 数字）且能命中映射 → 映射归属方；
 *   3. 其余文件 → 所在目录的任务；归属方不是 Main/Gap 的文件不参与归属。
 *
 * 句子→任务归属（句子级，非块级；同一 6 位前缀块可被多任务交错引用）：
 *   1) 引用计数多数票，优先「任务 ID 前 6 位 == 句子块前缀」的亲和候选（消除回顾/走图引用抢票）；
 *   2) 块内插值补洞：前导段→首引用者，尾随段→末引用者，两侧同主→该主，两侧异主→块多数主
 *      （DS 时代正文句只在字典中，锚点间的正文由此补齐）；
 *   3) 编码回退：MainMission 与其专属 TalkSentence 区块保持固定数值偏移
 *      （1054520 -> 155200..155209）；任务无直接引用时整段认领，有直接引用时仅认领
 *      其中未被任何剧情图引用的区块（DS 时代正文图缺失的问答正文等）。
 *
 * 显示分组（消除游戏内部变体造成的空任务）：
 *   同任务包（missionPack）或同章节同名（Raid 镜像 / 自动续行段）合并为一个显示单元；
 *   无名占位任务并入同章节同 ID 前 6 位的正片组，无法并入且无台词的丢弃。
 *   有台词的组渲染完整小节；无台词的组收进章节末尾附录表，不再各占一个小节。
 *
 * 简介：任务 desc（ChronicleConclusion/EndmostChronicle）优先；缺失时用源头生成的 descFallback
 * （首个带描述子任务的 DescrptionText，游戏内任务栏描述）。任务图标无回退源（CDN 资产缺口，见 report）。
 * 官方回顾段落（PerformanceSkipOverride，cli-hsr 导出）按演出路径归属任务，全部文案
 * 按演出号升序插在任务小节头部的引用块中。
 *
 * 文本预渲染：台词、说话人与描述经 unity-richtext（Node 运行时移植，见 src/lib/unity-richtext-node.mjs）
 * 渲染为 HTML —— {NICKNAME}、{F#}{M#} 性别、<color>/<unbreak>/{RUBY_B#} 注音等自动处理，
 * 性别默认男性（playerGender=M），与任务图标默认取男性版一致。
 *
 * 已知限制：无分支结构、选项摊平、部分旁白/全屏文本顺序有偏差；图缺失且无回退规则的任务无法归属台词。
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
const outRoot = path.join(pkgRoot, "output", "dialogue");
const LOG_PREFIX = "[dialogue:v1]";
const log = message => console.log(`${LOG_PREFIX} ${message}`);
const missionLabel = mission => `${mission.id} ${mission.name || "（无标题）"}`;

log("读取任务图、世界和台词字典");

// 纳入范围：主线 Main + 开拓续闻 Gap
const MISSION_TYPES = new Set(["Main", "Gap"]);
// 富文本插值变量：{NICKNAME}、性别分支（默认男性，与任务图标取男性版一致）、{TEXTJOIN#n} 文本拼接
const textjoinRows = JSON.parse(fs.readFileSync(path.join(cliHsrChsRoot, "textjoin.json"), "utf8"));
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

const readJson = p => JSON.parse(fs.readFileSync(p, "utf8"));

// --- 读入三层输入 ----------------------------------------------------------------

const graph = readJson(path.join(cliHsrChsRoot, "mission", "graph.json"));
const worlds = readJson(path.join(cliHsrChsRoot, "mission", "worlds.json"));
const dictionary = readJson(path.join(cliHsrChsRoot, "scenario", "talksentence.json"));

const worldName = new Map(worlds.map(w => [w.id, w.name || "未命名世界"]));
const missionNodes = graph.nodes.filter(n => n.data.kind === "mission");
const missionById = new Map(missionNodes.map(n => [n.data.id, n.data]));
const storyMissions = missionNodes.filter(n => MISSION_TYPES.has(n.data.type)).map(n => n.data);
const chapters = graph.combos.filter(c => c.data.kind === "chapter").map(c => c.data);
log(`输入就绪：${storyMissions.length} 个 Main/Gap 任务，${chapters.length} 个章节，${dictionary.length} 条台词记录`);

// 字典：仅 9 位主句（7/8 位为说话人定义行）；空文本行（说话人定义/未启用句）不参与展示
// 区块 999999 为开发占位内容（「开发中，敬请期待」等），排除。
const EXCLUDED_BLOCKS = new Set(["999999"]);
const sentenceById = new Map();
const sentencesByBlock = new Map();
for (const row of dictionary) {
  const id = String(row.id);
  if (id.length !== 9 || !row.text) continue;
  const block = id.slice(0, 6);
  if (EXCLUDED_BLOCKS.has(block)) continue;
  sentenceById.set(row.id, row);
  if (!sentencesByBlock.has(block)) sentencesByBlock.set(block, []);
  sentencesByBlock.get(block).push(row.id);
}
for (const arr of sentencesByBlock.values()) arr.sort((a, b) => a - b);

// --- 演出图文件归属扫描 -------------------------------------------------------------
//
// 文件可能物理存放在兄弟任务目录下（MissionInfo_*.partial.json 的 MissionJsonPath 为准，
// 如 1020702 的全部 Mission_/Act/Story 文件都在 1020701/ 目录内），因此按
// 「文件名编码的子任务号 → subowner 映射」优先归属，目录归属兜底。
// 归属映射由 cli-hsr 源头（MainMissionExtractor.loadSubOwnership）生成，此处不再重扫 Config。

const subOwner = new Map(readJson(path.join(cliHsrChsRoot, "mission", "subowner.json"))); // 子任务ID -> MainMissionID

// --- 官方回顾段落（PerformanceSkipOverride/ReplayOverride，由 cli-hsr 导出并解析文案） --
//
// 每行把一个 PerformanceID 映射到官方撰写的剧情回顾/跳过文案；ReplayOverride 是回放
// 界面的展示文案，与 SkipOverride 共存时覆盖之。v1 不做演出锚点定位，全部文案按演出号
// 升序插在任务小节头部。归属按演出路径的任务目录判定：目录号优先视为主任务号，否则
// 回退 subowner（目录号恰为子任务号的情况）。
log("读取官方段落文案与演出索引");
const performanceIndexRows = readJson(path.join(cliHsrChsRoot, "scenario", "performance", "index.json"));
const performancePathTextById = new Map(performanceIndexRows.map(row => [row.id, row.path]));
const skipOverrideRows = readJson(path.join(cliHsrChsRoot, "scenario", "performance", "skip-override.json"));
const replayOverrideRows = readJson(path.join(cliHsrChsRoot, "scenario", "performance", "replay-override.json"));
const skipFlagRows = readJson(path.join(cliHsrChsRoot, "scenario", "performance", "skip-flag.json"));

const overrideById = new Map();
for (const row of skipOverrideRows) {
  if (row.desc) overrideById.set(row.id, row);
}
for (const row of replayOverrideRows) {
  if (!row.desc) continue;
  const existing = overrideById.get(row.id);
  overrideById.set(row.id, existing ? { ...existing, desc: row.desc } : row);
}

// 分支标记：官方 ContainImportBranch + 多成员 PackID 变体组；视频段落：回放文案表
// 标注或演出索引的 Video 类型
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
const videoPids = new Set();
for (const row of performanceIndexRows) {
  if (row.type === "Video") videoPids.add(row.id);
}

const overrideByMainMission = new Map(); // MainMissionID -> [{id, desc, ...}]
let overrideLinked = 0;
for (const row of overrideById.values()) {
  const dirMatch = /Mission\/(\d+)\//.exec(performancePathTextById.get(row.id) ?? "");
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

function collectSentenceRefs(node, out) {
  if (Array.isArray(node)) {
    for (const item of node) collectSentenceRefs(item, out);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (/TalkSentenceID$/i.test(key) && typeof value === "number") {
      out.push(value);
    } else if (typeof value === "string") {
      const m = /TalkSentence[_ ](\d{6,9})/.exec(value);
      if (m) out.push(Number(m[1]));
    } else {
      collectSentenceRefs(value, out);
    }
  }
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { recursive: true })) {
    const p = path.join(dir, entry);
    let st;
    try {
      st = fs.statSync(p);
    } catch {
      continue;
    }
    if (st.isFile() && p.endsWith(".json")) out.push(p);
  }
  return out;
}

// 文件名携带子任务/演出号的图文件：归属优先走 MissionInfo 映射
const TYPED_GRAPH_FILE_RE = /^(?:Mission_|Talk_|Act|Story|DS|CS)(\d+)\.json$/i;

const sentenceRefs = new Map(); // sentenceId -> Map(missionId -> count)
const blockRefs = new Map(); // block -> Map(missionId -> count)
const graphFileCount = new Map(); // missionId -> 归属文件数（注释/附录说明用）
const ownRefCount = new Map(); // missionId -> 去重引用句数（附录说明用）

{
  const scanRoots = [
    path.join(dataRoot, "Config", "Level", "Mission"),
    path.join(dataRoot, "Story", "Mission"),
    path.join(dataRoot, "Story", "Discussion", "Mission"),
  ];
  for (const root of scanRoots) {
    if (!fs.existsSync(root)) continue;
    const entries = fs.readdirSync(root).filter(entry => /^\d+$/.test(entry));
    log(`扫描演出图目录 ${path.relative(dataRoot, root)}：${entries.length} 个任务目录`);
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
      const entry = entries[entryIndex];
      if (entryIndex === 0 || (entryIndex + 1) % 25 === 0 || entryIndex === entries.length - 1) {
        log(`扫描演出图 ${entryIndex + 1}/${entries.length}：任务目录 ${entry}`);
      }
      const dirOwner = Number(entry);
      for (const file of listJsonFiles(path.join(root, entry))) {
        let owner = dirOwner;
        const typed = TYPED_GRAPH_FILE_RE.exec(path.basename(file));
        if (typed) {
          const mapped = subOwner.get(Number(typed[1]));
          if (mapped !== undefined) owner = mapped;
        }
        const mission = missionById.get(owner);
        if (!mission || !MISSION_TYPES.has(mission.type)) continue;
        const refs = [];
        try {
          collectSentenceRefs(readJson(file), refs);
        } catch {
          // 单个图文件损坏不阻断全量提取
        }
        graphFileCount.set(owner, (graphFileCount.get(owner) || 0) + 1);
        let distinct = 0;
        for (const ref of refs) {
          if (String(ref).length !== 9) continue;
          const seen = sentenceRefs.get(ref);
          if (!seen || !seen.has(owner)) distinct++;
          if (!sentenceRefs.has(ref)) sentenceRefs.set(ref, new Map());
          const sm = sentenceRefs.get(ref);
          sm.set(owner, (sm.get(owner) || 0) + 1);
          const block = String(ref).slice(0, 6);
          if (!blockRefs.has(block)) blockRefs.set(block, new Map());
          const bm = blockRefs.get(block);
          bm.set(owner, (bm.get(owner) || 0) + 1);
        }
        if (distinct) {
          ownRefCount.set(owner, (ownRefCount.get(owner) || 0) + distinct);
        }
      }
    }
  }
}
log(`演出图扫描完成：${graphFileCount.size} 个任务拥有图文件，${sentenceRefs.size} 个句子存在直接引用`);

// --- 句子归属：亲和优先多数票 + 块内插值 + 编码回退 ----------------------------------

// 多数票，但「任务 ID 前 6 位 == 句子块前缀」的亲和候选优先：
// 跨任务的回顾/走图引用（如 1000401 的 Act 引用 200010xxx）不与块主人抢票。
function majorityOf(refMap, block) {
  let best = null;
  let bestAffinity = false;
  for (const [missionId, count] of refMap) {
    const affinity = String(missionId).slice(0, 6) === block;
    if (
      best === null ||
      (affinity && !bestAffinity) ||
      (affinity === bestAffinity && (count > best[1] || (count === best[1] && missionId < best[0])))
    ) {
      best = [missionId, count];
      bestAffinity = affinity;
    }
  }
  return best[0];
}

const ownerBySentence = new Map(); // sentenceId -> missionId
let interpolated = 0;

for (const [block, sids] of sentencesByBlock) {
  const blockMajority = blockRefs.get(block);
  if (!blockMajority) continue; // 无任何主线引用的块：非主线内容或图缺失，交由回退规则
  const majorityMission = majorityOf(blockMajority, block);
  const owners = sids.map(sid => {
    const refs = sentenceRefs.get(sid);
    return refs ? majorityOf(refs, block) : null;
  });
  let prev = null;
  for (let i = 0; i < sids.length; i++) {
    if (owners[i]) {
      ownerBySentence.set(sids[i], owners[i]);
      prev = owners[i];
      continue;
    }
    let next = null;
    for (let j = i + 1; j < sids.length; j++) {
      if (owners[j]) {
        next = owners[j];
        break;
      }
    }
    // 两侧同主（或仅一侧存在）→ 该主；两侧异主 → 块多数主
    const pick = prev && (!next || prev === next) ? prev : (next && !prev ? next : majorityMission);
    ownerBySentence.set(sids[i], pick);
    interpolated++;
  }
}

// 无图回退编码：MainMission 与其专属 TalkSentence 区块保持固定数值偏移。
// 例如 1054520 -> 155200..155209，1054600 -> 156000..156009。
const encodedFallbackBlock = (missionId, digit) => {
  const block = (missionId - 1_039_000) * 10 + digit;
  if (!Number.isSafeInteger(block) || block < 100000 || block > 999999) return null;
  return String(block).padStart(6, "0");
};

// 不限制具体版本任务范围；只认领确实存在、无剧情图引用且候选任务唯一的区块。
// 有直接引用的任务同样参与认领：DS 时代的正文（如问答游戏的题目与回答）只存在于
// 字典，正文图未随快照发布时其区块不会被任何图引用，不能因为任务已有部分直接
// 证据（提问前的规则说明）就丢掉编号范围内的其余正文区块。
const fallbackClaims = [];
const fallbackCandidates = new Map(); // block -> Set<missionId>
for (const mission of storyMissions) {
  for (let digit = 0; digit <= 9; digit++) {
    const block = encodedFallbackBlock(mission.id, digit);
    if (!block) continue;
    if (blockRefs.has(block) || !sentencesByBlock.has(block)) continue;
    if (!fallbackCandidates.has(block)) fallbackCandidates.set(block, new Set());
    fallbackCandidates.get(block).add(mission.id);
  }
}
for (const [block, candidates] of fallbackCandidates) {
  if (candidates.size !== 1) {
    log(`跳过歧义编码回退：区块 ${block} 候选任务 ${[...candidates].join("、")}`);
    continue;
  }
  const missionId = candidates.values().next().value;
  for (const sid of sentencesByBlock.get(block)) ownerBySentence.set(sid, missionId);
  const claim = { mission: missionId, block, sentences: sentencesByBlock.get(block).length };
  fallbackClaims.push(claim);
  log(`编码回退：任务 ${missionLabel(missionById.get(missionId))} <- 区块 ${block}（${claim.sentences} 句）`);
}
log(`句子归属完成：${ownerBySentence.size} 句，其中编码回退 ${fallbackClaims.reduce((n, claim) => n + claim.sentences, 0)} 句`);

// --- 显示分组：同包 / 同章节同名 / 无名并入同前缀族 -----------------------------------

const parent = new Map(storyMissions.map(m => [m.id, m.id]));
const find = id => {
  let root = id;
  while (parent.get(root) !== root) root = parent.get(root);
  return root;
};
const union = (a, b) => {
  const ra = find(a);
  const rb = find(b);
  if (ra !== rb) parent.set(ra, rb);
};
{
  const byPack = new Map();
  const byName = new Map();
  for (const mission of storyMissions) {
    if (!mission.name) continue; // 无名占位任务随后按 ID 前缀并入正片组
    if (mission.missionPack) {
      const key = `${mission.chapterId}|${mission.missionPack}`;
      const first = byPack.get(key);
      if (first) union(first, mission.id);
      else byPack.set(key, mission.id);
    }
    const nameKey = `${mission.chapterId}|${mission.name}`;
    const firstNamed = byName.get(nameKey);
    if (firstNamed) union(firstNamed, mission.id);
    else byName.set(nameKey, mission.id);
  }
}
// 无名任务并入同章节、同 ID 前 6 位的正片任务（自动续行段/Raid 镜像等内部变体）
{
  const fallbackOwnerFor = new Map(); // 无名任务 id -> 可并入的正片任务 id
  for (const mission of storyMissions) {
    if (mission.name) continue;
    const prefix = String(mission.id).slice(0, 6);
    let target = null;
    for (const other of storyMissions) {
      if (!other.name || other.chapterId !== mission.chapterId) continue;
      if (String(other.id).slice(0, 6) !== prefix) continue;
      if (!target || other.id < target) target = other.id;
    }
    if (target) fallbackOwnerFor.set(mission.id, target);
  }
  for (const [id, target] of fallbackOwnerFor) union(id, target);
}

const missionGroups = new Map(); // groupId(根任务 id) -> 成员任务列表（按章节拓扑序）
for (const mission of storyMissions) {
  const root = find(mission.id);
  if (!missionGroups.has(root)) missionGroups.set(root, []);
  missionGroups.get(root).push(mission);
}
// 组内按章节拓扑顺序稳定排序
const orderIndex = new Map();
for (const chapter of chapters) {
  (chapter.missionIds ?? []).forEach((id, i) => orderIndex.set(id, i));
}
for (const members of missionGroups.values()) {
  members.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0) || a.id - b.id);
}

const sentencesOf = new Map(); // missionId -> sentenceIds
for (const [sid, missionId] of ownerBySentence) {
  if (!sentencesOf.has(missionId)) sentencesOf.set(missionId, []);
  sentencesOf.get(missionId).push(sid);
}
// 组级句子切分为「连续同前缀段」
const blocksOfGroup = new Map(); // groupId -> [{ prefix, sentenceIds }]
for (const [groupId, members] of missionGroups) {
  const sids = members.flatMap(m => sentencesOf.get(m.id) ?? []);
  if (!sids.length) continue;
  sids.sort((a, b) => a - b);
  const groups = [];
  let current = null;
  for (const sid of sids) {
    const prefix = String(sid).slice(0, 6);
    if (!current || current.prefix !== prefix) {
      current = { prefix, sentenceIds: [] };
      groups.push(current);
    }
    current.sentenceIds.push(sid);
  }
  blocksOfGroup.set(groupId, groups);
}

// --- 渲染 markdown ----------------------------------------------------------------

const FILENAME_REPLACE = { "\\": "＼", "/": "／", ":": "：", "*": "＊", "?": "？", "\"": "＂", "<": "＜", ">": "＞", "|": "｜" };

const sanitizeName = name =>
  String(name || "")
    .replace(/[\\/:*?"<>|]/g, ch => FILENAME_REPLACE[ch])
    .replace(/[\s.]+$/, "")
    .trim() || "未命名";

const flattenText = text =>
  String(text ?? "")
    .replaceAll("\r\n", " ")
    .replaceAll("\n", " ");

// 预渲染为 HTML：{NICKNAME}/{F#}{M#} 性别、<color>/<unbreak>/ruby 等由 unity-richtext 处理
const renderLine = text => renderRichText(richtextConverter, flattenText(text));

// 任务图标：动态性别占位 {F#x}{M#y}（替换字符跟随桶内实际文件名大小写）默认取男性版本
const missionIconUrl = icon => (icon ? icon.replace(/\{F#(.)\}\{M#(.)\}/, "$2") : null);

// 任务描述里的换行以字面 \n 编码，按行拆成多条 blockquote（每行经富文本预渲染）
const descQuoteLines = desc =>
  String(desc ?? "")
    .split(/\\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(renderLine);

function speakerLabel(sentence) {
  if (!sentence?.name) return null;
  return renderLine(sentence.name);
}

// 组简介：成员 desc（ChronicleConclusion/Endmost）优先，缺失用源头生成的 descFallback（首个子任务描述）
function groupDesc(members) {
  for (const mission of members) {
    if (mission.desc) return mission.desc;
  }
  for (const mission of members) {
    if (mission.descFallback) return mission.descFallback;
  }
  return null;
}

function emptyGroupReason(members) {
  if (members.some(m => fallbackClaims.some(c => c.mission === m.id))) {
    return "演出图未随快照发布，句子块按编号规则回退认领（不应出现在无台词组）";
  }
  const ownFiles = members.reduce((n, m) => n + (graphFileCount.get(m.id) || 0), 0);
  const ownRefs = members.reduce((n, m) => n + (ownRefCount.get(m.id) || 0), 0);
  if (ownRefs > 0) return "演出图引用的台词均被其他任务优先归属";
  if (ownFiles > 0) return "有演出图但无台词引用（纯战斗/演出任务，或台词由其他任务承载）";
  if (members.every(m => m.isInRaid)) return "Raid 变体，复用正片演出";
  return "演出图未随当前数据快照发布";
}

// 组内官方回顾段落：成员任务关联的去重文案，按演出号升序
function missionSegments(members) {
  const segs = [];
  const seenPid = new Set();
  for (const member of members) {
    for (const row of overrideByMainMission.get(member.id) ?? []) {
      if (seenPid.has(row.id)) continue;
      seenPid.add(row.id);
      segs.push(row);
    }
  }
  return segs.sort((a, b) => a.id - b.id);
}

function segmentMarkerText(row) {
  const markers = [];
  if (row.performanceType === "PlayVideo" || videoPids.has(row.id)) markers.push("视频");
  if (branchPids.has(row.id)) markers.push("分支");
  return markers.length ? `（${markers.join("·")}）` : "";
}

function renderMissionSection(index, members, blocks) {
  // 代表成员优先取有台词者（变体任务常排在正片前面且无台词）
  const rep = members.find(m => sentencesOf.get(m.id)?.length) ?? members[0];
  const title = rep.name || `未命名任务 ${rep.id}`;
  const lines = [];
  lines.push(`## ${index}. ${title}（MainMission ${rep.id}${members.length > 1 ? ` 等 ${members.length} 个` : ""}）`);
  lines.push("");
  const icon = missionIconUrl(members.find(m => m.icon)?.icon);
  const desc = groupDesc(members);
  if (icon) {
    lines.push(`> ![${title}](${icon})`);
    lines.push(">");
  }
  if (desc) {
    for (const line of descQuoteLines(desc)) lines.push(`> ${line}`);
  } else {
    lines.push("> （图内未提供任务描述）");
  }
  if (members.length > 1) {
    lines.push(">");
    lines.push(`> 合并任务：${members.map(m => m.id).join("、")}`);
  }
  const segs = missionSegments(members);
  if (segs.length) {
    lines.push(">");
    lines.push(`> **段落（${segs.length}）**`);
    segs.forEach((seg, segIndex) => {
      const label = `段落${String(segIndex + 1).padStart(2, "0")}${segmentMarkerText(seg)}`;
      lines.push(">");
      lines.push(`> **${label}**　${descQuoteLines(seg.desc).join(" ")}`);
    });
  }
  lines.push("");
  if (members.some(m => fallbackClaims.some(c => c.mission === m.id))) {
    lines.push("> 本任务演出图未随当前数据快照发布，句子块按 MainMission/TalkSentence 编码关系回退认领。");
    lines.push("");
  }
  for (const block of blocks) {
    lines.push(`### 区块 ${block.prefix}`);
    lines.push("");
    // 有说话人的台词输出为连续无序列表；旁白/无说话人行保持独立段落
    let listRun = [];
    const flushList = () => {
      if (!listRun.length) return;
      lines.push(...listRun);
      lines.push("");
      listRun = [];
    };
    for (const sid of block.sentenceIds) {
      const row = sentenceById.get(sid);
      if (!row) continue;
      const rendered = renderLine(row.text);
      if (!rendered) continue; // 预渲染后为空（如仅含未选中性别分支）的句子跳过
      const speaker = speakerLabel(row);
      if (speaker) {
        listRun.push(`- **${speaker}**：${rendered}`);
      } else {
        flushList();
        lines.push(rendered);
        lines.push("");
      }
    }
    flushList();
  }
  return lines;
}

function renderChapterDoc(chapter, sectionGroups, appendixGroups) {
  const lines = [];
  lines.push(`# ${chapter.name || "未命名章节"}`);
  lines.push("");
  lines.push(`> 章节 ${chapter.id} · ${chapter.chapterType ?? "?"} · 世界 ${chapter.worldId} ${worldName.get(chapter.worldId) ?? ""}`);
  if (chapter.stageName) lines.push(`> ${renderLine(chapter.stageName)}`);
  lines.push("");
  sectionGroups.forEach((group, index) => {
    if (index > 0) {
      lines.push("---");
      lines.push("");
    }
    lines.push(...renderMissionSection(index + 1, group.members, group.blocks));
  });
  if (appendixGroups.length) {
    if (sectionGroups.length) {
      lines.push("---");
      lines.push("");
    }
    lines.push(`## 附：本章无台词任务（${appendixGroups.length}）`);
    lines.push("");
    lines.push("| 任务 | MainMissionID | 说明 |");
    lines.push("| --- | --- | --- |");
    for (const group of appendixGroups) {
      const title = group.members.find(m => m.name)?.name || "未命名";
      lines.push(`| ${renderLine(title)} | ${group.members.map(m => m.id).join("、")} | ${emptyGroupReason(group.members)} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// --- 落盘 -------------------------------------------------------------------------

// 清空旧产物：只删除本工具生成的世界目录（数字前缀），保留手工放入的压缩包等文件；
// Windows 下目录可能被占用（索引器/终端句柄），整树删除失败时退化为逐文件清理
function cleanOutputRoot() {
  if (!fs.existsSync(outRoot)) return;
  for (const entry of fs.readdirSync(outRoot)) {
    const p = path.join(outRoot, entry);
    let st;
    try {
      st = fs.statSync(p);
    } catch {
      continue;
    }
    if (!st.isDirectory() || !/^\d+_/.test(entry)) continue;
    try {
      fs.rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      continue;
    } catch {
      // fallthrough
    }
    for (const f of fs.readdirSync(p, { recursive: true })) {
      const fp = path.join(p, f);
      try {
        if (fs.statSync(fp).isFile()) fs.rmSync(fp, { force: true });
      } catch {
        // 文件被锁时保留，随后同名写入会覆盖
      }
    }
  }
}

log(`清理输出目录 ${path.relative(pkgRoot, outRoot)}`);
cleanOutputRoot();
fs.mkdirSync(outRoot, { recursive: true });

const writtenFiles = [];
let chaptersWritten = 0;
let groupsRendered = 0;
let groupsWithDialogue = 0;
let missionsInSection = 0;
let missionsInAppendix = 0;
let missionsDropped = 0;
let sentencesRendered = 0;

// 章节→文档：目录按世界，文件名 {chapterId}_{任务类型}_{章节名}.md
// （类型取章节内纳入任务的主导类型；当前数据中 Main/Gap 章节各自纯净不混排）
const chaptersWithStory = chapters
  .filter(ch => (ch.missionIds ?? []).some(id => MISSION_TYPES.has(missionById.get(id)?.type)))
  .sort((a, b) => (a.worldId ?? 0) - (b.worldId ?? 0) || (a.order ?? 0) - (b.order ?? 0) || a.id - b.id);

for (let chapterIndex = 0; chapterIndex < chaptersWithStory.length; chapterIndex++) {
  const chapter = chaptersWithStory[chapterIndex];
  // 分组联合键均含 chapterId，组不会跨章节；每章按组内首个成员在章节拓扑中的出现顺序展开
  const chapterGroups = [];
  for (const id of chapter.missionIds ?? []) {
    const mission = missionById.get(id);
    if (!mission || !MISSION_TYPES.has(mission.type)) continue;
    const root = find(id);
    if (chapterGroups.some(g => g.root === root)) continue;
    const members = missionGroups.get(root);
    chapterGroups.push({ root, members, blocks: blocksOfGroup.get(root) ?? [] });
  }
  const sectionGroups = chapterGroups.filter(g => g.blocks.length);
  const appendixGroups = chapterGroups.filter(g => !g.blocks.length && g.members.some(m => m.name));
  log(`生成章节 ${chapterIndex + 1}/${chaptersWithStory.length}：${chapter.id} ${chapter.name || "（无标题）"}，${chapterGroups.length} 个任务组`);
  chapterGroups.forEach((group, groupIndex) => {
    const sentenceCount = group.blocks.reduce((count, block) => count + block.sentenceIds.length, 0);
    log(`  任务 ${groupIndex + 1}/${chapterGroups.length}：${group.members.map(missionLabel).join(" / ")}，${group.blocks.length} 个区块，${sentenceCount} 句`);
  });
  // 无名且无台词的内部占位任务：丢弃
  let chapterDropped = 0;
  for (const g of chapterGroups) {
    if (!g.blocks.length && !g.members.some(m => m.name)) chapterDropped += g.members.length;
  }
  missionsDropped += chapterDropped;

  const missionList = (chapter.missionIds ?? [])
    .map(id => missionById.get(id))
    .filter(m => MISSION_TYPES.has(m?.type));
  const typeCounts = new Map();
  for (const mission of missionList) typeCounts.set(mission.type, (typeCounts.get(mission.type) || 0) + 1);
  const docType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const worldDir = path.join(outRoot, `${chapter.worldId}_${sanitizeName(worldName.get(chapter.worldId))}`);
  fs.mkdirSync(worldDir, { recursive: true });
  // 章节 ID 全局唯一，文件名不会冲突
  const filePath = path.join(worldDir, `${chapter.id}_${docType}_${sanitizeName(chapter.name)}.md`);
  fs.writeFileSync(filePath, renderChapterDoc(chapter, sectionGroups, appendixGroups), "utf8");
  writtenFiles.push(path.relative(pkgRoot, filePath));
  chaptersWritten++;
  groupsRendered += sectionGroups.length + appendixGroups.length;
  groupsWithDialogue += sectionGroups.length;
  for (const group of sectionGroups) {
    missionsInSection += group.members.length;
    sentencesRendered += group.blocks.reduce((n, b) => n + b.sentenceIds.length, 0);
  }
  for (const group of appendixGroups) {
    missionsInAppendix += group.members.length;
  }
}

// --- 断言与摘要 -------------------------------------------------------------------

assert.ok(chaptersWritten >= 34, `expected ≥34 chapters owning Main/Gap missions, got ${chaptersWritten}`);
assert.equal(
  missionsInSection + missionsInAppendix + missionsDropped,
  storyMissions.length,
  "every Main/Gap mission must be rendered, appended or explicitly dropped"
);
assert.equal(sentencesRendered, ownerBySentence.size, "rendered sentences must equal attributed sentences");
assert.ok(groupsWithDialogue >= 240, `expected ≥240 dialogue groups, got ${groupsWithDialogue}`);
assert.ok(ownerBySentence.size >= 70000, `expected ≥70000 attributed sentences, got ${ownerBySentence.size}`);
assert.equal(encodedFallbackBlock(1054520, 9), "155209", "4.5 encoded fallback mapping");
assert.equal(encodedFallbackBlock(1054600, 0), "156000", "4.6 encoded fallback mapping");
assert.ok(fallbackClaims.every(c => !blockRefs.has(c.block)), "fallback blocks must be unclaimed by graph refs");
for (const claim of fallbackClaims) {
  assert.equal(ownerBySentence.get(sentencesByBlock.get(claim.block)[0]), claim.mission, "fallback block ownership");
}

console.log(`chapters: ${chaptersWritten}`);
console.log(`missions: ${storyMissions.length} (in sections: ${missionsInSection}, in appendix: ${missionsInAppendix}, dropped nameless: ${missionsDropped})`);
console.log(`mission groups: ${groupsRendered} (with dialogue: ${groupsWithDialogue})`);
console.log(`sentences: ${sentencesRendered} (graph-attributed: ${ownerBySentence.size - fallbackClaims.reduce((n, c) => n + c.sentences, 0)}, interpolated: ${interpolated}, fallback: ${fallbackClaims.reduce((n, c) => n + c.sentences, 0)})`);
console.log(`fallback claims: ${fallbackClaims.map(c => `${c.mission}<-${c.block}(${c.sentences})`).join(" ")}`);
console.log(`files written: ${writtenFiles.length} under output/dialogue`);
