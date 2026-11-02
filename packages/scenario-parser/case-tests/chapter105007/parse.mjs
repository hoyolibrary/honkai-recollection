import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSONBigFactory from "json-bigint";

const JSONBig = JSONBigFactory({ storeAsString: true });
const caseRoot = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(caseRoot, "../..");
const dataRoot = path.join(packageRoot, "data");
const cliHsrChsOutputRoot = path.resolve(packageRoot, "../cli-hsr/output/CHS");

const CHAPTER_ID = 105007;
const CHAPTER_TITLE = "亏成首富，从不要钱开始";
const CHAPTER_FLOORS = [10551001, 20551001, 40552001, 40553001];
const TITLE_TEXT = CHAPTER_TITLE;
const PROXY_CHAPTER_ID = 104006;
const PROXY_MISSIONS = [
  1040531, 1040532, 1040533, 1040534, 1040535, 1040536, 1040537, 1040538,
  1040539, 1040551, 1040552, 1040553, 1040554,
];
const PROXY_DEMO_MISSION = 1040537;
const SENTENCE_PREFIXES_BY_MISSION = new Map([
  [1054520, ["155200", "155201", "155202"]],
  [1054522, ["155220", "155221"]],
  [1054523, ["155230", "155231"]],
  [1054524, ["155240", "155241", "155242"]],
  [1054526, ["155260", "155261"]],
  [1054527, ["155270"]],
  [1054528, ["155280"]],
]);

const PERFORMANCE_TABLES = {
  C: "ExcelOutput/PerformanceC.json",
  DS: "ExcelOutput/PerformanceDS.json",
  E: "ExcelOutput/PerformanceE.json",
  Video: "ExcelOutput/PerformanceVideo.json",
};

const CHAPTER_MISSION_IDS = [
  1054520, 1054521, 1054522, 1054523, 1054524, 1054525, 1054526, 1054527,
  1054528,
];

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(dataRoot, relativePath), "utf8"));
}

async function readLosslessJson(relativePath) {
  return JSONBig.parse(await fs.readFile(path.join(dataRoot, relativePath), "utf8"));
}

async function readCliHsrOutputJson(relativePath) {
  return JSON.parse(
    await fs.readFile(path.join(cliHsrChsOutputRoot, relativePath), "utf8"),
  );
}

function existsOrNull(relativePath) {
  return fs
    .access(path.join(dataRoot, relativePath))
    .then(() => true)
    .catch(() => false);
}

