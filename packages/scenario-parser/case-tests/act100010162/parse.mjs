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

const sourceActPath =
  "Config/Level/NPCDialogue/P20002/F20002001_G7/Act/Act100010162.json";
const outputPath = path.resolve(
  process.argv[2] ?? path.join(caseRoot, "output.chs.json"),
);

const TYPE = {
  playSimpleTalk: "RPG.GameCore.PlaySimpleTalk",
  playAndWaitSimpleTalk: "RPG.GameCore.PlayAndWaitSimpleTalk",
  waitSimpleTalkFinish: "RPG.GameCore.WaitSimpleTalkFinish",
  switchCase: "RPG.GameCore.SwitchCase",
  byAvatarId: "RPG.GameCore.ByLocalPlayerAvatarID",
  byLocalPlayerIsHero: "RPG.GameCore.ByLocalPlayerIsHero",
  triggerCustomString: "RPG.GameCore.TriggerCustomString",
  waitCustomString: "RPG.GameCore.WaitCustomString",
  random: "RPG.GameCore.RandomConfig",
};

const typeCatalog = {
  [TYPE.playSimpleTalk]: {
    family: "talk",
    baseType: "RPG.GameCore.SimpleTalkListConfig",
    meaning: "播放 SimpleTalkList；本身不等待播放完成。",
    declaredFields: [
      "KeepDisplay:Boolean",
      "BlackMask:Boolean",
      "Backgrounds:SimpleTalkBackground[]",
      "TargetBehaviors:SimpleTalkTargetBehavior[]",
      "StyleList:SimpleTalkStyle[]",
    ],
    interpretedFields: ["SimpleTalkList[].TalkSentenceID"],
  },
  [TYPE.playAndWaitSimpleTalk]: {
    family: "talk",
    baseType: "RPG.GameCore.SimpleTalkListConfig",
    meaning: "播放 SimpleTalkList，并等待本组对白完成。",
    declaredFields: [
      "KeepDisplay:Boolean",
      "BlackMask:Boolean",
      "Backgrounds:SimpleTalkBackground[]",
      "TargetBehaviors:SimpleTalkTargetBehavior[]",
      "StyleList:SimpleTalkStyle[]",
    ],
    interpretedFields: ["SimpleTalkList[].TalkSentenceID"],
  },
  [TYPE.waitSimpleTalkFinish]: {
    family: "talk-control",
    baseType: "RPG.GameCore.TaskConfig",
    meaning: "等待此前 PlaySimpleTalk 播放完成。",
    interpretedFields: [],
  },
  [TYPE.switchCase]: {
    family: "container",
    baseType: "RPG.GameCore.TaskConfig",
    meaning: "逐项判断 Predicate 并执行 SuccessTaskList；是否命中后中断由 WithBreak 控制。",
    declaredFields: [
      "WithBreak:Boolean",
      "TaskList:PredicateTaskListWithFail[]",
      "DefaultTask:TaskConfig[]",
    ],
    interpretedFields: ["TaskList[].Predicate", "TaskList[].SuccessTaskList"],
  },
  [TYPE.byAvatarId]: {
    family: "predicate",
    baseType: "RPG.GameCore.PredicateConfig",
    meaning: "判断当前本地玩家使用的角色 ID。",
    declaredFields: ["AvatarIDs:UInt32[]"],
    interpretedFields: ["AvatarIDs"],
  },
  [TYPE.byLocalPlayerIsHero]: {
    family: "predicate",
    baseType: "RPG.GameCore.PredicateConfig",
    meaning: "判断当前本地玩家是否为开拓者。",
    declaredFields: [],
    interpretedFields: [],
  },
  [TYPE.triggerCustomString]: {
    family: "event-bus",
    baseType: "RPG.GameCore.TaskConfig",
    meaning: "向演出图事件总线发出自定义字符串。",
    declaredFields: ["CustomString:DynamicString"],
    interpretedFields: ["CustomString.Value"],
  },
  [TYPE.waitCustomString]: {
    family: "event-bus",
    baseType: "RPG.GameCore.TaskConfig",
    meaning: "等待演出图事件总线收到自定义字符串。",
    declaredFields: [
      "CustomString:DynamicString",
      "WaitOwnerOnly:Boolean",
      "GoNextImmediately:Boolean",
      "ResetWhenTaskBegin:Boolean",
    ],
    interpretedFields: ["CustomString.Value"],
  },
  [TYPE.random]: {
    family: "container",
    baseType: "RPG.GameCore.CompositeConfig",
    meaning: "以 OddsList 的权重从同索引 TaskList 中选择任务。",
    declaredFields: [
      "OddsList:DynamicFloat[]",
      "TaskList:TaskConfig[]",
      "RandomCount:DynamicFloat",
      "RandomUnique:Boolean",
      "ContinuousNotRepeat:Boolean",
      "RandomMaskKey:String",
      "RandomMaskTarget:TargetEvaluator",
    ],
    interpretedFields: ["OddsList[].FixedValue.Value", "TaskList[]"],
  },
  "RPG.GameCore.LevelPerformanceInitialize": {
    family: "performance-lifecycle",
    baseType: "RPG.GameCore.TaskConfig",
    meaning: "初始化演出。",
    interpretedFields: [],
  },
  "RPG.GameCore.EndPerformance": {
    family: "performance-lifecycle",
    baseType: "RPG.GameCore.TaskConfig",
    meaning: "结束演出。",
    interpretedFields: [],
  },
  "RPG.GameCore.WaitPerformanceEnd": {
    family: "performance-lifecycle",
    baseType: "RPG.GameCore.TaskConfig",
    meaning: "等待演出结束。",
    interpretedFields: [],
  },
  "RPG.GameCore.FinishLevelGraph": {
    family: "performance-lifecycle",
    baseType: "RPG.GameCore.TaskConfig",
    meaning: "结束当前 LevelGraph。",
    interpretedFields: [],
  },
};

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

