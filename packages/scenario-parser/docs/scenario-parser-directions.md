# 剧情解析：已知信息、结论与方向

> 整理日期 2026-08-30（2026-09-25 增补第 5 节；2026-09-26 增补第 6 节）。关联扫描见 [talksentence-relations.md](./talksentence-relations.md)。
> 「定分枪」案例的实地解析结果见 [case-tests/act100010162/report.md](../case-tests/act100010162/report.md)。
> 「亏成首富」章节案例（数据可得性边界 + 代理章节分支格式实测）见 [case-tests/chapter105007/report.md](../case-tests/chapter105007/report.md)。
> 模拟宇宙 / 差分宇宙案例（剧情入口、事件选项文本与特殊控制边）见 [case-tests/rogue-dialogue/report.md](../case-tests/rogue-dialogue/report.md)。
>
> 本文只收已经核对过的事实、现阶段结论，以及下一步可以考虑的方向。不规定处理流程、输出数据结构或消费端交互。

参考仓库（均在 `E:\dev\git`）：

- [M1k0t0/StarRail_Dialogue_Browser](https://github.com/M1k0t0/StarRail_Dialogue_Browser)
- [mrzjy/StarrailDialog](https://github.com/mrzjy/StarrailDialog)
- [DimbreathBot/TurnBasedGameData](https://github.com/DimbreathBot/TurnBasedGameData)（根目录子模块 `extern/TurnBasedGameData`；`packages/cli-hsr/data` 与本项目 `data` 均是指向它的 Git symlink）

本仓库现状：`scenario/talksentence.json` 是台词字典；`mission/graph.json` 是 Excel 层任务图；`download.ts` 只拉 `ExcelOutput` + `TextMap`。

---

## 1. 已知信息

### 1.1 数据分三层，台词表不是图

| 层 | 来源 | 作用 |
|----|------|------|
| 字典 | `ExcelOutput/TalkSentenceConfig.json` + TextMap | `TalkSentenceID → 说话人 / 正文 / 可选 VoiceID` |
| 任务元数据 | `MainMission` / `SubMission` / `MissionChapterConfig` | 名称、章节、世界、后继；本仓库已抽成 `mission/graph.json` |
| 演出图 | `Config/Level/**`、`Story/**` | 真正把台词排成一段对话、一次选项、一次任务演出 |

没有 Config/Story，无法从现有 Excel 把台词挂到主线任务上。用 `TalkSentenceID` 前缀猜任务会误伤（活动、模拟宇宙、市政大量共用字典）。

权威边是路径：`TalkSentenceID` ← Act / Story / DS / `Mission_*.json` ← 文件夹名 `{MainMissionID}` ← 已有 `HsrMainMission`。

### 1.2 演出文件怎么对上任务

`Config/Level/Mission/{MainMissionID}/` 的目录名就是 `MainMissionID`。

`Mission_*.json` / `Talk/Talk_*.json` 用 `RPG.GameCore.TriggerPerformance` 点到演出：

| PerformanceType | 含义 | 典型文件 |
|-----------------|------|----------|
| A | Cutscene | `CS{id}.json`，Timeline，通常无台词 ID |
| C | Story | `Story/Mission/{mid}/Story{id}.json` |
| D | Dialogue | 优先 `Act/Act{id}.json`；讨论另有 `Story/Discussion/.../DS{id}.json` |

`Talk/Talk_*.json` 几乎都是「触发一个 D 类 Act 再结束」，本身不含台词。`PerformanceSubMissionLink.json` 只有约 76 行，是特例，不是通用关联。同一 `PerformanceID` 可能同时存在 Act 与 DS，内容可部分重叠，关联时要保留来源。

子任务 ID 常见形态是 `MainMissionID` 再拼两位，活动任务会打散，不能当唯一编码规则。

### 1.3 任务图长什么样

Act / Story / DS / 部分 `Mission_` 共用同一套图：

- 顶层字段名就是 `OnStartSequece`（少一个 c）
- 若干 sequence 并行或分支，每个里面是 `TaskList`
- 选项不是树形 JSON：选项发出 `TriggerCustomString`（多数为 `TalkSentence_{id}`，也可以是任意串），另一个 sequence 用 `WaitCustomString` 接住；分支末尾可以再 `TriggerCustomString` 汇合
- `TalkSentenceID` 偶发是 `{ Value: number }`，不能假定恒为 number
- `VoiceID` 对文本无用；一句对多语音走 `TalkSentenceMultiVoice`

这是事件总线，不是 AST。Dialogue Browser 的核心贡献是把总线还原成可浏览的分支，而不是还原成游戏运行时对象。

### 1.4 `$type` 是什么、参考仓怎么处理

JSON 里的 `"$type": "RPG.GameCore.PlayAndWaitSimpleTalk"` 是游戏 C# 类名（Newtonsoft 类型标签）。文件是这些类的**已序列化实例**，不是待反序列化的程序集。

两个参考仓库都是 Python `json.load` 成 dict，再对 `$type` **字符串白名单**分支：

- 都认：`PlayAndWaitSimpleTalk`、`PlayOptionTalk`、`WaitCustomString`、`TriggerCustomString`
- StarrailDialog 额外认 `EndPerformance`
- 其余类型：Browser 只递归扫嵌套 `TaskList` / `SuccessTaskList` / `FailedTaskList` 里有没有 `TriggerCustomString`；StarrailDialog 直接丢掉
- 认到的立刻拍扁成 SQLite 行或 session dict，浏览时不再碰原始嵌套对象
- **没有** DummyDll、没有 C# 绑定、没有按程序集做强类型反序列化

因此 `$type` 在实践里只是标签，不是「反推完整 GameCore 对象」的入口。参考仓漏掉的是没写进白名单的类型（如 `PlaySimpleTalk`），不是因为缺程序集。

### 1.5 引用面比「主线 Act」宽很多

对 Dimbreath 本地仓扫描（数字会小于当前 `cli-hsr/data`，结构不变）：

| 指标 | 约数 |
|------|------|
| Config/Story 引用到的不重复 `TalkSentenceID` | 12.8 万 |
| 本仓库当前抽出的台词行 | 24.0 万 |
| `Config/Level/Mission` 目录 / 含 Act / Act 文件 | 2567 / 1552 / 13058 |
| `Story/Mission` / `Story/Discussion` | 693 / 4353 |

约一半台词不在任务 Act/Story/DS 图里。

带 `TalkSentenceID` 的 `$type`（次数，非去重 ID）：

| `$type` | 约次数 | 参考仓 |
|---------|--------|--------|
| `PlayAndWaitSimpleTalk` | 81915 | 有 |
| `OptionTalkInfo`（`PlayOptionTalk`） | 39285 | 有 |
| `PlaySimpleTalk` | 7054 | **无**（Act 里也有，如开场黑屏旁白） |
| `PlayMissionTalk` | 4644 | **无**（写在 `Mission_*.json` 的走图旁白） |
| `MunicipalChatActionTalk` | 4031 | 无 |
| Rogue 一组 Simple/Option | ~5000 | 无 |
| `PlayMultiVoiceTalk` | 775 | 无 |
| NPC 气泡 | ~400 | 无 |
| 转场黑字若干 | ~1300 | 无 |
| 折纸 / 星神 / 战斗对白等 | 少量 | 无 |

按文件桶：`Mission/Act` 占绝对多数，其后是 Discussion、市政、`Mission_`、道具对话、NPC 对话、Story。另有 Excel 直挂 ID、不是任务图：`InclinationText`（开拓者倾向）、`TalkSentenceMultiVoice`、部分活动/解谜表。`DialogueNPC` 不存 ID，而是 `ActPath` 指到 `Config/Level/NPC/**`。

### 1.6 类型 dump 与现有工具

星铁是 Unity IL2CPP。盘上 `global-metadata.dat` 加密，原版 Il2CppDumper / 本机 `Il2CppInspector` 对磁盘文件通常无效。`TypeTreeDumper` dump 的是 Unity 引擎 TypeTree，不是 `RPG.GameCore`。

DummyDll / `dump.cs` 能补：完整类列表、继承、字段类型、JSON 因默认值省略的字段。近年客户端字段常混淆，而 Config JSON 对白字段仍是可读名（`TalkSentenceID`、`SimpleTalkList`）。对写解析器，**JSON 字段并集往往比 DummyDll 更有用**。

### 1.7 本仓库已有、还缺什么

已有：台词字典、任务图（含 4.5 千星城 602 归属与章节顺序）、TextMap 打标。

早期调研时尚缺 Config/Story 数据准备与演出图解析；当前数据准备和运行入口见本包 README。

### 1.8 2026-08-30 类型全量扫描

466 个核心类型的逐项继承树、引用来源和分类见独立生成文档 [scenario-type-inheritance-inventory.md](./scenario-type-inheritance-inventory.md)。本节保留汇总结论和解析边界。

这次不再只从 JSON 字段并集推断，而是把实例与程序集元数据交叉起来：

- A：`tool/scenario-type-scan/DummyDll/RPG.GameCore.Config.dll` 及同目录程序集（本地输入，Git 忽略）。用 Mono.Cecil 读取类型、基类和实例字段；没有读取 `dump.cs`。
- B：根目录子模块 `extern/TurnBasedGameData`。遍历 `Config/**/*.json` 与 `Story/**/*.json`，共 132161 个文件、0 个 JSON 解析失败。
- 核心剧情图口径：`Mission/*/Act`、`Mission/*/Talk`、`Mission_*.json`、`Story/Mission`、`Story/Discussion`。全 Config/Story 另用于找任务外对白载荷。
- `$type` 计数是对象实例次数，不是去重 `TalkSentenceID`；数组内每个 `SimpleTalkInfo` / `OptionTalkInfo` 作为一个载荷对象计数。

核心图文件数已经比前次报告中的旧统计大：

| 文件桶 | JSON 文件数 | 不重复 `$type` | `$type` 实例数 |
|--------|------------:|----------------:|----------------:|
| `Config/Level/Mission/*/Act` | 14539 | 280 | 254476 |
| `Config/Level/Mission/*/Talk` | 1226 | 58 | 4179 |
| `Config/Level/Mission/*/Mission_*.json` | 9323 | 300 | 35995 |
| `Story/Mission` | 734 | 38 | 9898 |
| `Story/Discussion` | 4757 | 113 | 86143 |
| **合计** | **30579** | **466（并集）** | **390691** |

> 表中“实例数”按桶相加；同一个 `$type` 可出现在多个桶，所以“不重复 `$type`”不能按行相加。程序集与 B 存在轻微版本差：466 个核心类型中 465 个能在 A 中命中；`RPG.GameCore.TakeEventMission` 在 4 个 `Talk_*.json` 中出现 5 次，但遍历 A 同目录全部 DLL 仍未找到。

#### 1.8.1 继承骨架与规模

核心图 466 个类型按基类族拆分如下。`PredicateConfig` 实际继承 `TaskConfig`，表中为了看清用途单独计数；因此这些族不是程序集全局的互斥集合。

| 类型族 | B 核心图类型数 | B 实例数 | A 中后代数 / 直接子类数 | 解析含义 |
|--------|---------------:|---------:|-------------------------:|----------|
| `TaskConfig`（不含单列 predicate） | 392 | 322292 | 3924 / 2908 | 任务、演出动作、等待器、容器 |
| `PredicateConfig : TaskConfig` | 44 | 2298 | 638 / 623 | 分支条件；L1 引用扫描无需求值 |
| `TargetEvaluator` | 16 | 19399 | 113 / 113 | NPC、Prop、Anchor 等目标选择 |
| 其它 `JsonConfig` | 13 | 46697 | `JsonConfig` 总后代 8538 / 直接子类 2042 | 选项、共享值、转场子结构 |
| A 未命中 | 1 | 5 | - | `TakeEventMission`，按未知 task 保留 |

关键继承链不是很深，但非常宽；同时 task 字段又能递归嵌套 `TaskConfig[]`，这才是 switch 爆炸的来源：

```text
System.Object
└─ JsonConfig
   ├─ TaskConfig                         // TaskEnabled
   │  ├─ PredicateConfig                 // Inverse；条件也是一种 TaskConfig
   │  ├─ CompositeConfig
   │  │  ├─ SequenceConfig               // TaskList[]
   │  │  ├─ SelectorConfig               // TaskList[]
   │  │  └─ RandomConfig                 // TaskList[] + OddsList[]
   │  ├─ SimpleTalkListConfig             // SimpleTalkList: SimpleTalkInfo[]
   │  │  ├─ PlayAndWaitSimpleTalk
   │  │  ├─ PlaySimpleTalk
   │  │  ├─ PlayMissionTalk
   │  │  └─ 其它 4 个程序集派生类
   │  ├─ AdvWaitingEventBase              // 39 个后代，各自带 OnEvent/OnChange 等回调
   │  └─ 大量直接叶子 task
   ├─ OptionTalkInfo
   │  ├─ RogueOptionTalkInfo
   │  ├─ DiceCombatOptionTalkInfo
   │  └─ 其它 2 个派生类
   ├─ SimpleTalkInfo / RogueTalkInfo / BubbleTalkInfo / ...
   └─ TargetSeqOperation
      └─ TargetEvaluator
```

顶层图和 `OnStartSequece[]` 项通常没有 `$type`；稳定结构仍然是 `OnInitSequece` / `OnStartSequece` → 无类型 sequence 对象 → `TaskList[]`。不能期待用一个 C# 顶层类的 `$type` 启动整图反序列化。

#### 1.8.2 对白载荷类型清单

把全量 Config/Story 中直接出现 `TalkSentence*` / 等价 `SentenceID` 的对象，与最近的有类型父对象合并后，得到下面的实际载荷族。这里列的是解析器需要“理解字段语义”的类型，不是所有需要递归经过的 task。

| 族 | 类型与关键字段 | B 全量命中 |
|----|----------------|------------:|
| 通用顺序对白 | `SimpleTalkInfo.TalkSentenceID`；`PlayAndWaitSimpleTalk` / `PlaySimpleTalk` / `PlayMissionTalk` / `PlayRandomMissionTalk` 经 `SimpleTalkListConfig.SimpleTalkList` 承载 | 91964 / 10767 / 9769 / 4 个载荷项 |
| 通用选项 | `OptionTalkInfo.TalkSentenceID + TriggerCustomString`；父 task `PlayOptionTalk.OptionList` | 45692 个带 ID 的 option；核心图 `PlayOptionTalk` 18698 次 |
| 模拟宇宙/差分宇宙 | `RogueTalkInfo`、`RogueOptionTalkInfo`；`PlayAndWaitRogueSimpleTalk`、`PlayRogueSimpleTalk`、`PlayRogueOptionTalk`、`PlayAeonTalk` | 7710 / 2064 / 1293 / 111 个载荷项 |
| NPC / 气泡 | `BubbleTalkInfo`、`PlayNPCBubbleTalk`、`PlayNPCSingleBubbleTalk`、`CollectionPlayBubbleTalk` | 2672 个嵌套 bubble；696 个 single；64 个 collection task |
| 市政 / 五维玩法 | `MunicipalChatActionTalk`、`FiveDimActionBubbleTalkInfo` | 6247 / 2854 个直接载荷 |
| 多语音 | `PlayMultiVoiceTalk.TalkSentenceID` | 985 个；其中核心图 835 个 |
| 转场文字 | `PerformanceTransition.TalkSentenceID`、`PlayScreenTransfer.TalkSentenceID/List`、`PlayFullScreenTransfer.TextInfo.TextList[].TalkSentenceID`、`PerformanceEndBlackText` | 637 / 346 / 739 / 6 个带文字实例或子项 |
| 特殊玩法 | `PlayOrigamiTraceTalk`、`PlayTarotBookTalk`、`BattlePlayTalk`、`PlayMusicRhythmTalk`、`PlayPenaconyEndmostSimpleTalk` | 509 / 238 / 225 / 128 / 15 个载荷项 |
| 动态集合 | `CollectionPlaySimpleTalk`、`CollectionPlayBubbleTalk`、`PlayCollectionMorse` 的 `TalkSentenceIdList: DynamicStringList` | 228 / 64 / 25 个 task；ID 不保证是常量数值 |
| 讨论 / 交互特例 | `DiceCombatOptionTalkInfo`、`ConvincePlayOptionTalk`、`ShowEnterPasswordPage`、`DebateInitialize`、`SelectMissionItem` 及两个 `AddFinishMissionData_*` 的 `SimpleTalk` | 少量，但核心图真实存在 |
| 书页元素 | `Booklet.SentenceElementConfig.SentenceID` | 1437；属于 TarotBook 页面，不是通用任务图 |
| 狸狸通信 | `RPG.Client.PlayAndWaitLimaoNewsTalk`、`PlayLimaoNewsOptionTalk`、`LimaoNewsLimaoIconOptionTalkInfo` | 1009 个顺序载荷、11 个 icon option；另有混淆父类型 |
| 混淆类型 | `PKCEKMCOLPF`、`DOBGLENDOMB`、`GFMKFAPADMA`、`MPIPCMOAOGM`、`APADFFNMMAN` | 分别承载 145 / 32 / 24 / 12 / 8 个直接或嵌套载荷 |

程序集字段补出了 JSON 里经常省略的真正共享关系：

- `PlayAndWaitSimpleTalk`、`PlaySimpleTalk`、`PlayMissionTalk` 都继承 `SimpleTalkListConfig`；它们不应各写一份 `SimpleTalkList` 解析。
- `RogueOptionTalkInfo : OptionTalkInfo`，`DiceCombatOptionTalkInfo : OptionTalkInfo`；选项基本字段可由一个 handler 处理，子类只保留附加字段。
- `PlayAeonTalk : PlayRogueSimpleTalk`；星神对白不是完全独立格式。
- `PlayFullScreenTransfer` 的 ID 不在 task 自身，而在 `ScreenTransferTextInfo -> ScreenTransferSingleTextInfo[]`；只判断当前对象的 `$type` 和当前层字段会漏。
- `PlayNPCSingleBubbleTalk.TalkSentenceID` 是 `DynamicFloat`，`CollectionPlay*` 是 `DynamicStringList`；ID 值类型确实不能统一假定为 number。

Excel 侧另有 8 个明确的直接引用行类型：`InclinationTextRow`、`TalkSentenceMultiVoiceRow`、`ChimeraDuelMasterRow`、`MazePuzzleOrigamiColonyRow`、`SwordTrainingStoryLineRow`、`VisitorBehaviorConfigRow`、`ActivityHipplenDialogueRow`、`TarotMailDataRow`。它们是索引/附加属性，不属于任务图 task。

#### 1.8.3 必须递归穿透的结构类型

这些类型未必自己带台词，但它们的字段中实际藏过对白。与其为每个类型写 switch，更稳妥的规则是：默认递归所有 object/array；遇到注册的语义载荷类型才抽取事件。程序集字段只用于验证哪些字段属于 task/predicate/option 容器。

| 结构 | 已命中的类型 |
|------|--------------|
| 通用组合 | `SequenceConfig`、`SelectorConfig`、`RandomConfig`、`PredicateTaskList`、`PredicateTaskListWithFail`、`SwitchCase`、`GenericSwitchCase`、`PlaySequenceDialogue`、`ScrTrfActTaskList` |
| 等待 / 事件回调 | `WaitGroupEvent`、`WaitEntityEvent`、`WaitEntityEventV2`、`WaitFloorCustomValueChange`、`WaitFloorCustomValueChangeV2`、`WaitFloorSavedValueChangeV2`、`WaitGraphDynamicValueChange`、`WaitMissionCustomValueChange`、`WaitLittleGameCustomEvent`、`WaitLittleGameLevelVarChange` |
| Prop / NPC 回调 | `PropSetupTrigger`、`PropSetupUITrigger`、`PropStateExecute`、`PropStateChangeListenerConfig`、`PropPuzzleEventListener`、`PropSetupHitBox`、`NpcSetupTrigger`、`NpcToPlayerDistanceTrigger` |
| 提交 / 交互回调 | `SelectMissionItem`、`AddFinishMissionData_ConsumeItem`、`AddFinishMissionData_SelectConsumeItem`、`ConsumeMissionItemPerformance`、`ConsumeOrigamiItem`、`ShowEnterPasswordPage`、`WaitPhotoGraphResult` |
| 其它已藏过对白的回调 | `ClientFinishMission`、`PerformanceEndSeq`、`HeliobusSNSQuickPost`、`AdvSetAIMoveTo`、`ShowEnvBuffDialog` |

这张表不是递归白名单。它恰好说明白名单递归不可靠：以后任何新 task 只要增加一个 `TaskConfig[]` 字段，就能把对白藏到新的路径下。默认深度遍历才是兜底；类型表用于语义抽取和诊断。

#### 1.8.4 事件总线与演出生命周期清单

下列类型不直接提供正文，却决定 L2 分支和任务挂接，必须与对白载荷分开建事件：

| 作用 | 类型 | 核心图实例数 |
|------|------|-------------:|
| 等待分支串 | `WaitCustomString` | 55279 |
| 发出分支串 | `TriggerCustomString` | 32610 |
| 对话结束时发串 | `TriggerCustomStringOnDialogEnd` | 593 |
| 串列表 | `TriggerCustomStringList` | 1 |
| 任务图点演出 | `TriggerPerformance` | 3556 |
| 初始化演出 | `LevelPerformanceInitialize` | 19971 |
| Timeline | `PlayTimeline` | 21230 |
| 正常结束 / 等待结束 | `EndPerformance` / `WaitPerformanceEnd` | 22029 / 19952 |
| 完成图 / 完成演出任务 | `FinishLevelGraph` / `FinishPerformanceMission` | 21237 / 6651 |
| 等待对白结束 | `WaitSimpleTalkFinish` / `WaitMissionTalkFinish` / `WaitRogueSimpleTalkFinish` | 2018 / 71 / 6 |

#### 1.8.5 Predicate 与 TargetEvaluator 清单

它们对 L1「找出所有台词 ID」不需要求值，但对 L2/L3 展示“此分支为何可见、由谁说”有用。核心图实际命中的类型如下：

- Predicate（44）：`MLMOAFNJPBG`、`AdvByEntityExist`、`AdventureIsTriggerBattleByNpcMonster`、`ByAnd`、`ByAny`、`ByCheckColonyTrace`、`ByCheckFloorCustomBool`、`ByCheckLineupHeroAvatarID`、`ByCheckRogueExploreWin`、`ByCompareCurrentTeammemberCount`、`ByCompareDynamicValue`、`ByCompareFloorCustomFloat`、`ByCompareFloorCustomFloatV2`、`ByCompareFloorCustomString`、`ByCompareFloorSavedValue`、`ByCompareFloorSavedValueV2`、`ByCompareGraphDynamicFloat`、`ByCompareGroupProperty`、`ByCompareHeartDialTracingNPC`、`ByCompareIsBookAvailable`、`ByCompareItemNum`、`ByCompareItemNumber`、`ByCompareMainMissionState`、`ByCompareMissionBattleWin`、`ByCompareMissionCustomValue`、`ByComparePerformance`、`ByComparePerformanceResult`、`ByComparePropState`、`ByComparePropStateNumber`、`ByCompareQuestGetReward`、`ByCompareQuestProgress`、`ByCompareStoryLineID`、`ByCompareSubMissionState`、`ByCompareSummonUnitCount`、`ByCompareTeamLeaderPath`、`ByCompareTextJoinValue`、`ByCompareVersionFinalMainMission`、`ByCurrentAudioLanguage`、`ByHeroGender`、`ByLocalPlayerAvatarID`、`ByLocalPlayerIsFakeAvatar`、`ByMainMissionFinish`、`ByTargetNpcExists`、`ConvinceByCompareHp`。
- TargetEvaluator（16）：`AdvGroupFetchTargetByString`、`GroupFetchLocalTarget`、`TargetAlias`、`TargetConcat`、`TargetFetchAdvFakeAvatar`、`TargetFetchAdvLocalPlayer`、`TargetFetchAdvMonsterEx`、`TargetFetchAdvNPC`、`TargetFetchAdvNpcEx`、`TargetFetchAdvProp`、`TargetFetchAdvPropEx`、`TargetFetchAnchor`、`TargetFetchAnchorByName`、`TargetFetchDialogueEntity`、`TargetFetchSummonUnit`、`TargetFetchUniqueNameEntity`。

#### 1.8.6 对解析器边界的修正

原先“现阶段不太需要游戏原始类型”的结论过强。更准确的边界是：

1. **不需要把 3924 个 `TaskConfig` 后代全部绑定成运行时 class，也不需要按 466 个核心 `$type` 写 switch。**
2. **需要程序集元数据作为类型目录。** 至少要知道基类族、共享载荷基类、哪些字段是 `TaskConfig[]` / `PredicateConfig` / `TargetEvaluator`，否则会重复实现继承来的字段或漏掉嵌套分支。
3. **运行时解析应是“通用递归 walker + 少量语义 handler registry”。** 未知类型默认保留 `$type`、来源路径和原始字段并继续向下；已知载荷类型抽成 talk / option / control / performance 事件。
4. **类型目录应可重新生成而不是手抄进 TypeScript。** B 的 `TakeEventMission` 已证明 Config 与 DummyDll 可能版本不齐；生成物需要允许 `resolved: false`，不能让强类型反序列化因此整体失败。

---

## 2. 当前结论

1. **瓶颈仍然首先是数据范围，但类型系统不能再完全忽略。** 参考仓能跑起来，是因为只处理最常见的两三种对白 task；全量核心图实际有 466 个 `$type`，A 中 `TaskConfig` 又有 3924 个后代。需要用程序集生成类型目录和共享基类关系，但不需要还原整棵 `RPG.GameCore` 运行时。

2. **不必、也不该先做成「完整 GameCore 反序列化」。** 正确切分不是 giant switch，而是通用深度 walker、可生成的类型目录、少量语义 handler。未知 `$type` 不能直接忽略：保留原始节点并递归所有 object/array；强类型联合只包 talk / option / control / performance 事件，其余保持 opaque。

3. **消费端用途改变了「解析要完整到什么程度」。** Browser 是 TUI 查库，StarrailDialog 是把 Story 线性化成 jsonl 语料。本仓库要给网页展示，同一份演出可以按任务、按文件、按说话人、按检索、按分支或按时间线多种看。因此不必先压成唯一的「对话树」或唯一的线性 session；保留来源（哪类演出、哪个 `$type`、哪个文件）比过早归一更有价值。

4. **主线挂接已经有现成锚点。** 任务侧用目录名 join `graph.json` 即可，不要另建一套任务顺序。演出侧不要假设每个 Act 都能完美还原成树：CustomString 不一定是 `TalkSentence_{id}`，汇合、空 sequence、仅 Trigger 无台词都存在。

5. **覆盖「更广」至少有两轴，不要混成一个目标。**
   - 任务内：补 Browser 漏的 `PlaySimpleTalk` / `PlayMissionTalk` / 转场黑字，以及 Act 之外的 Story、DS、`Mission_` 现场旁白
   - 任务外：市政、NPC、道具、模拟宇宙、气泡——与编年史主线不是同一入口，但可以共用台词字典

6. **约一半台词可能长期没有演出图。** 它们仍是合法字典行（资料、未引用、或图尚未纳入拉取范围）。解析器应允许「有字典无图」，而不是把挂不上任务的行当成失败。

7. **Config 体积远大于 Excel。** 值得拉的是 `Config/Level/Mission`、`Story/Mission`、`Story/Discussion`；整仓 `Config/`（含 Ability 等）对剧情没有必要。NPC / 市政 / Rogue 是另一次范围决定。

8. **DummyDll 不应成为运行时依赖，但适合成为构建期类型目录来源。** 这次 Mono.Cecil 扫描已经证明它能消除 `SimpleTalkListConfig`、`OptionTalkInfo`、Rogue 子类等重复判断。L1/L2 运行时仍只读 JSON；类型目录可离线重生成，并容忍 B 中类型在 A 中不存在。

---

## 3. 可以考虑的方向

下面是下一步的参考轴，不是实施顺序。可以并行想，不必一次做完。

### 3.1 解析覆盖：实例决定优先级，程序集决定归族

先在真实 Config 上统计「哪些 `$type` 真正带 `TalkSentenceID`（或等价 Hash 文本）」，再用程序集把它们归到共享基类。不能从 C# 继承树把 3924 个 `TaskConfig` 后代全部变成 handler，也不能无视 `SimpleTalkListConfig` / `OptionTalkInfo` 的继承关系逐个复制逻辑。

优先补参考仓明确漏掉、且出现在任务演出里的类型（`PlaySimpleTalk`、`PlayMissionTalk`）。市政 / Rogue / 气泡 / 多语音 / 转场黑字可以当作同一解析内核上的不同来源标签，而不是另一套引擎。

对未知 `$type`：递归所有 object/array 找对白，并保留来源与原始节点，避免静默丢句。不要只认 `TaskList` / `SuccessTaskList` / `FailedTaskList` 三个字段；实测还有 `OnEvent`、`OnChange`、`Dialogues`、`DefaultTask`、`TextInfo.TextList` 等路径。不必为未知类型建完整字段模型。

### 3.2 关联：路径为权威，Excel 为展示名

任务归属以 `Mission/{id}` 目录为准，再 join 已有 `graph.json`（章节、世界、主线/间章/同行）。`TriggerPerformance` 用来理解「这段 Act 是被哪个子任务点起来的」，不是台词主键。

需要心里有数的特例：Act 与 DS 同 ID；`Talk_` 只是跳板；A 类 CS 往往没有台词；`DialogueNPC.ActPath` 指向 NPC 目录而不是主线目录。倾向表、多语音表是字典的附加属性，不是图的边。

### 3.3 图的读法：同时保留「事件」和「可读对话」，不要只留一种

事件总线（Wait / Trigger CustomString）适合无损保存和以后重解释。可读对话（顺序句 + 选项 + 汇合）适合页面展示。参考仓各自只做了一种极端：Browser 近乎按文件拼树，StarrailDialog 把 Story 收成线性 session。

消费端更灵活时，更值得考虑的是：解析阶段不要把其中一种读法做成唯一真相。线性化会丢掉并列选项；只存树也可能不适合检索、旁白、走图现场句。允许同一演出被不同页面用不同读法打开。

### 3.4 展示入口：挂编年史，但不要只从编年史进去

主线/间章适合从已有编年史任务点进去看「这一段演了什么」。资料库式全文检索、按说话人、按未挂接台词，适合消化那一半没有 Act 图的字典行。NPC / 市政 / 模拟宇宙更像独立图鉴，硬塞进主线时间轴会再次出现「章节顺序很怪」这类错位。

因为是网页而不是 TUI，结果形态可以比 Browser 松：一段演出可以是对话流、选项列表、旁白/黑屏、过场备注，也可以只是「这些台词在这个任务里出现过」的索引。不需要先达到 TUI 那种可逐步点开的完整树，才算解析成功。

### 3.5 数据拉取：按目录增量，剧情解析与 Excel 提取解耦

剧情解析依赖 Config/Story，和现有 Excel Extractor 生命周期不同。可以考虑：字典继续走现有 `talksentence.ts`；演出扫描单独面对新增目录；不必等 DummyDll，也不必把 Ability、战斗配置一并拉下来。

Dimbreath 本地仓足以验证结构和 `$type` 白名单；上线数据仍应以本仓库当前版本的 Config 为准（4.5 比 Dimbreath 新）。

### 3.6 类型信息：实例与程序集双向校验

字段是否真实出现、序列化名是什么，仍以实例并集为准（和现有 schema 镜像 Excel 的习惯一致）。基类、字段声明类型、共享载荷结构则以 DummyDll 为准。两者交叉后生成 type catalog；`$type` 仍是运行时判别标签，不直接触发 CLR 反序列化。

不需要 `dump.cs`。结构化 DummyDll 已足够回答继承与字段签名；大量混淆字段仍以 B 中可读序列化名和实例路径为准。A/B 版本不一致时，catalog 标记未解析类型并继续处理，不能退回“强类型必须全命中”的架构。

### 3.7 质量预期：用「能挂上的比例」衡量，而不是「全部台词进树」

可观察的大致上限已经知道：任务图只能覆盖引用到的那一半 ID；任务图内部 Browser 又只覆盖了最常见两种 task。更广的解析器应能分别回答：

- 字典行里，多少能指到至少一个演出文件
- 演出文件里，多少 `TalkSentenceID` 被白名单 `$type` 吃到
- 仍作为 standalone 的是未拉目录、未支持 `$type`，还是源数据就没有图

这比追求「每句都进主线对话树」更符合数据真实形状。

### 3.8 明确不必作为目标的事

- 复刻 Dialogue Browser 的 SQLite 全库或 TUI 点选树
- 把全部 `RPG.GameCore.*` 映射成 TypeScript class
- 为核心图里 466 个 `$type` 各写一个 switch case
- 把 DummyDll 作为生产运行时的反序列化依赖
- 用任务 ID 规则替代路径关联
- 把市政闲聊、模拟宇宙、NPC 气泡默认编进主线时间轴
- 为了字段完整而先 dump 程序集再开始看 JSON

---

## 4. 和前一份报告的关系

[talksentence-relations.md](./talksentence-relations.md) 记录了链路、参考仓算法、引用面统计和一组「若要落地」的分层建议（字典 / 引用索引 / 对话块）。那份分层是一种可行切法，不是必须遵守的工序。

本文在那份扫描之上补了三点：参考仓对 `$type` 只做字符串白名单；消费端展示允许结果比「一棵对话树」更松；A/B 交叉扫描确认核心图已有 466 个类型，适合“通用递归 + 类型目录 + 语义 handler”，不适合继续扩 giant switch。下一步若动手，以前一份报告的路径关联为基础，以本文 1.8 的类型清单和第 3 节为解析边界。

---

## 5. 2026-09-25 增补：「亏成首富」章节案例带来的修正

> 案例全文见 [case-tests/chapter105007/report.md](../case-tests/chapter105007/report.md)。以下只收对本文既有结论的影响。

### 5.1 数据可得性：整章「有字典无图」真实发生

chapter 105007（4.5.1 面板内容）在 4.5.0 基础包中：任务/子任务/演出索引/台词字典（1805 句）齐全，但 114 条 Performance 索引指向的演出图文件全部不存在；姊妹章节 105008 同样缺失，而其 Branch 支线（2054500–2054502）与上一代章节 104006 完整。子模块与上游 main 一致，非同步问题。

对 §1.7 / §3.5 的修正：拉取范围方案要加两件事——① 以 Performance 表行做**路径存在性巡检**（死路径比例即数据版本滞后警报）；② 把 `MissionInfo_*.partial.json`（子任务结构：楼层/组/路点/接取参数）与 `Config/Level/GroupGraph/F*`（至少任务引用的楼层）纳入拉取清单，它们在无演出图时仍可重建章节骨架。

对 §2.6 的补充：字典 ID 前缀与任务存在稳定映射（1552x ↔ 105452x，`155`+任务末两位+区块位）。无图章节可先产出「ID 顺序文本视图」（案例 dialogue.chs.md 即形态），图入库后升级为分支视图。

### 5.2 DS 时代格式：正文不在图内，白名单扫 ID 会静默丢台词

新一代开拓续闻对白主体是 Discussion 图：图内显式 `TalkSentenceID` 只有选项文本；正文由 `PlayTimeline` 的 `.playable` 播放，句子只存在于字典。分支/汇合边有两种形态：`TalkSentence_{id}`（句子锚点，id 即目标序列首句）与 `Wait_Option_{file}_{n}` 枢纽串（选项组间汇合 / 重试回环 / 跳组）。

由此提出**锚点区间归属法**：等待句子锚点 w 的序列拥有字典区间 [w, 下一更大锚点) 内的非锚点句；入口序列拥有 [块起点, 首锚点)；块起点自最小锚点向下按字典连续性推定。在 1040537 全部 11 个 DS/Story 块上 0 孤句、0 未展开。§3.1 的「实例统计 + 白名单」方案必须补这条路径，否则 DS 类演出只能拿到选项文本。

### 5.3 类型调用面：主线规格只用 466 类中的约 8%

同规格完整章节 104006（196 个图文件）实测仅 36 种 `$type`（1945 实例）：选项系 500、生命周期 4 件套各 ~132、Timeline 343、事件总线 369、SimpleTalk 21（仅 Act）、走图对白 15（仅 Mission_）。类型目录优先级应以「主线规格调用面」为第一梯队；类型处置三分法（完整展开 / 折叠一行 / 直接跳过）与混淆类型按字段形状识别（实测 `NONAIBLAJKA` = TriggerPerformance）见案例报告 §6。

### 5.4 章节归属新锚点

`ActivityPanel`（行 80030 → `QuestMainStory451Panel` → `UnlockConditions`/`FinishConditions`）给出章节→版本面板→解锁链的现成边，建议并入 `mission/graph.json` 输出。

### 5.5 两级剧情提取：先快速浏览文本，后完整分支形式

**实测校验（2026-09-25，对照游戏内实际剧情）**：chapter 105007 的 ID 顺序整理（dialogue.chs.md）与真实剧情基本一致，仅两类已知偏差——玩家选项被摊平成顺序行、部分旁白与全屏文本（转场黑字类）顺序略有差异；在「理解故事内容」级别足够。这把「句 ID 顺序 ≈ 演出顺序」从假设升级为实测结论，同时给出了快速视图的误差特性。同日人工复核 1040537 的分支重建（proxy-1040537.chs.md）未发现明显问题。

据此把剧情提取明确分两级：

| | Tier 1 快速浏览文本 | Tier 2 完整分支形式 |
|---|---|---|
| 驱动 | 字典（TalkSentenceConfig + TextMap + 任务顺序线索） | 演出图（DS/Act/Story + 字典） |
| 数据依赖 | 仅 ExcelOutput，随字典永远最新 | 需 Config/Story 文件入库 |
| 形态 | 按任务分节、句 ID 顺序、带说话人（dialogue.chs.md） | 选项嵌套分支 + 汇合跳转引用（proxy-1040537.chs.md） |
| 已知误差 | 选项摊平、跨块次序、转场黑字顺序 | 待全量回归（见 5.6） |
| 无图章节 | 可产（105007 已实测） | 不可产，待图入库后升级 |

分级的理由不只是工作量：Config/Story/Stages 的还原链路比 ExcelOutput 复杂，**存在整体滞后于 ExcelOutput 的常态**（§5.1 的整章空洞即实证）。两级分离后，数据滞后只影响 Tier 2；Tier 1 始终跟最新字典走，新版本剧情上线即可先出快速浏览。消费端同一章节可以先挂 Tier 1 视图，Tier 2 产物就绪后替换或并列。

**Tier 1 已落地（2026-09-25；2026-09-27 重写归属与渲染）**：`src/extract-dialogue-quick.mjs`（`npm run extract:dialogue`）为全部 Main/Gap 任务生成速览文档到 `output/dialogue/`（世界目录 → 章节文档）。全量落地时发现「字典驱动、无需图」只在 10545xx 编号族成立——其余世代的句块归属仍需图内引用佐证。2026-09-27 针对三类实测缺陷重写：

- **文件归属先于目录**：演出图文件可能物理存放在兄弟任务目录下（实测 1020702 的全部 `Mission_/Act/Story` 文件都在 1020701/ 内，目录归属会把整段台词记给邻居、任务本身整段丢失）。子任务ID→MainMissionID 权威映射由 cli-hsr 源头生成（`MainMissionExtractor` 扫描全部 `MissionInfo_*.partial.json`，随 mission 产物输出 `subowner.json`），提取器直接消费、不再重扫 Config——同一归属口径只维护一处；文件名带子任务/演出号者按映射归属，其余按目录兜底；归属方非 Main/Gap 的文件不参与归属。同时把 `Mission_*.json`（走图旁白）与 `Talk_*.json` 纳入扫描（此前只扫 Act/Story/DS，实测 178 个任务的走图对白整体缺失，1043701 这类被误判为「纯 Timeline 无台词」）。
- **句子归属用亲和优先多数票**：引用计数投票时优先「任务 ID 前 6 位 == 句子块前缀」的候选，避免跨任务回顾/走图引用在共享块上抢票（块 105005 被 1040538/1040539/1040551 交错引用的实测场景）。块内区间插值与 10545xx 的「155+任务末两位」回退规则保持不变；回退仅在任务自身图引用为零时生效。
- **显示分组消除空任务**：同任务包（missionPack）或同章节同名的任务合并为一个显示单元（Raid 镜像 / 自动续行段是游戏内部变体，无独立台词）；无名占位任务并入同章节同 ID 前 6 位的正片组，无名且无台词者丢弃。有台词的组渲染完整小节，无台词的组收进章节末尾附录表。460 个任务 → 302 个显示组（260 个有台词、52 个附录、4 个无名丢弃），此前 124 个空小节全部消除。
- **简介回退（2026-09-27 源头落地，同日按新口径调整）**：`MainMissionExtractor` 的 desc 只保留 终末描述 / ChronicleConclusion；缺失时的回退内容（首个带描述子任务的 `DescrptionText`，即游戏内任务栏描述，子任务归属按 MissionInfo partial，前 7 位号段兜底）单独写入新字段 **descFallback**，不污染 desc 便于排查（CHS 已重生成：454 个任务有 desc、573 个仅有 descFallback、零重叠）。剧情提取器简介链为 desc → descFallback（源头已覆盖全部可回退任务，本地 submission.json 兜底路径已删除）。缺简介小节从 194 降到 1（4020107 实测全数据源无描述）。任务图标生成按桶内实际文件名大小写生成性别占位符（如 1040206 为 `{F#F}{M#M}`，消费端按占位符内容字符替换）。

当前全量结果：36 章 / 260 个有台词任务组 / 76082 句（图归属 73438 + 155 回退 2644，其中插值补洞 45258）。纯 Timeline 且无任何图文件引用的任务（10545xx 族以外）仍无法归属，注记为无台词。

### 5.6 待回归项

锚点区间归属法目前样本为 1 个任务（人工复核通过）；正式化时应跑全量 89+ DS 的孤句统计，并处理 `Wait_Option_*` 重试语义的运行时确认。上游发布 4.5.1 图后重跑 chapter105007 案例，死路径应归零，届时本章可从 Tier 1 升级到 Tier 2。

---

## 6. 2026-09-26 增补：模拟宇宙 / 差分宇宙案例

完整证据、可复现命令和覆盖范围见 [第三个案例报告](../case-tests/rogue-dialogue/report.md)。本次完成 8 个真实样本的文本与分支覆盖，并巡检 932 个 Rogue Excel 入口可达的演出图。

### 6.1 入口按玩法元数据关联，不能按台词编号或目录归类

指定句子 403058523 来自 `RogueMagicStory[StoryID=53023].LevelGraphPath`，剧情为“未来学大会•其三”；403818312 来自 `RogueTournTitanTalent[ID=13002].ActJson`，剧情名取 `ActTitle`“约束人德之法”。二者虽在同一 RogueNpcDialogEvent 目录，入口类型不同。

事件图鉴另走 `RogueHandBookEvent` / `RogueTournHandBookEvent` 的进度关联 → `RogueNPC` / `RogueTournNPC` → NPC 配置 `DialogueList[].DialoguePath + OptionPath`。一个图鉴条目可关联多个版本 NPC；同一批正文可以配不同选项和效果。路径仍为权威，但主线的任务目录归属规则不能直接用于 Rogue。

### 6.2 Rogue 选项不能只查 TalkSentenceConfig

`PlayRogueOptionTalk` 同时承载剧情选项与事件选项：前者直接引用 `TalkSentenceID`；后者以 `RogueOptionID` 关联本入口的 Opt 配置（`OptionID → DisplayID`），或新版 `RogueDialogueOption`（`OptionID → OptionDisplayID`），再查 `RogueDialogueOptionDisplay` 的标题/效果 Hash。

本次 4176 个选项中，只有 1018 个直接来自台词字典；其余 3158 个事件选项需要另一条文本链。图内 3091 个 `OptionTextmapID` 在当前 CHS TextMap 全部查不到，不能作为唯一文本源。必须精确保留 64 位 Hash，避免 JavaScript 数值精度造成额外假缺失。

### 6.3 简单文本图与运行时回调仍须区分

两个指定剧情的正文都显式内联在 SimpleTalkList，无需 DS 锚点区间补句。选项的 CustomString 汇合可以直接保留为边；`PlayAeonTalk` 共用顺序载荷解析。事件还存在 `WaitDialogueEvent → SuccessCustomString → WaitCustomString` 链，而选择哪个选项会产生何种运行时事件不一定在图内明确，不能按 ID 猜边。

效果文本保留模板、DescValue/ParamList、DynamicMap 与 SpecialOptionID 等原始参数；静态文本浏览不等于效果结算和条件可见性已还原。

### 6.4 样本回归通过，不代表全量没有缺口

8 个样本的正文、选项标题与内部已声明跳转通过断言。入口扩面巡检仍记录 167 个缺失 Opt 路径、250 个未解析选项标题、90 条图内未匹配信号；后者可能涉及外部消费者，不能一概判定坏边。新版 Excel Option 可补回部分缺失 Opt 的文本，但缺失证据仍保留。

当前实现独立位于 `case-tests/rogue-dialogue`，运行 `npm run test:rogue-dialogue` 可重建报告依据；现有主线快速提取器保持原范围。后续接入 Rogue 时，应先建立玩法入口索引和选项文本关联，再决定如何展示动态事件边界。