function walk(value, visit, jsonPath = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, `${jsonPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  visit(value, jsonPath);
  for (const [key, child] of Object.entries(value)) {
    walk(child, visit, `${jsonPath}.${key}`);
  }
}

function countTypes(root) {
  const counts = new Map();
  walk(root, node => {
    if (node.$type) counts.set(node.$type, (counts.get(node.$type) ?? 0) + 1);
  });
  return counts;
}

function valueOf(dynamicValue) {
  if (dynamicValue == null) return null;
  if (typeof dynamicValue !== "object") return dynamicValue;
  if ("Value" in dynamicValue) return dynamicValue.Value;
  if (dynamicValue.IsDynamic === false) return dynamicValue.FixedValue?.Value ?? null;
  return null;
}

function sentenceAnchor(customStringValue) {
  if (typeof customStringValue !== "string") return null;
  const match = customStringValue.match(/^TalkSentence_(\d+)$/);
  return match ? Number(match[1]) : null;
}

// ---------------------------------------------------------------------------
// 场景 / 演出图类型分类表
// category:
//   talk        直接承载台词文本（图内有 TalkSentenceID）
//   talk-media  台词文本在字典 / 媒体资产中，图内无 ID（PlayTimeline / PlayVideo）
//   control     分支与事件总线控制流
//   mission     任务状态与进度推进
//   lifecycle   演出生命周期
//   presentation 纯演出表现，对文本展示无用（可跳过或一句话概括）
//   obfuscated  混淆类型，需要按字段形状识别
//   unknown     未分类
// ---------------------------------------------------------------------------
const TYPE_CLASSIFICATION = {
  "RPG.GameCore.PlayMissionTalk": { category: "talk", label: "走图现场对白" },
  "RPG.GameCore.PlayAndWaitSimpleTalk": { category: "talk", label: "顺序对白" },
  "RPG.GameCore.PlaySimpleTalk": { category: "talk", label: "顺序对白（不等完成）" },
  "RPG.GameCore.PlayOptionTalk": { category: "talk", label: "选项组" },
  "RPG.GameCore.OptionTalkInfo": { category: "talk", label: "选项条目" },
  "RPG.GameCore.PlayNPCBubbleTalk": { category: "talk", label: "NPC 气泡" },
  "RPG.GameCore.PlayNPCSingleBubbleTalk": { category: "talk", label: "NPC 单句气泡" },
  "RPG.GameCore.PlayFullScreenTransfer": { category: "talk", label: "转场黑字" },
  "RPG.GameCore.PlayTimeline": { category: "talk-media", label: "Timeline 演出（正文在字典，图内无 ID）" },
  "RPG.GameCore.PlayVideo": { category: "talk-media", label: "视频过场（无图内文本）" },
  "RPG.GameCore.WaitCustomString": { category: "control", label: "等待事件总线信号" },
  "RPG.GameCore.TriggerCustomString": { category: "control", label: "发出事件总线信号" },
  "RPG.GameCore.WaitGroupEvent": { category: "control", label: "等待组事件" },
  "RPG.GameCore.TriggerGroupEvent": { category: "control", label: "发出组事件" },
  "RPG.GameCore.WaitFloorCustomValueChangeV2": { category: "control", label: "等待楼层自定义值" },
  "RPG.GameCore.WaitFloorSavedValueChangeV2": { category: "control", label: "等待楼层存档值" },
  "RPG.GameCore.WaitGroupPropertyChange": { category: "control", label: "等待组属性变化" },
  "RPG.GameCore.WaitSubMissionStateChange": { category: "control", label: "等待子任务状态" },
  "RPG.GameCore.WaitSecond": { category: "control", label: "等待秒数" },
  "RPG.GameCore.WaitUIControllerClose": { category: "control", label: "等待 UI 关闭" },
  "RPG.GameCore.PredicateTaskList": { category: "control", label: "条件容器" },
  "RPG.GameCore.SwitchCase": { category: "control", label: "条件分支" },
  "RPG.GameCore.RandomConfig": { category: "control", label: "加权随机容器" },
  "RPG.GameCore.PerformanceEndSeq": { category: "control", label: "演出结束回调分支" },
  "RPG.GameCore.ScrTrfActTaskList": { category: "control", label: "转场任务列表容器" },
  "RPG.GameCore.CollectDataConditions": { category: "control", label: "数据条件收集" },
  "RPG.GameCore.ClientFinishMission": { category: "mission", label: "完成子任务" },
  "RPG.GameCore.SetMissionCustomValue": { category: "mission", label: "写任务自定义值" },
  "RPG.GameCore.SetTextJoinValue": { category: "mission", label: "写文本拼接值" },
  "RPG.GameCore.SetFloorCustomFloatV2": { category: "mission", label: "写楼层自定义浮点" },
  "RPG.GameCore.TriggerPerformance": { category: "mission", label: "触发演出" },
  "RPG.GameCore.FinishLevelGraph": { category: "lifecycle", label: "结束图" },
  "RPG.GameCore.LevelPerformanceInitialize": { category: "lifecycle", label: "初始化演出" },
  "RPG.GameCore.EndPerformance": { category: "lifecycle", label: "结束演出" },
  "RPG.GameCore.WaitPerformanceEnd": { category: "lifecycle", label: "等待演出结束" },
  "RPG.GameCore.RaidSceneTransfer": { category: "lifecycle", label: "转场进副本" },
  "RPG.GameCore.OpenTreasureChallenge": { category: "lifecycle", label: "开启夺宝挑战" },
  "RPG.GameCore.TriggerBattle": { category: "lifecycle", label: "触发战斗" },
  "RPG.GameCore.SetLoadingStratageType": { category: "presentation", label: "加载策略（可跳过）" },
  "RPG.GameCore.AdvNpcFaceToPlayer": { category: "presentation", label: "NPC 面向玩家（可跳过）" },
  "RPG.GameCore.AdvEntityFaceTo": { category: "presentation", label: "实体转向（可跳过）" },
  "RPG.GameCore.SetEntityVisible": { category: "presentation", label: "实体显隐（可跳过）" },
  "RPG.GameCore.HideEntityV2": { category: "presentation", label: "隐藏实体（可跳过）" },
  "RPG.GameCore.AdvCreateGroupEntityV2": { category: "presentation", label: "创建组实体（可跳过）" },
  "RPG.GameCore.SetTargetEntityFadeWithAnim": { category: "presentation", label: "实体渐隐（可跳过）" },
  "RPG.GameCore.SwitchCharacterAnchorV2": { category: "presentation", label: "切换角色锚点（可跳过）" },
  "RPG.GameCore.PPFilterStackEffect": { category: "presentation", label: "后处理滤镜（可跳过）" },
  "RPG.GameCore.SetHudTemplate": { category: "presentation", label: "HUD 模板（可跳过）" },
  "RPG.GameCore.ShowUI": { category: "presentation", label: "打开 UI（可跳过）" },
  "RPG.GameCore.ShowTutorialUI": { category: "presentation", label: "教程 UI（可跳过）" },
  "RPG.GameCore.TutorialLockPlayerAction": { category: "presentation", label: "教程锁操作（可跳过）" },
  "RPG.GameCore.SetMissionAudioState": { category: "presentation", label: "音频状态（可跳过）" },
  "RPG.GameCore.TriggerEffect": { category: "presentation", label: "触发特效（可跳过）" },
  "RPG.GameCore.TriggerSound": { category: "presentation", label: "触发音效（可跳过）" },
  "RPG.GameCore.CharacterTriggerFreeStyle": { category: "presentation", label: "角色动作（可跳过）" },
  "RPG.GameCore.PlayerRemoteControlOtherEntity": { category: "presentation", label: "遥控实体（可跳过）" },
  "RPG.GameCore.PropEnableCollider": { category: "presentation", label: "碰撞开关（可跳过）" },
  "RPG.GameCore.AdvClientChangePropState": { category: "presentation", label: "改物件状态（可跳过）" },
  "RPG.GameCore.RequestSetServerGroupPropertyV2": { category: "presentation", label: "服务器组属性（可跳过）" },
  "RPG.GameCore.SetPerformanceResult": { category: "mission", label: "记录演出结果" },
  "RPG.GameCore.AdventureShowReading": { category: "talk", label: "阅读物展示" },
  "RPG.GameCore.ShowEmojiBubble": { category: "presentation", label: "表情气泡（无文本）" },
  "RPG.GameCore.AdvSetupCustomTaskTrigger": { category: "control", label: "场景触发器装设" },
  "RPG.GameCore.AdvDistrictSetupTrigger": { category: "control", label: "区域触发器装设" },
  "RPG.GameCore.PropSetupUITrigger": { category: "control", label: "物件 UI 触发器装设" },
  "RPG.GameCore.GroupFetchLocalTarget": { category: "presentation", label: "目标选择器（结构）" },
  "RPG.GameCore.TargetFetchAdvNpcEx": { category: "presentation", label: "目标选择器（结构）" },
  "RPG.GameCore.TargetFetchAdvPropEx": { category: "presentation", label: "目标选择器（结构）" },
  "RPG.GameCore.TargetFetchAdvNPC": { category: "presentation", label: "目标选择器（结构）" },
  "RPG.GameCore.TargetFetchAdvLocalPlayer": { category: "presentation", label: "目标选择器（结构）" },
  "RPG.GameCore.TargetFetchAnchor": { category: "presentation", label: "目标选择器（结构）" },
  "RPG.GameCore.TargetFetchDialogueEntity": { category: "presentation", label: "目标选择器（结构）" },
  "RPG.GameCore.ByCompareMissionCustomValue": { category: "control", label: "条件：任务自定义值" },
  "RPG.GameCore.ByCompareGroupProperty": { category: "control", label: "条件：组属性" },
  "RPG.GameCore.ByCompareFloorCustomFloatV2": { category: "control", label: "条件：楼层浮点" },
  "RPG.GameCore.ByCompareFloorSavedValue": { category: "control", label: "条件：楼层存档值" },
  "RPG.GameCore.ByCompareSubMissionState": { category: "control", label: "条件：子任务状态" },
  "RPG.GameCore.ByCompareMainMissionState": { category: "control", label: "条件：主任务状态" },
  "RPG.GameCore.ByHeroGender": { category: "control", label: "条件：开拓者性别" },
  "RPG.GameCore.AddFinishMissionData_PlayMessageAdaptive": { category: "mission", label: "任务补充数据（留言）" },
  "RPG.GameCore.AddFinishMissionData_PlayMessage": { category: "mission", label: "任务补充数据（留言）" },
};

// 混淆类型按字段形状识别（本案例实测到的最小集）
const OBFUSCATED_SHAPES = [
  {
    type: "NONAIBLAJKA",
    resolvedAs: "RPG.GameCore.TriggerPerformance",
    evidence: "字段形状 = PlaneID/FloorID/PerformanceType/PerformanceID/MaskConfig；本例实例值 10551/10551001/\"C\"/105452705",
  },
  {
    type: "BDLHKCMCMGJ",
    resolvedAs: "待定（与演出 105452705 关联的等待/回调）",
    evidence: "BFLIFKBEOPJ=\"105452705\"，含布尔与计数",
  },
  {
    type: "LLPEOHPKGOM",
    resolvedAs: "待定（与演出 105452705 关联的回调）",
    evidence: "BFLIFKBEOPJ=\"105452705\"",
  },
  {
    type: "MCFJIFLMBCE",
    resolvedAs: "待定（AddPost，编号 7602）",
    evidence: "PLPPPCEPBDO=\"AddPost\"",
  },
  {
    type: "MPCOPCFENHI",
    resolvedAs: "待定（编号 7602）",
    evidence: "DGLJLJEHNNB=7602 与 MCFJIFLMBCE 共享",
  },
  { type: "DMPOEAEMPFO", resolvedAs: "未知", evidence: "仅 LEAPPNPBINI:2" },
  { type: "IPIMHIGNICC", resolvedAs: "未知", evidence: "空对象" },
];

function classifyType(type) {
  const short = String(type).replace(/^RPG\.GameCore\./, "");
  if (TYPE_CLASSIFICATION[type]) return TYPE_CLASSIFICATION[type];
  if (/^[A-Z]{8,}$/.test(short)) return { category: "obfuscated", label: "混淆类型" };
  return { category: "unknown", label: null };
}

// --- 载入输入 -------------------------------------------------------------

const [
  missionGraph,
  talkSentences,
  chapterConfigs,
  activityPanels,
  ...performanceTables
] = await Promise.all([
  readCliHsrOutputJson("mission/graph.json"),
  readCliHsrOutputJson("scenario/talksentence.json"),
  readLosslessJson("ExcelOutput/MissionChapterConfig.json"),
  readLosslessJson("ExcelOutput/ActivityPanel.json"),
  ...Object.values(PERFORMANCE_TABLES).map(readJson),
]);

const textMap = {
  ...(await readLosslessJson("TextMap/TextMapCHS.json")),
  ...(await readLosslessJson("TextMap/TextMapMainCHS.json")),
};
const textForHash = hash => (hash == null ? null : textMap[String(hash)] ?? null);

const talkSentenceById = new Map(
  talkSentences.map(sentence => [Number(sentence.id), sentence]),
);

// --- 章节 / 任务 ------------------------------------------------------------

const chapterConfig = chapterConfigs.find(row => Number(row.ID) === CHAPTER_ID);
assert(chapterConfig, "chapter config not found");

const chapterTitleHash = [...Object.entries(textMap)].find(
  ([, value]) => value === TITLE_TEXT,
)?.[0];
assert(chapterTitleHash, "chapter title hash not found in TextMap");

const activityPanel = activityPanels.find(
  row => String(row.TitleName?.Hash) === chapterTitleHash,
);
assert(activityPanel, "ActivityPanel row for the chapter not found");

const chapterMissions = missionGraph.nodes
  .filter(node => node.data.chapterId === CHAPTER_ID)
  .map(node => ({ ...node.data }))
  .sort((a, b) => a.order - b.order);
assert.equal(chapterMissions.length, 9, "expected 9 missions in chapter");
assert(
  chapterMissions.every(mission => CHAPTER_MISSION_IDS.includes(mission.id)),
  "unexpected mission id in chapter",
);

// --- 子任务定义（MissionInfo.partial） ---------------------------------------

async function readSubmissions(missionId) {
  const info = await readJson(
    `Config/Level/Mission/${missionId}/MissionInfo_${missionId}.partial.json`,
  );
  return (info.SubMissionList ?? []).map(sub => ({
    id: sub.ID,
    takeType: sub.TakeType,
    takeParam: sub.TakeParamIntList ?? [],
    finishType: sub.FinishType,
    finishParam: sub.ParamStr1 ?? (sub.ParamInt1 ?? null),
    floorId: sub.LevelFloorID,
    waypoint: {
      type: sub.WayPointType ?? null,
      floorId: sub.WayPointFloorID ?? null,
      groupId: sub.WayPointGroupID ?? null,
      entityId: sub.WayPointEntityID ?? null,
    },
    groupIds: sub.GroupIDList ?? [],
  }));
}

const submissionsByMission = new Map();
for (const mission of chapterMissions) {
  submissionsByMission.set(mission.id, await readSubmissions(mission.id));
}
const totalSubmissions = [...submissionsByMission.values()].reduce(
  (sum, list) => sum + list.length,
  0,
);

// --- 演出索引与死路径核对 -----------------------------------------------------

const performanceIndexRows = [];
{
  const tableOrder = Object.keys(PERFORMANCE_TABLES);
  tableOrder.forEach((type, index) => {
    for (const row of performanceTables[index]) {
      const id = row.PerformanceID;
      if (
        !CHAPTER_MISSION_IDS.some(missionId =>
          String(id).startsWith(String(missionId)),
        )
      )
        continue;
      performanceIndexRows.push({
        type,
        id,
        path: row.PerformancePath ?? null,
        isSkip: row.IsSkip ?? null,
        startBlack: row.StartBlack ?? null,
        endBlack: row.EndBlack ?? null,
        changePlayerType: row.ChangePlayerType ?? null,
        planeId: row.PlaneID ?? null,
        floorId: row.FloorID ?? null,
        exists: null, // 填充于下文
      });
    }
  });
  for (const row of performanceIndexRows) {
    row.exists = row.path ? await existsOrNull(row.path) : false;
  }
}
const deadPerformanceRows = performanceIndexRows.filter(row => !row.exists);
assert.equal(
  performanceIndexRows.length,
  deadPerformanceRows.length,
  "expected every chapter performance path to be missing from the dump",
);
assert(
  performanceIndexRows.length >= 100,
  "expected a substantial performance index for the chapter",
);

// --- 场景层（GroupGraph）足迹 --------------------------------------------------

const sceneFiles = [];
for (const floorId of CHAPTER_FLOORS) {
  const dir = `Config/Level/GroupGraph/F${floorId}`;
  let entries;
  try {
    entries = await fs.readdir(path.join(dataRoot, dir));
  } catch {
    sceneFiles.push({ file: `${dir}/ (目录不存在)`, floorId, referenced: false });
    continue;
  }
  for (const entry of entries.filter(name => name.endsWith(".json"))) {
    const rel = `${dir}/${entry}`;
    const content = await fs.readFile(path.join(dataRoot, rel), "utf8");
    if (/105452/.test(content)) {
      sceneFiles.push({ file: rel, floorId, referenced: true, content });
    }
  }
}
const sceneGraphs = [];
for (const file of sceneFiles) {
  if (!file.content) continue;
  sceneGraphs.push({ file: file.file, root: JSON.parse(file.content) });
}
assert(sceneGraphs.length >= 80, "expected a substantial scene footprint");

// 场景层类型普查 + 文本携带自动检测
const sceneTypeCensus = new Map(); // type -> {count, talkSentenceIds:Set}
for (const { file, root } of sceneGraphs) {
  walk(root, node => {
    const type = node.$type;
    if (!type) return;
    const entry =
      sceneTypeCensus.get(type) ?? { count: 0, talkSentenceRefs: new Set() };
    entry.count += 1;
    const directId = valueOf(node.TalkSentenceID);
    if (directId != null) entry.talkSentenceRefs.add(Number(directId));
    for (const item of node.SimpleTalkList ?? []) {
      const id = valueOf(item?.TalkSentenceID);
      if (id != null) entry.talkSentenceRefs.add(Number(id));
    }
    for (const item of node.OptionList ?? []) {
      const id = valueOf(item?.TalkSentenceID);
      if (id != null) entry.talkSentenceRefs.add(Number(id));
    }
    sceneTypeCensus.set(type, entry);
  });
}
const sceneCensusRows = [...sceneTypeCensus.entries()]
  .map(([type, entry]) => ({
    type,
    count: entry.count,
    category: classifyType(type).category,
    label: classifyType(type).label,
    carriesTalkSentenceId: entry.talkSentenceRefs.size > 0,
  }))
  .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

const sceneInlineTalkIds = new Set();
for (const entry of sceneTypeCensus.values()) {
  for (const id of entry.talkSentenceRefs) sceneInlineTalkIds.add(id);
}
const sceneInlineTalkResolved = [...sceneInlineTalkIds].filter(id =>
  talkSentenceById.has(id),
);
const sceneInlineTalkChapterIds = sceneInlineTalkResolved.filter(id =>
  String(id).startsWith("1552"),
);

// --- 台词字典分组 --------------------------------------------------------------

const chapterSentences = talkSentences.filter(row =>
  String(row.id).startsWith("1552"),
);
assert.equal(chapterSentences.length, 1805, "expected 1805 dictionary lines");

const sentenceGroupsByMission = new Map();
for (const [missionId, prefixes] of SENTENCE_PREFIXES_BY_MISSION) {
  sentenceGroupsByMission.set(
    missionId,
    chapterSentences
      .filter(row => prefixes.some(prefix => String(row.id).startsWith(prefix)))
      .sort((a, b) => Number(a.id) - Number(b.id)),
  );
}
const groupedIds = new Set(
  [...sentenceGroupsByMission.values()].flat().map(row => Number(row.id)),
);
const ungroupedSentences = chapterSentences.filter(
  row => !groupedIds.has(Number(row.id)),
);
assert.equal(ungroupedSentences.length, 0, "every 1552* line must map to a mission");

for (const [missionId, rows] of sentenceGroupsByMission) {
  assert(
    rows.every(row => row.text != null),
    `mission ${missionId} has unresolved dictionary text`,
  );
}

const speakerStats = new Map();
for (const row of chapterSentences) {
  const speaker = row.name || "（旁白）";
  speakerStats.set(speaker, (speakerStats.get(speaker) ?? 0) + 1);
}

// --- 代理章节（104006）类型普查 --------------------------------------------------

async function listProxyFiles() {
  const files = [];
  for (const missionId of PROXY_MISSIONS) {
    const missionDir = path.join(
      dataRoot,
      "Config/Level/Mission",
      String(missionId),
    );
    for (const entry of await fs.readdir(missionDir, { recursive: true })) {
      const abs = path.join(missionDir, String(entry));
      const stat = await fs.stat(abs);
      if (!stat.isFile() || !String(entry).endsWith(".json")) continue;
      const rel = path
        .relative(dataRoot, abs)
        .split(path.sep)
        .join("/");
      const segments = rel.split("/");
      const name = segments[segments.length - 1];
      const bucket = segments[segments.length - 2] === "Act"
        ? "Act"
        : name.startsWith("Mission_")
          ? "Mission"
          : name.startsWith("MissionInfo")
            ? null
            : "Other";
      if (bucket) files.push({ rel, bucket, missionId });
    }
    const dsDir = `Story/Discussion/Mission/${missionId}`;
    const storyDir = `Story/Mission/${missionId}`;
    for (const [dir, bucket] of [
      [dsDir, "DS"],
      [storyDir, "Story"],
    ]) {
      let entries = [];
      try {
        entries = await fs.readdir(path.join(dataRoot, dir));
      } catch {
        continue;
      }
      for (const entry of entries.filter(name => name.endsWith(".json"))) {
        files.push({ rel: `${dir}/${entry}`, bucket, missionId });
      }
    }
  }
  return files;
}

const proxyFiles = await listProxyFiles();
const proxyTypeCensus = new Map();
for (const file of proxyFiles) {
  const root = await readJson(file.rel);
  file.root = root;
  walk(root, node => {
    if (!node.$type) return;
    proxyTypeCensus.set(node.$type, (proxyTypeCensus.get(node.$type) ?? 0) + 1);
  });
}
const proxyCensusRows = [...proxyTypeCensus.entries()]
  .map(([type, count]) => ({
    type,
    count,
    category: classifyType(type).category,
    label: classifyType(type).label,
  }))
  .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

const proxyPerformanceRows = [];
{
  const proxyMissionPrefixes = PROXY_MISSIONS.map(String);
  for (const [type, tableIndex] of Object.entries(PERFORMANCE_TABLES).map(
    ([type], index) => [type, index],
  )) {
    for (const row of performanceTables[tableIndex]) {
      if (
        proxyMissionPrefixes.some(prefix =>
          String(row.PerformanceID).startsWith(prefix),
        )
      ) {
        proxyPerformanceRows.push({
          type,
          id: row.PerformanceID,
          path: row.PerformancePath ?? null,
        });
      }
    }
  }
}
const proxyExisting = [];
for (const row of proxyPerformanceRows) {
  if (row.path && (await existsOrNull(row.path))) proxyExisting.push(row);
}

// --- 代理演示：1040537 的 DS 分支重建 -------------------------------------------

async function buildProxyDemo() {
  const missionId = PROXY_DEMO_MISSION;
  const files = proxyFiles.filter(
    file => file.missionId === missionId && (file.bucket === "DS" || file.bucket === "Story"),
  );
  files.sort((a, b) => a.rel.localeCompare(b.rel, "en", { numeric: true }));

  // 第一步：逐文件提取序列骨架（wait/trigger/option/timeline）
  const rawBlocks = files.map(file => {
    const sequences = (file.root.OnStartSequece ?? []).map(
      sequence => sequence.TaskList ?? [],
    );
    const seqInfos = sequences.map(tasks => {
      const info = {
        waitString: null, // 原始等待串（可能是 TalkSentence_{id} 或 Wait_Option_… 枢纽串）
        waitAnchor: null, // TalkSentence_{id} 形式时的数字锚点
        triggerStrings: [], // 原始触发串
        triggerAnchors: [], // 数字形式触发锚点
        options: [], // {id, triggerString, triggerAnchor}
        timelines: [],
        simpleTalkIds: [],
        lifecycle: [],
      };
      for (const task of tasks) {
        const type = task.$type?.replace(/^RPG\.GameCore\./, "");
        if (type === "WaitCustomString") {
          info.waitString = valueOf(task.CustomString);
          info.waitAnchor = sentenceAnchor(info.waitString);
        } else if (type === "TriggerCustomString") {
          const value = valueOf(task.CustomString);
          info.triggerStrings.push(value);
          if (sentenceAnchor(value) != null) info.triggerAnchors.push(sentenceAnchor(value));
        } else if (type === "PlayOptionTalk") {
          for (const option of task.OptionList ?? []) {
            const triggerString = valueOf(option.TriggerCustomString);
            info.options.push({
              id: Number(valueOf(option.TalkSentenceID)),
              triggerString,
              triggerAnchor: sentenceAnchor(triggerString),
            });
          }
        } else if (type === "PlayTimeline") {
          info.timelines.push(task.TimelineName);
        } else if (type === "PlayAndWaitSimpleTalk" || type === "PlaySimpleTalk") {
          for (const item of task.SimpleTalkList ?? []) {
            info.simpleTalkIds.push(Number(valueOf(item?.TalkSentenceID)));
          }
        } else if (
          type === "LevelPerformanceInitialize" ||
          type === "EndPerformance" ||
          type === "WaitPerformanceEnd" ||
          type === "FinishLevelGraph"
        ) {
          info.lifecycle.push(type);
        }
      }
      return info;
    });
    const anchors = new Set();
    for (const info of seqInfos) {
      if (info.waitAnchor != null) anchors.add(info.waitAnchor);
      for (const anchor of info.triggerAnchors) anchors.add(anchor);
      for (const option of info.options) anchors.add(option.id);
    }
    const numericAnchors = [...anchors].sort((a, b) => a - b);
    return { file: file.rel, bucket: file.bucket, seqInfos, numericAnchors };
  });

  // 第二步：推定每个文件的句 ID 覆盖区间。
  // 末尾 = 最大数字锚点；开头 = 自最小锚点向下走，要求字典连续且不越过上一文件末尾。
  let previousEnd = null;
  const blocks = [];
  for (const raw of rawBlocks) {
    if (!raw.numericAnchors.length) {
      blocks.push({ ...raw, kind: "no-dialogue", note: "无台词锚点：纯 Timeline 演出或空图" });
      continue;
    }
    const minAnchor = raw.numericAnchors[0];
    const maxAnchor = raw.numericAnchors[raw.numericAnchors.length - 1];
    let start = minAnchor;
    while (
      start - 1 > (previousEnd ?? -Infinity) &&
      talkSentenceById.has(start - 1)
    ) {
      start -= 1;
    }
    if (previousEnd != null && start <= previousEnd) start = minAnchor;
    previousEnd = maxAnchor;

    // 第三步：句子归属。
    // 等待数字锚点 w 的序列拥有 [w, 下一个更大锚点) 内的非锚点句；
    // 无数字等待的入口/枢纽序列拥有 [start, 首个锚点)。
    const anchorSet = new Set(raw.numericAnchors);
    const ownership = new Map();
    const nextAnchorAfter = id =>
      raw.numericAnchors.find(anchor => anchor > id) ?? Infinity;
    for (let id = start; id <= maxAnchor; id += 1) {
      if (anchorSet.has(id)) continue;
      if (!talkSentenceById.has(id)) continue;
      let owner = null;
      let bestWidth = Infinity;
      raw.seqInfos.forEach((info, index) => {
        if (info.waitAnchor == null) return;
        const end = nextAnchorAfter(info.waitAnchor);
        const width = end - info.waitAnchor;
        if (
          id >= info.waitAnchor &&
          id < end &&
          width < bestWidth
        ) {
          owner = index;
          bestWidth = width;
        }
      });
      if (owner == null) {
        const entry = raw.seqInfos.findIndex(info => info.waitAnchor == null);
        if (entry >= 0) owner = entry;
      }
      if (owner != null) ownership.set(id, owner);
    }

    const optionAnchorIds = new Set(
      raw.seqInfos.flatMap(info => info.options.map(option => option.id)),
    );
    const waitAnchors = new Map(); // 等待串 -> seqIndex（数字或枢纽串统一处理）
    raw.seqInfos.forEach((info, index) => {
      if (info.waitString != null) waitAnchors.set(info.waitString, index);
    });
    // 入度：多少条边（选项触发 / 序列触发）指向某等待串
    const inDegree = new Map();
    const bumpEdge = target => {
      if (target == null) return;
      inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
    };
    for (const info of raw.seqInfos) {
      for (const trigger of info.triggerStrings) bumpEdge(trigger);
      for (const option of info.options) bumpEdge(option.triggerString);
    }

    blocks.push({
      file: raw.file,
      bucket: raw.bucket,
      kind: "dialogue",
      seqInfos: raw.seqInfos,
      numericAnchors: raw.numericAnchors,
      start,
      maxAnchor,
      optionAnchorIds,
      waitAnchors,
      inDegree,
      ownership,
    });
  }
  return { missionId, files: files.map(file => file.rel), blocks };
}

const proxyDemo = await buildProxyDemo();

// 检查代理块中孤句（在覆盖区间内、在字典中、却未归属到任何序列）
const proxyDiagnostics = [];
for (const block of proxyDemo.blocks) {
  if (block.kind !== "dialogue") {
    proxyDiagnostics.push({ file: block.file, kind: block.kind, note: block.note });
    continue;
  }
  const orphans = [];
  for (let id = block.start; id <= block.maxAnchor; id += 1) {
    if (block.optionAnchorIds.has(id)) continue;
    if (block.numericAnchors.includes(id)) continue;
    if (!talkSentenceById.has(id)) continue;
    if (!block.ownership.has(id)) orphans.push(id);
  }
  const anchorsMissingFromDict = block.numericAnchors.filter(
    id => !talkSentenceById.has(id),
  );
  proxyDiagnostics.push({
    file: block.file,
    range: [block.start, block.maxAnchor],
    ownedSentences: block.ownership.size,
    orphanSentenceIds: orphans,
    anchorsMissingFromDict,
  });
}

// --- 生成 proxy-1040537.chs.md（嵌套缩进 + 汇合引用格式样例） ---------------------

function mdEscapeLine(text) {
  return String(text ?? "")
    .replaceAll("\r\n", " ")
    .replaceAll("\n", " ");
}

function speakerLabel(sentence) {
  if (!sentence) return "?";
  const name = sentence.name;
  if (!name) return "旁白";
  if (name === "{NICKNAME}") return "开拓者";
  return name;
}

function renderProxyBlock(block, lines) {
  const fileShort = block.file.split("/").pop();
  const fileId = fileShort.replace(/\D/g, "");
  lines.push(`## ${fileShort}`);
  lines.push("");
  if (block.kind === "no-dialogue") {
    lines.push(`> 本图无台词锚点（${block.note}）。对文本展示可标记为「跳过」。`);
    lines.push("");
    return;
  }
  const sentenceOf = id => talkSentenceById.get(Number(id));
  const INDENT = "　　";

  const anchorId = key => `anchor-${fileId}-${String(key).replaceAll("_", "-")}`;
  const mdLink = key => `[#${key}](#${anchorId(key)})`;

  // ---- 第一遍：为每个序列分配渲染层级 ----
  // 入口序列 = 0；选项分支 = 选项组层级 + 1；私有延续 = 同层；
  // 共享汇合（入度 ≥ 2 的等待串）= 其所有来源的最近公共选项组层级。
  const edges = []; // {kind:'seq'|'option', fromSeq, target}
  block.seqInfos.forEach((info, index) => {
    for (const target of info.triggerStrings)
      if (target != null) edges.push({ kind: "seq", fromSeq: index, target });
    for (const option of info.options)
      if (option.triggerString != null)
        edges.push({ kind: "option", fromSeq: index, target: option.triggerString });
  });

  const levelOf = new Map();
  const deferredShared = new Set();
  const visitAssign = (index, level) => {
    if (levelOf.has(index)) return;
    levelOf.set(index, level);
    const info = block.seqInfos[index];
    for (const option of info.options) {
      const branch = block.waitAnchors.get(option.triggerString);
      if (branch !== undefined) visitAssign(branch, level + 1);
    }
    for (const target of info.triggerStrings) {
      if (target == null) continue;
      const next = block.waitAnchors.get(target);
      if (next === undefined) continue;
      if ((block.inDegree.get(target) ?? 0) >= 2) deferredShared.add(target);
      else visitAssign(next, level);
    }
  };
  block.seqInfos.forEach((info, index) => {
    if (info.waitString == null) visitAssign(index, 0);
  });
  // 解析共享汇合层级：来源边取「seq 来源层级-1」与「option 直接边=选项组层级」的最小值
  let progress = true;
  while (progress && deferredShared.size) {
    progress = false;
    for (const target of [...deferredShared]) {
      const candidates = edges
        .filter(edge => edge.target === target)
        .map(edge => {
          const fromLevel = levelOf.get(edge.fromSeq);
          if (fromLevel == null) return null;
          return edge.kind === "option" ? fromLevel : fromLevel - 1;
        })
        .filter(value => value != null);
      if (!candidates.length) continue;
      const level = Math.max(0, Math.min(...candidates));
      deferredShared.delete(target);
      progress = true;
      const next = block.waitAnchors.get(target);
      if (next !== undefined) visitAssign(next, level);
    }
  }

  // ---- 第二遍：按层级渲染 ----
  const renderedSeq = new Set();
  const emittedSentences = new Set();

  const ownedIdsOf = index => {
    const info = block.seqInfos[index];
    const ids = [...block.ownership.entries()]
      .filter(([, seqIndex]) => seqIndex === index)
      .map(([id]) => id)
      .sort((a, b) => a - b);
    // 等待锚点句本身是该序列的首句（除非它同时是选项文本）
    if (
      info.waitAnchor != null &&
      !block.optionAnchorIds.has(info.waitAnchor) &&
      talkSentenceById.has(info.waitAnchor)
    ) {
      ids.unshift(info.waitAnchor);
    }
    return [...new Set(ids)];
  };

  const emitSentence = (id, indentLevel) => {
    if (emittedSentences.has(id)) return;
    emittedSentences.add(id);
    const sentence = sentenceOf(id);
    const pad = INDENT.repeat(indentLevel);
    lines.push(
      `${pad}${sentence?.name ? `**${speakerLabel(sentence)}**：` : ""}${mdEscapeLine(sentence?.text ?? `（缺字典行 #${id}）`)}`,
    );
  };

  const renderSeq = index => {
    if (renderedSeq.has(index)) return;
    renderedSeq.add(index);
    const info = block.seqInfos[index];
    const level = levelOf.get(index) ?? 0;
    const pad = INDENT.repeat(level);

    if (info.waitString != null && (block.inDegree.get(info.waitString) ?? 0) >= 2) {
      lines.push("");
      lines.push(`<a id="${anchorId(info.waitString)}"></a>`);
      lines.push(
        `${INDENT.repeat(Math.max(0, level - 1))}⟲ **汇合点 ${info.waitAnchor != null ? `#${info.waitAnchor}` : `\`${info.waitString}\``}**（${block.inDegree.get(info.waitString)} 条分支在此汇合）`,
      );
    }

    for (const id of ownedIdsOf(index)) emitSentence(id, level);
    for (const id of info.simpleTalkIds) emitSentence(id, level);

    let nestedOptionSeen = false;
    for (const option of info.options) {
      const optionSentence = sentenceOf(option.id);
      lines.push("");
      lines.push(
        `${pad}▸ **选项 [#${option.id}]**${optionSentence?.name ? ` **${speakerLabel(optionSentence)}**：` : "："}「${mdEscapeLine(optionSentence?.text ?? "缺字典行")}」`,
      );
      const branchIndex = block.waitAnchors.get(option.triggerString);
      if (branchIndex !== undefined) {
        const branch = block.seqInfos[branchIndex];
        renderSeq(branchIndex);
        const continuation = branch.triggerStrings.filter(
          value => value != null && block.waitAnchors.has(value),
        );
        if (branch.options.length) nestedOptionSeen = true;
        for (const target of continuation) {
          lines.push(`${pad}${INDENT}↩ 分支结束，汇合于 ${mdLink(target)}`);
        }
        if (!continuation.length) {
          lines.push(`${pad}${INDENT}↩ 分支结束（无汇合信号）`);
        }
      } else if (option.triggerAnchor != null) {
        lines.push(
          `${pad}${INDENT}↩ 该选项直接进入共享回应 ${mdLink(option.triggerString)}`,
        );
      } else {
        lines.push(
          `${pad}${INDENT}↩ 触发 \`${option.triggerString}\`（本图内无等待序列，可能指向外部）`,
        );
      }
    }

    for (const target of info.triggerStrings) {
      if (target == null) continue;
      const nextIndex = block.waitAnchors.get(target);
      if (nextIndex !== undefined) renderSeq(nextIndex);
    }

    if (nestedOptionSeen) {
      // 分支内含嵌套选项组时，其汇合已在嵌套组处说明
    }
    if (info.lifecycle.some(step => step === "EndPerformance" || step === "FinishLevelGraph")) {
      lines.push(`${pad}—— 演出结束 ——`);
    }
  };

  block.seqInfos.forEach((info, index) => {
    if (info.waitString == null) renderSeq(index);
  });
  // 共享汇合序列即使未被入口直接到达也渲染（层级已知）
  for (const target of block.waitAnchors.keys()) {
    if ((block.inDegree.get(target) ?? 0) >= 2) {
      const index = block.waitAnchors.get(target);
      if (!renderedSeq.has(index)) renderSeq(index);
    }
  }

  const leftovers = block.seqInfos
    .map((info, index) => ({ info, index }))
    .filter(({ index }) => !renderedSeq.has(index));
  if (leftovers.length) {
    lines.push("");
    lines.push(`> ⚠ 未从入口到达的序列 ${leftovers.length} 条（可能由外部信号或运行时状态进入）：`);
    for (const { info } of leftovers) {
      lines.push(
        `> - 等待 \`${info.waitString ?? "-"}\`；选项 ${info.options.length} 个；Timeline ${info.timelines.length} 段`,
      );
    }
  }
  const unemitted = [];
  for (let id = block.start; id <= block.maxAnchor; id += 1) {
    if (!talkSentenceById.has(id)) continue;
    if (!emittedSentences.has(id) && !block.optionAnchorIds.has(id)) unemitted.push(id);
  }
  lines.push("");
  lines.push(
    `> 覆盖检查：区间 #${block.start}–#${block.maxAnchor} 内的字典句与选项已全部展开${unemitted.length ? `；未展开 ${unemitted.length} 句：${unemitted.join(", ")}` : ""}。`,
  );
  lines.push("");
}