function valueOf(dynamicValue) {
  if (dynamicValue == null) return null;
  if (typeof dynamicValue !== "object") return dynamicValue;
  if ("Value" in dynamicValue) return dynamicValue.Value;
  if (dynamicValue.IsDynamic === false) return dynamicValue.FixedValue?.Value ?? null;
  return null;
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

function findTypedNodes(root, type) {
  const matches = [];
  walk(root, (node, jsonPath) => {
    if (node.$type === type) matches.push({ node, jsonPath });
  });
  return matches;
}

function countTypes(root) {
  const counts = new Map();
  walk(root, node => {
    if (node.$type) counts.set(node.$type, (counts.get(node.$type) ?? 0) + 1);
  });
  return Object.fromEntries(
    [...counts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
  );
}

function normalizeHash(hash) {
  return hash == null ? null : String(hash);
}

function customString(task) {
  return valueOf(task?.CustomString);
}

const [
  act,
  talkSentences,
  performanceConfigs,
  textMapMain,
  textMap,
  avatarIndex,
  elementIndex,
  pathIndex,
  achievementConfigs,
  finishWays,
  achievementMissionGraph,
  achievementMissionInfo,
] = await Promise.all([
  readJson(sourceActPath),
  readCliHsrOutputJson("scenario/talksentence.json"),
  readJson("ExcelOutput/PerformanceE.json"),
  readJson("TextMap/TextMapMainCHS.json"),
  readJson("TextMap/TextMapCHS.json"),
  readCliHsrOutputJson("avatars/index.json"),
  readCliHsrOutputJson("elements.json"),
  readCliHsrOutputJson("paths.json"),
  readLosslessJson("ExcelOutput/AchievementData.json"),
  readJson("ExcelOutput/FinishWay.json"),
  readJson("Config/Level/Mission/4140105/Mission_414010501.json"),
  readJson("Config/Level/Mission/4140105/MissionInfo_4140105.partial.json"),
]);

const chsTextMap = { ...textMapMain, ...textMap };
const textForHash = hash => chsTextMap[normalizeHash(hash)] ?? null;

const talkSentenceById = new Map(
  talkSentences.map(sentence => [Number(sentence.id), sentence]),
);
const avatarIndexById = new Map(avatarIndex.map(avatar => [Number(avatar.id), avatar]));
const elementNameById = new Map(elementIndex.map(element => [element.id, element.name]));
const pathNameById = new Map(pathIndex.map(gamePath => [gamePath.id, gamePath.name]));
let fullAvatarById = new Map();

function resolveTalkSentence(id) {
  const sentence = talkSentenceById.get(Number(id));
  if (!sentence) {
    return { id: Number(id), speaker: null, text: null, source: null };
  }

  return {
    id: Number(id),
    speaker: sentence.name || null,
    text: sentence.text,
    source: {
      output: "packages/cli-hsr/output/CHS/scenario/talksentence.json",
      voiceId: sentence.voiceId ?? null,
    },
  };
}

function resolveAvatar(id) {
  const numericId = Number(id);
  const avatar = avatarIndexById.get(numericId);
  const fullAvatar = fullAvatarById.get(numericId);
  const elationPriorities = [
    ...new Set(
      (fullAvatar?.versions?.[0]?.skills ?? [])
        .filter(skill => skill.type === "ElationDamage")
        .map(skill => skill.elationPriority)
        .filter(priority => priority != null),
    ),
  ];
  return {
    id: numericId,
    name: avatar?.name ?? null,
    element: avatar
      ? { id: avatar.element, name: elementNameById.get(avatar.element) ?? avatar.element }
      : null,
    path: avatar
      ? { id: avatar.path, name: pathNameById.get(avatar.path) ?? avatar.path }
      : null,
    elationPriorities,
    source: {
      index: "packages/cli-hsr/output/CHS/avatars/index.json",
      detail: fullAvatar
        ? `packages/cli-hsr/output/CHS/avatars/${numericId}.json`
        : null,
    },
  };
}

function parseTalkTask(task) {
  assert(
    task.$type === TYPE.playSimpleTalk || task.$type === TYPE.playAndWaitSimpleTalk,
    `unsupported talk task: ${task.$type}`,
  );
  return {
    sourceType: task.$type,
    playback:
      task.$type === TYPE.playAndWaitSimpleTalk ? "play-and-wait" : "play-without-wait",
    lines: (task.SimpleTalkList ?? []).map(item =>
      resolveTalkSentence(valueOf(item.TalkSentenceID)),
    ),
  };
}

function summarizeTaskList(tasks) {
  const talks = tasks
    .filter(task =>
      [TYPE.playSimpleTalk, TYPE.playAndWaitSimpleTalk].includes(task.$type),
    )
    .map(parseTalkTask);
  return {
    talks,
    waitsForTalkFinish: tasks.some(task => task.$type === TYPE.waitSimpleTalkFinish),
    emittedSignals: tasks
      .filter(task => task.$type === TYPE.triggerCustomString)
      .map(task => customString(task)),
    sourceTaskTypes: tasks.map(task => task.$type),
  };
}

const sequences = act.OnStartSequece ?? [];
const switchMatches = findTypedNodes(act, TYPE.switchCase);
const randomMatches = findTypedNodes(act, TYPE.random);
assert.equal(switchMatches.length, 1, "expected exactly one SwitchCase");
assert.equal(randomMatches.length, 1, "expected exactly one RandomConfig");

const switchNode = switchMatches[0].node;
const randomNode = randomMatches[0].node;
const switchAvatarIds = [
  ...new Set(
    switchNode.TaskList.flatMap(branch => branch.Predicate?.AvatarIDs ?? []).map(Number),
  ),
];
const trailblazerElationAvatarIds = [8009, 8010].filter(id => avatarIndexById.has(id));
const fullAvatars = await Promise.all(
  [...switchAvatarIds, ...trailblazerElationAvatarIds].map(id =>
    readCliHsrOutputJson(`avatars/${id}.json`),
  ),
);
fullAvatarById = new Map(fullAvatars.map(avatar => [Number(avatar.id), avatar]));

const getWait = findTypedNodes(act, TYPE.waitCustomString).find(
  match => customString(match.node) === "100010162_Get",
);
const endWait = findTypedNodes(act, TYPE.waitCustomString).find(
  match => customString(match.node) === "100010162_End",
);
assert(getWait, "missing wait for 100010162_Get");
assert(endWait, "missing wait for 100010162_End");

const introSequence = sequences.find(sequence =>
  sequence.TaskList?.some(
    task => task.$type === TYPE.triggerCustomString && customString(task) === "100010162_Get",
  ),
);
assert(introSequence, "missing intro sequence");
const introSummary = summarizeTaskList(introSequence.TaskList);

const branches = switchNode.TaskList.map((branch, index) => {
  const predicate = branch.Predicate ?? {};
  let condition;
  if (predicate.$type === TYPE.byAvatarId) {
    const avatars = (predicate.AvatarIDs ?? []).map(resolveAvatar);
    condition = {
      kind: "local-player-avatar-in",
      sourceType: predicate.$type,
      avatarIds: avatars.map(avatar => avatar.id),
      avatars,
      label: `当前角色为：${avatars.map(avatar => avatar.name ?? `#${avatar.id}`).join(" / ")}`,
    };
  } else if (predicate.$type === TYPE.byLocalPlayerIsHero) {
    condition = {
      kind: "local-player-is-trailblazer",
      sourceType: predicate.$type,
      label: "当前角色为开拓者（不区分性别与命途）",
    };
  } else {
    condition = {
      kind: "opaque-predicate",
      sourceType: predicate.$type ?? null,
      raw: predicate,
      label: `未解释条件：${predicate.$type ?? "untyped"}`,
    };
  }

  return {
    index,
    condition,
    ...summarizeTaskList(branch.SuccessTaskList ?? []),
  };
});

function uniqueValues(values) {
  return [...new Set(values)];
}

function extractNumericValues(text) {
  return [...(text ?? "").replaceAll(/<[^>]+>/g, "").matchAll(/\d+(?:\.\d+)?/g)].map(
    match => match[0],
  );
}

const scoreRowsByKey = new Map();
for (const branch of branches) {
  const lines = branch.talks.flatMap(talk => talk.lines);
  const branchTexts = lines.map(line => line.text ?? "");
  const rowAvatars =
    branch.condition.kind === "local-player-is-trailblazer"
      ? [
          {
            id: null,
            name: "开拓者（任意形态）",
            element: { id: null, name: "随当前形态" },
            path: { id: null, name: "随当前形态" },
            elationPriorities: uniqueValues(
              trailblazerElationAvatarIds.flatMap(id =>
                (fullAvatarById.get(id)?.versions?.[0]?.skills ?? [])
                  .filter(skill => skill.type === "ElationDamage")
                  .map(skill => skill.elationPriority)
                  .filter(priority => priority != null),
              ),
            ),
            source: {
              index: "packages/cli-hsr/output/CHS/avatars/index.json",
              detail: trailblazerElationAvatarIds.map(
                id => `packages/cli-hsr/output/CHS/avatars/${id}.json`,
              ),
            },
          },
        ]
      : branch.condition.avatars ?? [];

  for (const avatar of rowAvatars) {
    const key = avatar.id == null ? "trailblazer" : `avatar:${avatar.id}`;
    const row = scoreRowsByKey.get(key) ?? {
      avatar,
      branchIndexes: [],
      talkSentenceIds: [],
      texts: [],
    };
    row.branchIndexes.push(branch.index);
    row.talkSentenceIds.push(...lines.map(line => line.id));
    row.texts.push(...branchTexts);
    scoreRowsByKey.set(key, row);
  }
}

const characterScoreRows = [...scoreRowsByKey.values()].map(row => {
  const textNumericValues = uniqueValues(row.texts.flatMap(extractNumericValues));
  const elationPriorities = uniqueValues(row.avatar.elationPriorities ?? []).map(String);
  const isElation = row.avatar.path?.id === "Elation";
  const ratingValues = isElation
    ? textNumericValues.filter(value => !elationPriorities.includes(value))
    : textNumericValues;
  const containsUnmeasurable = row.texts.some(text => text.includes("无法测定"));
  let ratingState = "numeric";
  if (containsUnmeasurable && ratingValues.length === 0) ratingState = "unmeasurable";
  else if (containsUnmeasurable) ratingState = "numeric-then-unmeasurable";
  else if (ratingValues.length === 0 && elationPriorities.length > 0)
    ratingState = "performance-number-only";
  else if (ratingValues.length === 0) ratingState = "no-numeric-rating";

  return {
    avatar: row.avatar,
    branchIndexes: uniqueValues(row.branchIndexes),
    talkSentenceIds: uniqueValues(row.talkSentenceIds),
    ratingValues,
    ratingState,
    containsUnmeasurable,
    textNumericValues,
    elationPerformanceNumbers: elationPriorities,
    elationPerformanceNumberAppearsInText: elationPriorities.some(priority =>
      textNumericValues.includes(priority),
    ),
  };
});

assert.equal(
  randomNode.OddsList?.length,
  randomNode.TaskList?.length,
  "RandomConfig OddsList and TaskList length mismatch",
);
const randomChoices = randomNode.TaskList.map((task, index) => ({
  index,
  weight: Number(valueOf(randomNode.OddsList[index])),
  talk: parseTalkTask(task),
}));
const randomWeightSum = randomChoices.reduce((sum, choice) => sum + choice.weight, 0);
assert(Math.abs(randomWeightSum - 1) < 1e-9, `random weights sum to ${randomWeightSum}`);

const allAvatarIds = branches.flatMap(branch => branch.condition.avatarIds ?? []);
const duplicateAvatarIds = [...new Set(allAvatarIds)].filter(
  avatarId => allAvatarIds.filter(candidate => candidate === avatarId).length > 1,
);
const allTalkLines = [
  ...introSummary.talks.flatMap(talk => talk.lines),
  ...branches.flatMap(branch => branch.talks.flatMap(talk => talk.lines)),
  ...randomChoices.flatMap(choice => choice.talk.lines),
];
const missingTalkSentenceIds = [
  ...new Set(allTalkLines.filter(line => line.text == null).map(line => line.id)),
];
const missingAvatarIds = [
  ...new Set(
    branches.flatMap(branch =>
      (branch.condition.avatars ?? [])
        .filter(avatar => avatar.name == null)
        .map(avatar => avatar.id),
    ),
  ),
];

const performance = performanceConfigs.find(
  config => config.PerformancePath === sourceActPath,
);
assert(performance, "PerformanceE association not found");

const specialSignals = [
  ...new Set(
    branches
      .flatMap(branch => branch.emittedSignals)
      .filter(signal => !["100010162_End"].includes(signal)),
  ),
];

const achievementSubMission = achievementMissionInfo.SubMissionList.find(
  mission => mission.ID === 414010501,
);
const absoluteZeroAchievement = achievementConfigs.find(
  achievement => Number(achievement.AchievementID) === 4082703,
);
const absoluteZeroFinishWay = finishWays.find(finishWay => finishWay.ID === 4082703);
const achievementSignalWait = findTypedNodes(
  achievementMissionGraph,
  TYPE.waitCustomString,
).find(match => customString(match.node) === "Mission_414010501");
const achievementMissionFinish = findTypedNodes(
  achievementMissionGraph,
  "RPG.GameCore.FinishPerformanceMission",
).find(match => match.node.Key === "Mission_414010501");
assert(achievementSubMission, "achievement sub-mission association not found");
assert(absoluteZeroAchievement, "Absolute Zero achievement config not found");
assert(absoluteZeroFinishWay, "Absolute Zero FinishWay not found");
assert(achievementSignalWait, "achievement mission does not wait for mirror signal");
assert(achievementMissionFinish, "achievement mission does not finish from mirror signal");
assert(
  absoluteZeroFinishWay.ParamIntList?.includes(achievementSubMission.MainMissionID),
  "Absolute Zero FinishWay does not reference the linked main mission",
);

const output = {
  schemaVersion: 2,
  generatedBy: "packages/scenario-parser/case-tests/act100010162/parse.mjs",
  case: {
    title: "定分枪角色评分交互",
    language: "CHS",
    sourceKind: "NPCDialogue/PerformanceE",
    sourcePath: sourceActPath,
    performance: {
      id: performance.PerformanceID,
      type: "E",
      planeId: performance.PlaneID,
      floorId: performance.FloorID,
      sourceTable: "ExcelOutput/PerformanceE.json",
    },
    facedProp: {
      groupId: 102,
      propId: 300001,
      evidence:
        "入口 AdvEntityFaceTo.TargetFetchAdvPropEx.SinglePropID 的静态 GroupID/ID。",
    },
    externalAssociations: [
      {
        emittedSignal: "Mission_414010501",
        emittedByAvatarId: 1212,
        consumerPath: achievementSubMission.MissionJsonPath,
        subMissionId: achievementSubMission.ID,
        mainMissionId: achievementSubMission.MainMissionID,
        effect: "FinishPerformanceMission",
        achievement: {
          id: Number(absoluteZeroAchievement.AchievementID),
          title: textForHash(absoluteZeroAchievement.AchievementTitle?.Hash),
          desc: textForHash(absoluteZeroAchievement.AchievementDesc?.Hash),
          finishType: absoluteZeroFinishWay.FinishType,
          finishMissionIds: absoluteZeroFinishWay.ParamIntList,
          sourceTables: [
            "ExcelOutput/AchievementData.json",
            "ExcelOutput/FinishWay.json",
          ],
        },
      },
    ],
  },
  typeCatalog: {
    source:
      "docs/scenario-type-inheritance-inventory.md + tool/scenario-type-scan/DummyDll/RPG.GameCore.Config.dll + 本案例 JSON 中的实际字段位置",
    note:
      "declaredFields 是 DummyDll 声明字段的本例相关子集；interpretedFields 是实验脚本真正读取的序列化字段。",
    entries: typeCatalog,
  },
  characterScoreTable: {
    source:
      "剧情分支来自 Act；角色、属性、命途来自 packages/cli-hsr/output/CHS/avatars；欢愉参演编号来自 versions[0].skills[type=ElationDamage].elationPriority。",
    note:
      "ratingValues 会从欢愉角色的文案数值中剔除 elationPerformanceNumbers；textNumericValues 保留文案出现的全部数值，供复核复杂评分过程。",
    rows: characterScoreRows,
  },
  flow: {
    sourceSequenceCount: sequences.length,
    phases: [
      {
        id: "intro",
        kind: "linear-talk",
        summary: "初始化演出、玩家面向交互物，播放两句介绍。",
        talks: introSummary.talks,
        waitsForTalkFinish: introSummary.waitsForTalkFinish,
        emits: "100010162_Get",
      },
      {
        id: "character-score",
        kind: "switch",
        summary: "收到 Get 信号后，根据当前角色选择评分文案。",
        waitsFor: "100010162_Get",
        sourceType: TYPE.switchCase,
        selectionSemantics: {
          value: "runtime-dependent-on-omitted-WithBreak",
          certainty: "unknown-from-serialized-instance",
          serializedWithBreak: switchNode.WithBreak ?? null,
          reason:
            "DummyDll 表明 SwitchCase 有 WithBreak 字段，但本实例未序列化该字段；角色 1111 又重复出现，不能仅凭 JSON 断定首个命中或执行全部命中。",
        },
        defaultBranch: switchNode.DefaultTask ?? null,
        branches,
      },
      {
        id: "random-comment",
        kind: "weighted-random",
        summary: "每个角色评分分支发出 End 后，随机播放一句玩家内心评论。",
        waitsFor: "100010162_End",
        sourceType: TYPE.random,
        weightSum: randomWeightSum,
        drawCountSemantics: {
          value: "runtime-default",
          certainty: "unknown-from-serialized-instance",
          serializedRandomCount: randomNode.RandomCount ?? null,
          note:
            "本例只把 OddsList 与同索引 TaskList 保存为加权候选，不在解析阶段模拟抽取次数。",
        },
        choices: randomChoices,
      },
      {
        id: "finish",
        kind: "performance-lifecycle",
        summary: "等待随机评论播放完成，结束演出并结束 LevelGraph。",
        sourceTaskTypes: [
          TYPE.waitSimpleTalkFinish,
          "RPG.GameCore.EndPerformance",
          "RPG.GameCore.WaitPerformanceEnd",
          "RPG.GameCore.FinishLevelGraph",
        ],
      },
    ],
    eventBus: [
      {
        signal: "100010162_Get",
        emittedBy: "intro",
        resumes: "character-score",
      },
      {
        signal: "100010162_End",
        emittedBy: "every character-score branch",
        resumes: "random-comment",
      },
      ...specialSignals.map(signal => ({
        signal,
        emittedBy: branches
          .filter(branch => branch.emittedSignals.includes(signal))
          .map(branch => branch.index),
        resumes: null,
        externalConsumer:
          signal === "Mission_414010501"
            ? achievementSubMission.MissionJsonPath
            : null,
        note:
          signal === "Mission_414010501"
            ? "当前 Act 内没有对应 WaitCustomString；外部任务图接收后完成隐藏任务，并由 FinishWay 解锁成就。"
            : "当前 Act 内没有对应 WaitCustomString；这是向外部图发送的副作用。",
      })),
    ],
  },
  diagnostics: {
    sourceTypeCounts: countTypes(act),
    switchBranchCount: branches.length,
    avatarPredicateBranchCount: branches.filter(
      branch => branch.condition.kind === "local-player-avatar-in",
    ).length,
    trailblazerPredicateBranchCount: branches.filter(
      branch => branch.condition.kind === "local-player-is-trailblazer",
    ).length,
    distinctAvatarIdCount: new Set(allAvatarIds).size,
    duplicateAvatarIds,
    talkReferenceCount: allTalkLines.length,
    distinctTalkSentenceIdCount: new Set(allTalkLines.map(line => line.id)).size,
    randomChoiceCount: randomChoices.length,
    randomWeightSum,
    characterScoreRowCount: characterScoreRows.length,
    elationCharacterCount: characterScoreRows.filter(
      row => row.avatar.path?.id === "Elation",
    ).length,
    missingTalkSentenceIds,
    missingAvatarIds,
    warnings: [
      ...(duplicateAvatarIds.length
        ? [
            `角色 ID ${duplicateAvatarIds.join(", ")} 在 SwitchCase 中重复；两条分支必须同时保留，实际执行一条还是两条取决于未序列化的 WithBreak 运行时默认值。`,
          ]
        : []),
      "SwitchCase 没有显式默认分支；未来新增但尚未写入本文件的角色可能无法发出 End 信号。",
      "CHS 文案保留了 <unbreak> 等 Unity 富文本标签和 {NICKNAME} 等运行时占位符。",
    ],
  },
};

assert.equal(missingTalkSentenceIds.length, 0, "some TalkSentence IDs were not resolved");
assert.equal(missingAvatarIds.length, 0, "some Avatar IDs were not resolved");
assert.equal(
  characterScoreRows.length,
  new Set(allAvatarIds).size + 1,
  "character score table should contain every distinct avatar plus Trailblazer",
);
assert(
  branches.every(branch => branch.emittedSignals.includes("100010162_End")),
  "not every character branch emits 100010162_End",
);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`wrote ${path.relative(packageRoot, outputPath)}`);
console.log(
  JSON.stringify(
    {
      branches: output.diagnostics.switchBranchCount,
      avatars: output.diagnostics.distinctAvatarIdCount,
      talkReferences: output.diagnostics.talkReferenceCount,
      uniqueTalkSentences: output.diagnostics.distinctTalkSentenceIdCount,
      randomChoices: output.diagnostics.randomChoiceCount,
      characterScoreRows: output.diagnostics.characterScoreRowCount,
      linkedAchievement: output.case.externalAssociations[0].achievement.title,
      missingTalkSentenceIds,
      missingAvatarIds,
    },
    null,
    2,
  ),
);
