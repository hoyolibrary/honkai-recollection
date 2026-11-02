# TalkSentence 数据关联与解析报告

> 基于 2026-08-27 对以下仓库/数据的对照：
>
> - [M1k0t0/StarRail_Dialogue_Browser](https://github.com/M1k0t0/StarRail_Dialogue_Browser)（已克隆到 `E:\dev\git\StarRail_Dialogue_Browser`）
> - [mrzjy/StarrailDialog](https://github.com/mrzjy/StarrailDialog)（已克隆到 `E:\dev\git\StarrailDialog`）
> - [DimbreathBot/TurnBasedGameData](https://github.com/DimbreathBot/TurnBasedGameData) 根目录子模块 `extern/TurnBasedGameData`（本项目与 CLI 均通过各自的 `data` symlink 访问）
> - 本仓库 `packages/cli-hsr` 现有 Extractor（`TalkSentenceConfig` 扁平提取 + `MainMission` 图）

---

## 1. 结论先行

`TalkSentenceConfig.json` **不是剧情图，只是台词字典**。

- Excel 行：`TalkSentenceID → (说话人 Hash, 正文 Hash, 可选 VoiceID)`
- 真正把台词排成「一段对话 / 一个选项树 / 一次任务演出」的，是 `Config/Level/**` 与 `Story/**` 里的任务图 JSON（`OnStartSequece` + `TaskList`）
- 本仓库当前只拉了 `ExcelOutput` + `TextMap`，因此 **无法从现有数据直接把台词挂到主线任务上**
- Dialogue Browser 明确了这条链路，但只覆盖任务演出里最常见的两种 task（`PlayAndWaitSimpleTalk` / `PlayOptionTalk`），漏掉了现场旁白、气泡、市政闲聊、模拟宇宙等多种引用

本地 Dimbreath 数据扫描（跳过 `TalkSentenceConfig` 自身）：

| 指标 | 数量 |
|------|------|
| 被 Config/Story 引用到的不重复 `TalkSentenceID` | 128643 |
| 本仓库当前抽出的台词行（较新数据） | 240488 |
| `Config/Level/Mission` 任务目录 | 2567 |
| 其中含 `Act/` | 1552 |
| `Act/*.json` | 13058 |
| `Story/Mission/*.json` | 693 |
| `Story/Discussion/*.json` | 4353 |

约一半台词不在「任务 Act/Story/DS」图里，散落在 NPC 闲聊、市政、活动、道具对话，或根本未被图引用。

---

## 2. 分层模型

```
ExcelOutput/MainMission.json          任务元数据（名称、章节、后继）
ExcelOutput/SubMission.json           子任务目标/描述文案
ExcelOutput/TalkSentenceConfig.json   台词字典
TextMap/TextMap{lang}.json            Hash → 文本

Config/Level/Mission/{MainMissionID}/
  MissionInfo_{id}.json               子任务起止列表
  Mission_{SubMissionID}.json         关卡逻辑：触发演出 / 现场旁白 / 完成子任务
  Talk/Talk_{id}.json                 薄封装：TriggerPerformance → Act
  Act/Act{PerformanceID}.json         D 类对白演出（主对话图）
  CS{PerformanceID}.json              A 类过场（Timeline，通常无台词 ID）

Story/Mission/{MainMissionID}/Story{id}.json     C 类演出（Timeline + 选项）
Story/Discussion/Mission/{id}/DS{id}.json        讨论演出（列车/众人围谈，结构同 Act）
```

本仓库已提取上层 Excel（`mission/graph.json`、`submission.json`、`scenario/talksentence.json`）。缺的是中间的 **Performance / TaskList 图**。

---

## 3. 任务如何点到台词

### 3.1 目录即主键

`Config/Level/Mission/{MainMissionID}/` 的文件夹名等于 `MainMission.MainMissionID`。

以开场任务 `1000201`（「风暴降临前」一类）为例：

| 文件 | 作用 |
|------|------|
| `MissionInfo_1000201.json` | `StartSubMissionList: [100020104]`，`FinishSubMissionList: [100020109]` |
| `Mission_100020101.json` | `TriggerPerformance D/100020102` 再 `A/100020101`，然后 `FinishPerformanceMission` |
| `Act/Act100020102.json` | `PlaySimpleTalk` 100020201–204（黑屏旁白） |
| `CS100020101.json` | `PerformanceType: A` + `PlayTimeline` 过场 |
| `Mission_100020102.json` | `TriggerPerformance C/100020102` → `Story/Mission/1000201/Story100020102.json` |
| `Act/Act100020107.json` | `PlayAndWaitSimpleTalk` + `PlayOptionTalk`，选项用 `TalkSentence_100020242` 等自定义字符串分支 |

子任务 ID 通常是 `MainMissionID` 后再拼两位（`1000201` + `04` → `100020104`），但不能当唯一编码规则，活动任务会打散。

### 3.2 `TriggerPerformance`：任务逻辑 → 演出文件

`Mission_*.json` / `Talk_*.json` 用：

```json
{
  "$type": "RPG.GameCore.TriggerPerformance",
  "PerformanceType": "D",
  "PerformanceID": 100020121
}
```

`PerformanceType` + `PerformanceID` 决定读哪份演出：

| Type | 含义 | 文件 |
|------|------|------|
| `A` | Cutscene | `Config/Level/Mission/{mid}/CS{id}.json`，`PlayTimeline` `Type: Cutscene` |
| `C` | Story 演出 | `Story/Mission/{mid}/Story{id}.json`，`PlayTimeline` `Type: Story` + 选项 |
| `D` | Dialogue 演出 | 优先 `Act/Act{id}.json`；讨论类另有 `Story/Discussion/.../DS{id}.json` |

`Talk/Talk_*.json` 几乎都是「触发一个 D 类 Act 后 `FinishLevelGraph`」，本身不含台词。

`ExcelOutput/PerformanceSubMissionLink.json` 只有约 76 行（`C`/`D`/`PlayVideo` → `SubMissionID`），是特例表，**不是**通用关联。

### 3.3 演出 JSON 内部：sequence = 对话块

所有 Act / Story / DS / 部分 Mission_ 共用同一套任务图（字段名拼写就是 `OnStartSequece`）：

```
OnStartSequece[]          // 并行/分支的若干序列
  └─ TaskList[]
       ├─ PlayAndWaitSimpleTalk.SimpleTalkList[].TalkSentenceID   顺序对白
       ├─ PlaySimpleTalk.SimpleTalkList[].TalkSentenceID          非等待对白（黑屏旁白等）
       ├─ PlayOptionTalk.OptionList[].TalkSentenceID              玩家选项
       │     └─ TriggerCustomString = "TalkSentence_{id}"
       ├─ WaitCustomString.CustomString.Value                     等选项/汇合
       ├─ TriggerCustomString                                     触发后续序列（汇合）
       └─ EndPerformance / FinishLevelGraph
```

**选项分支**不是树形 JSON，而是「选项发出 `TalkSentence_X` → 另一个 sequence 的 `WaitCustomString` 接到 X」。多个分支末尾可以再 `TriggerCustomString` 汇合到同一后续。

Dialogue Browser 的核心就是把这个事件总线还原成树。

---

## 4. Dialogue Browser 怎么解析

入口：`build_dialogue_db.py`。

### 4.1 读入

1. `ExcelOutput/TalkSentenceConfig.json` → `{id: {name_hash, text_hash}}`（无 `TalkSentenceText` 的行丢弃）
2. `TextMap/TextMap{lang}.json`（含分片 `_0/_1` 与 `TextMapMain*`）
3. 三类文件，**同一套** `process_act_file()`：
   - `Config/Level/Mission/*/Act/*.json`
   - `Story/Discussion/Mission/*/*.json`
   - `Story/Mission/*/*.json`

`mission_id` 取路径里 `Mission/` 下一级目录名（即 `MainMissionID`）。`act_file` 取文件名去扩展名（`Act103040203` / `DS103010102` / `Story100020102`）。

### 4.2 写入 SQLite

| 表 | 含义 |
|----|------|
| `talk_sentence` | 全量表，ID / name_hash / text_hash |
| `dialogue_group` | 一个文件里的一个 `OnStartSequece` 项；可带 `wait_custom_string` |
| `dialogue_line` | `simple_talk` 或 `option_talk`，选项带 `trigger_custom_string` |
| `group_triggers` | 该 sequence 发出的 `TriggerCustomString`（汇合边） |
| `file_talk_ref` | 只在 `TalkSentence_{id}` 自定义串里出现、未作为正式台词行的 ID |
| `text_map` | hash × lang |

语言视图：

- `v_dialogue_{lang}`：已挂到 Act/Story/DS 的行
- `v_file_ref_{lang}`：仅被自定义串引用
- `v_standalone_{lang}`：**既不在 dialogue_line 也不在 file_talk_ref** 的台词（大量 NPC/活动/未引用行）

无说话人 Hash 时显示 `{NICKNAME}`。

### 4.3 浏览时如何还原分支

TUI（`dialogue_tui.py`）不改库，按文件即时拼树：

1. `wait_custom_string is NULL` 的 group = 主干
2. 选项的 `trigger_custom_string` → 等该串的 group = 选项后续
3. `group_triggers` 把子分支挂回父分支（多选项汇合）
4. `TalkSentence_\d+` 的 wait 串若该 ID 未作为正式行出现，则内联成一句 NPC 台词

这与 `mrzjy/StarrailDialog` 的 `parse_on_sequence` + `merge_on_sequence_sessions` 是同一套约定，后者只扫 `Story/Mission`，不做 Act/DS，也不建库。

---

## 5. 引用面：远不止 Act

对 `Config/Level/{Mission,NPCDialogue,PropDialogue,RogueDialogue,EventMission,TrainVisitor,GameplayMission,MunicipalChatConfig,Raid,Tutorial}` + `Story` 扫描 `TalkSentenceID`：

| `$type` | 次数 | 说明 | Dialogue Browser |
|---------|------|------|------------------|
| `PlayAndWaitSimpleTalk` | 81915 | 任务对白主体 | 有 |
| `OptionTalkInfo`（`PlayOptionTalk`） | 39285 | 玩家选项 | 有 |
| `PlaySimpleTalk` | 7054 | 不等待对白；**Act 里也有**（如 `Act100020102` 黑屏旁白） | **无** |
| `PlayMissionTalk` | 4644 | 走图现场旁白，写在 `Mission_*.json` | **无** |
| `MunicipalChatActionTalk` | 4031 | 城镇 NPC 闲聊 | 无 |
| `PlayAndWaitRogueSimpleTalk` / `PlayRogueOptionTalk` / `PlayRogueSimpleTalk` | ~5000 | 模拟宇宙对话 | 无 |
| `PlayMultiVoiceTalk` | 775 | 多语音句，对应 `TalkSentenceMultiVoice.json` | 无 |
| `PlayNPCBubbleTalk` / `PlayNPCSingleBubbleTalk` | ~400 | 气泡 | 无 |
| `PerformanceTransition` / `PlayScreenTransfer` / `PlayFullScreenTransfer` / `PerformanceEndBlackText` | ~1300 | 转场黑字 | 无 |
| `PlayOrigamiTraceTalk` / `PlayAeonTalk` / `BattlePlayTalk` / `DiceCombatOptionTalkInfo` | 少量 | 玩法/战斗/战力党 | 无 |

按文件桶（引用次数，非去重 ID）：

| 桶 | 次数 |
|----|------|
| `Mission/Act` | 117640 |
| `Story/Discussion` | 13103 |
| `MunicipalChat` | 4031 |
| `Mission/Mission_` | 2675 |
| `PropDialogue` | 2461 |
| `NPCDialogue` | 1928 |
| `Story/Mission` | 1361 |
| `RogueDialogue` 等 | 更少 |

Excel 里另有直接挂 `TalkSentenceID` 的表（**不是**任务图）：

- `InclinationText.json`（~686）：对话选项 → 开拓者性格倾向，社区 datamine 成就常用
- `TalkSentenceMultiVoice.json`（~985）：一句对多 `VoiceID`
- `ChimeraDuelMaster.json`、`MazePuzzleOrigamiColony.json`：活动/解谜

`DialogueNPC.json` 不直接存 `TalkSentenceID`，而是 `ActPath` 指到 `Config/Level/NPC/**` 的对话图。

---

## 6. 和本仓库的差距

| 能力 | cli-hsr 现在 | Dialogue Browser | StarrailDialog |
|------|--------------|------------------|----------------|
| 台词字典 | `scenario/talksentence.json` | `talk_sentence` + TextMap | `load_sentence_map` |
| 主线元数据 | `mission/graph.json` 等 | 不用 Excel 任务名，只用目录 ID | `get_missions.py` + `MissionInfo_*` |
| Act 对白图 | 无（未下载 Config） | 有 | 无 |
| Story / DS | 无 | 有 | 仅 Story |
| 选项分支还原 | 无 | 有 | 有（Story） |
| `PlaySimpleTalk` / `PlayMissionTalk` | 无 | 无 | 无 |
| NPC / 市政 / Rogue | 无 | standalone 堆里 | 列车访客、短信另表 |
| 数据拉取 | `download.ts` 只拉 `ExcelOutput`,`TextMap` | 整仓 TurnBasedGameData | 整仓 StarRailData |

因此：

1. **「台词属于哪个主线任务」** 的权威边是  
   `TalkSentenceID` ← Act/Story/DS/Mission_ ← 文件夹 `{MainMissionID}` ← 已有 `HsrMainMission`
2. 仅靠 `TalkSentenceID` 前缀猜任务会误伤（活动 `80xxxxx`、模拟宇宙 `403xxxxx`、市政 `50xxxxx` 大量共用字典）
3. 要做关联，必须把 `Config/Level/Mission`、`Story/Mission`、`Story/Discussion` 纳入拉取范围；体积远大于 Excel，适合按目录增量拉，不要整仓 ConfigAbility

---

## 7. 若要在本仓库落地，建议的解析顺序

不要一次做成 Dialogue Browser 的全量 SQLite。按本仓库现有 `scenario/` + `mission/` 切三层：

**L0 字典（已有）**  
`scenario/talksentence.json`：`id / name / text / voiceId`

**L1 引用索引（下一步最小增量）**  
扫 Act / Story / DS / `Mission_*.json`，输出：

```ts
interface HsrTalkRef {
  talkSentenceId: number;
  mainMissionId: number;          // 路径 Mission/{id}
  source: "act" | "story" | "ds" | "mission_field";
  file: string;                   // Act100020107
  taskType: string;               // PlayAndWaitSimpleTalk / PlayOptionTalk / PlaySimpleTalk / PlayMissionTalk
}
```

即可回答「这句台词出现在哪个任务、哪类演出」。`PlaySimpleTalk` 必须算进去，否则开场黑屏旁白会丢。

**L2 对话块 + 选项树（对齐 Browser）**  
按 `(file, sequenceIndex)` 建 group：顺序行、`option_talk` + `triggerCustomString`、`waitCustomString`、`TriggerCustomString` 汇合。输出挂到 `scenario/{mainMissionId}.json` 或 `scenario/acts/{file}.json`，再用 `mainMissionId` join 现有 `mission/graph.json`。

**L3 可选**  
MunicipalChat / NPCDialogue / RogueDialogue / InclinationText，与主线任务图无关，不要塞进 L2。

拉取配置建议在 `download.ts` 增加目录：

```ts
dirs: ["ExcelOutput", "TextMap", "Config/Level/Mission", "Story/Mission", "Story/Discussion"]
```

不必拉整个 `Config/`。

---

## 8. 解析时的坑

1. 字段名就是 `OnStartSequece`（少一个 c），不要「修正」去读 `OnStartSequence`
2. `PlaySimpleTalk` ≠ `PlayAndWaitSimpleTalk`，Browser 漏了前者
3. `TalkSentenceID` 偶发是 `{ Value: number }`（如 `PlayNPCSingleBubbleTalk`），不能假定恒为 number
4. 选项 `TriggerCustomString` 多数为 `TalkSentence_{sid}`，但也可以是任意串（`100020109_Talk`、`100020104_MissionTalk`）
5. 同一 `PerformanceID` 可能同时存在 `Act{id}.json` 与 `DS{id}.json`，内容可部分重叠（如 `103010102`），关联时要保留 `source`
6. `VoiceID` 对文本无用；多语音走 `TalkSentenceMultiVoice.VoiceIDList`
7. Hash 必须 `json-bigint`，与现有 TextMap 一致
8. Dimbreath 本地仓较旧，统计数字会小于当前 `cli-hsr/data`，结构不变

---

## 9. 参考实现位置

| 逻辑 | 位置 |
|------|------|
| 字典加载、Act/DS/Story 扫描、分支表 | `E:\dev\git\StarRail_Dialogue_Browser\build_dialogue_db.py` |
| 选项树还原、standalone 分类 | `E:\dev\git\StarRail_Dialogue_Browser\dialogue_tui.py` |
| Story-only 线性化、`TriggerCustomString` → `next_TalkSentenceID` | `E:\dev\git\StarrailDialog\util\common.py` `parse_on_sequence` |
| MissionInfo + 子任务文案 | `E:\dev\git\StarrailDialog\get_missions.py` |
| 本仓库台词扁平提取 | `packages/cli-hsr/extract/mission/talksentence.ts` |
| 本仓库任务图（Excel only） | `packages/cli-hsr/extract/mission/MainMissionExtractor.ts` |
| 样本任务图 | `extern/TurnBasedGameData/Config/Level/Mission/1000201/` |