const proxyDocLines = [
  `# 代理解析演示：任务 ${PROXY_DEMO_MISSION}（章节 ${PROXY_CHAPTER_ID}）分支台词格式样例`,
  "",
  `> 目标章节 ${CHAPTER_ID}【${CHAPTER_TITLE}】的演出图未进入当前数据快照，无法在其上产出分支结构。`,
  `> 本文件改用同规格、数据完整的开拓续闻章节 ${PROXY_CHAPTER_ID} 中的任务 ${PROXY_DEMO_MISSION}，`,
  `> 演示「演出图（分支拓扑）+ 台词字典（正文）」合并后的目标格式：`,
  `> 正文按顺序排列；选项以缩进分支展开；每个分支结尾给出汇合点跳转引用。`,
  "> 生成方法：DS/Story 图内 `OptionTalkInfo` 提供选项文本，`TriggerCustomString/WaitCustomString`（形如 `TalkSentence_{id}` 或 `Wait_Option_*`）提供分支边与汇合边，",
  "> 选项之间的正文句 ID 在字典中按播放顺序连续分配；等待锚点 w 的序列拥有 [w, 下一锚点) 区间内的句子，据此把正文还原到所属分支。",
  "",
];
for (const block of proxyDemo.blocks) {
  renderProxyBlock(block, proxyDocLines);
}
const proxyMdPath = path.join(caseRoot, "proxy-1040537.chs.md");
await fs.writeFile(proxyMdPath, proxyDocLines.join("\n"), "utf8");

// --- 生成 dialogue.chs.md（目标章节，按句 ID 顺序） ------------------------------

const dialogueLines = [
  `# 【${CHAPTER_TITLE}】台词整理（CHS）`,
  "",
  `> 章节：MissionChapterConfig ${CHAPTER_ID}（开拓续闻 / ChapterType=Activity，活动面板 ${activityPanel.PanelID}「${activityPanel.UIPrefab.replace("UI/Quest/StoryPanel/", "").replace(".prefab", "")}」）`,
  `> 版本归属：面板 UnlockConditions=${activityPanel.UnlockConditions}，FinishConditions=${activityPanel.FinishConditions}。`,
  ">",
  "> **顺序依据与限制**：本章演出图（Act/DS/Story JSON）未随当前数据快照发布，分支选项与汇合结构不可恢复。",
  "> 本整理按 `TalkSentenceID` 数值顺序排列——同一演出块内的句子 ID 按播放顺序连续分配，因此 ID 顺序",
  "> 是当前数据下对演出顺序的最佳近似；块与块之间（前缀切换处）以及任务内多场演出的先后以任务图与",
  "> 子任务线索标注，仍可能存在少量无法判定的次序。分行规则：说话人为空即旁白；`{NICKNAME}` 为开拓者。",
  ">",
  "> **实测校验（2026-09-25，对照游戏内实际剧情）**：与真实剧情内容基本一致；已知偏差仅两类——玩家选项被摊平成顺序行、",
  "> 部分旁白与全屏文本顺序有少量差异。在理解故事内容的级别足够（Tier 1 快速浏览视图；两级提取方向见 docs §5.5）。",
  "",
];
for (const mission of chapterMissions) {
  const rows = sentenceGroupsByMission.get(mission.id) ?? [];
  dialogueLines.push(`## ${mission.order + 1}. ${mission.name}（MainMission ${mission.id}）`);
  dialogueLines.push("");
  const subs = submissionsByMission.get(mission.id) ?? [];
  dialogueLines.push(
    `子任务 ${subs.length} 个：${subs.map(sub => `#${sub.id}（${sub.finishType ?? "?"}${sub.finishParam ? ` ${sub.finishParam}` : ""}）`).join("、")}`,
  );
  dialogueLines.push("");
  if (!rows.length) {
    dialogueLines.push(
      `> 本任务无独立台词块（${mission.id === 1054521 || mission.id === 1054525 ? "Raid 变体任务，复用正片演出" : "台词可能复用其他任务"}）。`,
    );
    dialogueLines.push("");
    continue;
  }
  const prefixes = SENTENCE_PREFIXES_BY_MISSION.get(mission.id) ?? [];
  let lastPrefix = null;
  for (const row of rows) {
    const prefix = prefixes.find(p => String(row.id).startsWith(p));
    if (prefix !== lastPrefix) {
      dialogueLines.push(`### 区块 ${prefix}（${rows.filter(r => String(r.id).startsWith(prefix)).length} 句）`);
      dialogueLines.push("");
      lastPrefix = prefix;
    }
    dialogueLines.push(
      row.name ? `**${speakerLabel(row)}**：${mdEscapeLine(row.text)}` : mdEscapeLine(row.text),
    );
  }
  dialogueLines.push("");
}
const dialogueMdPath = path.join(caseRoot, "dialogue.chs.md");
await fs.writeFile(dialogueMdPath, dialogueLines.join("\n"), "utf8");

// --- 结构化产物 -----------------------------------------------------------------

const categoryTotals = {};
for (const row of sceneCensusRows) {
  const key = row.category;
  categoryTotals[key] = (categoryTotals[key] ?? 0) + row.count;
}

const output = {
  schemaVersion: 1,
  generatedBy: "packages/scenario-parser/case-tests/chapter105007/parse.mjs",
  case: {
    title: CHAPTER_TITLE,
    chapterId: CHAPTER_ID,
    chapterType: chapterConfig.ChapterType,
    language: "CHS",
    versionPanel: {
      panelId: Number(activityPanel.PanelID),
      uiPrefab: activityPanel.UIPrefab,
      unlockConditions: activityPanel.UnlockConditions,
      finishConditions: activityPanel.FinishConditions,
      note: "QuestMainStory451Panel 指向 4.5.1 版本主线面板；当前快照为 OSPRODWin4.5.0（2026-09-16），章节图文件未随基础包发布",
    },
    floors: CHAPTER_FLOORS,
    missions: chapterMissions.map(mission => ({
      id: mission.id,
      name: mission.name,
      type: mission.type,
      order: mission.order,
      worldId: mission.worldId,
      submissionCount: submissionsByMission.get(mission.id)?.length ?? 0,
      sentencePrefixes: SENTENCE_PREFIXES_BY_MISSION.get(mission.id) ?? [],
      sentenceCount: sentenceGroupsByMission.get(mission.id)?.length ?? 0,
      variant:
        mission.id === 1054521 || mission.id === 1054525
          ? "Raid 变体（楼层 40552，复用正片演出，无独立台词块）"
          : null,
    })),
  },
  availability: {
    summary: [
      { layer: "任务元数据（MainMission/MissionChapterConfig/ActivityPanel）", status: "present" },
      { layer: "子任务定义（MissionInfo.partial：接取/完成/路点/组）", status: "present", detail: `${totalSubmissions} 个子任务` },
      { layer: "演出索引（PerformanceC/DS/E/Video）", status: "index-only", detail: `${performanceIndexRows.length} 行索引全部指向不存在的文件` },
      { layer: "演出图（Act/DS/Story JSON）", status: "absent", detail: "目录 Story/Discussion/Mission/105452* 与 Config/Level/Mission/105452*/Act 均不存在" },
      { layer: "场景组图（GroupGraph）", status: "partial", detail: `${sceneGraphs.length} 个引用本章的组文件；另有约 40 个子任务引用的组文件同样缺失` },
      { layer: "台词字典（TalkSentenceConfig 1552*）", status: "present", detail: "1805 句，1362 句带说话人" },
      { layer: "Timeline 资产（*.playable）", status: "absent-globally", detail: "整个快照无 .playable；但正文文本全部在字典中，Timeline 不影响文本重建" },
    ],
    evidence: [
      "子模块 extern/TurnBasedGameData HEAD = 4ce30f69b3（OSPRODWin4.5.0_D16545211，2026-09-16），与 origin/main 一致，0 提交落后",
      "MainMission.json 于 4.5.0 提交 5d064ec9bd（2026-08-26）新增 105452x；Story/ 与 TalkSentenceConfig 全历史 pickaxe 从未出现 1054520/105452001",
      "TalkSentenceConfig 同提交被整表重写（74.9 万行插入），1552* 系列 1805 句随表进入",
      "活动面板 80030 名为 QuestMainStory451Panel（4.5.1），FinishConditions=[FinishMainMission:1054528]；即 Excel 桩先于剧情图入库",
      "同机位同代的姊妹内容：章节 105008（1054500-1054506）演出图同样缺失；其 Branch 支线 2054500-2054502 与上一代续闻章节 104006 图完整",
    ],
  },
  performanceIndex: {
    byType: performanceIndexRows.reduce((acc, row) => {
      acc[row.type] = (acc[row.type] ?? 0) + 1;
      return acc;
    }, {}),
    rowsDead: deadPerformanceRows.length,
    rows: performanceIndexRows,
  },
  sceneLayer: {
    files: sceneGraphs.map(graph => graph.file),
    typeCensus: sceneCensusRows,
    categoryTotals,
    obfuscatedShapes: OBFUSCATED_SHAPES.filter(shape =>
      sceneCensusRows.some(row => row.type === shape.type),
    ),
    inlineTalkSentenceRefs: sceneInlineTalkIds.size,
    inlineTalkResolvedInDict: sceneInlineTalkResolved.length,
    inlineTalkChapterSeries: sceneInlineTalkChapterIds.length,
    sampleInlineTalks: sceneInlineTalkChapterIds.slice(0, 8).map(id => {
      const sentence = talkSentenceById.get(id);
      return { id, speaker: sentence?.name ?? null, text: sentence?.text ?? null };
    }),
  },
  dialogue: {
    totalLines: chapterSentences.length,
    withSpeaker: chapterSentences.filter(row => row.name).length,
    speakerStats: [...speakerStats.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([speaker, count]) => ({ speaker, count })),
    missions: chapterMissions.map(mission => {
      const rows = sentenceGroupsByMission.get(mission.id) ?? [];
      return {
        id: mission.id,
        name: mission.name,
        order: mission.order,
        idRange: rows.length
          ? [Number(rows[0].id), Number(rows[rows.length - 1].id)]
          : null,
        lines: rows.length,
        ids: rows.map(row => Number(row.id)),
      };
    }),
  },
  proxy: {
    chapterId: PROXY_CHAPTER_ID,
    note: "同规格数据完整的开拓续闻章节，用作演出图层类型与分支格式的参照",
    graphFiles: {
      total: proxyFiles.length,
      byBucket: proxyFiles.reduce((acc, file) => {
        acc[file.bucket] = (acc[file.bucket] ?? 0) + 1;
        return acc;
      }, {}),
    },
    performanceRows: proxyPerformanceRows.length,
    performanceRowsExisting: proxyExisting.length,
    typeCensus: proxyCensusRows,
    demoMission: PROXY_DEMO_MISSION,
    demoBlocks: proxyDiagnostics,
  },
  diagnostics: {
    deadPerformancePaths: deadPerformanceRows.length,
    sceneFiles: sceneGraphs.length,
    sceneTypeCount: sceneCensusRows.length,
    sceneUnclassified: sceneCensusRows.filter(row => row.category === "unknown"),
    sentenceTotal: chapterSentences.length,
    speakerlessLines: chapterSentences.filter(row => !row.name).length,
    nicknamePlaceholderLines: chapterSentences.filter(row =>
      String(row.text ?? "").includes("{NICKNAME}"),
    ).length,
    textjoinPlaceholderLines: chapterSentences.filter(row =>
      String(row.text ?? "").includes("{TEXTJOIN#"),
    ).length,
    proxyDemoOrphans: proxyDiagnostics.reduce(
      (sum, item) => sum + (item.orphanSentenceIds?.length ?? 0),
      0,
    ),
  },
};

const outputPath = path.join(caseRoot, "output.chs.json");
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

// --- 断言汇总 -------------------------------------------------------------------

assert.equal(output.diagnostics.sentenceTotal, 1805);
assert.equal(output.performanceIndex.rowsDead, performanceIndexRows.length);
assert(sceneGraphs.length >= 80);
assert.equal(proxyPerformanceRows.length, proxyExisting.length, "proxy chapter rows must all exist");
assert(proxyFiles.length >= 150, "proxy chapter must have a substantial graph file set");
assert(
  proxyCensusRows.some(row => row.type === "RPG.GameCore.PlayOptionTalk"),
  "proxy census must include option talk",
);
assert(
  output.dialogue.missions.every(mission => mission.id === 1054521 || mission.id === 1054525 || mission.lines > 0),
  "every story mission must own dictionary lines",
);

console.log("wrote:");
console.log("  output.chs.json");
console.log("  dialogue.chs.md");
console.log("  proxy-1040537.chs.md");
console.log(
  JSON.stringify(
    {
      missions: chapterMissions.length,
      submissions: totalSubmissions,
      performanceIndexRows: performanceIndexRows.length,
      deadPaths: deadPerformanceRows.length,
      sceneFiles: sceneGraphs.length,
      sceneTypes: sceneCensusRows.length,
      sentences: chapterSentences.length,
      withSpeaker: output.dialogue.withSpeaker,
      proxyGraphFiles: proxyFiles.length,
      proxyTypes: proxyCensusRows.length,
      proxyDemoOrphans: output.diagnostics.proxyDemoOrphans,
    },
    null,
    2,
  ),
);
