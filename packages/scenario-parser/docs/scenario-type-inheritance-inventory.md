# 剧情解析核心类型继承清单

> 生成日期 2026-08-30。由 `tool/scenario-type-scan/generate-inventory.ps1` 根据 B 的真实 JSON 实例与 A 的 DummyDll 元数据生成；不要手工维护展开后的主表。
>
> 数据源 B：根目录 `extern/TurnBasedGameData` 子模块；类型源 A：工具目录内被忽略的 `DummyDll/`。未读取 `dump.cs`。关联结论见 [scenario-parser-directions.md](./scenario-parser-directions.md)。

## 1. 口径与总量

- 核心范围：`Config/Level/Mission/*/Act`、`Mission/*/Talk`、`Mission_*.json`、`Story/Mission`、`Story/Discussion`。
- 具体类型数量以本次生成的统计表为准；主表还插入这些类型继承路径上的游戏中间基类。
- 继承树排除 `System.*`、`UnityEngine.*` 等框架基类；仅使用重复的全角中间点 `・` 表达游戏类型之间的继承层级，不使用空格、制表符或连接符。A 未解析类型保持零级。
- “主要引用来源”只统计上述核心范围，同一类型可出现在多个桶。类别由可复跑的启发式规则生成，主要用于审查和分工，不是游戏官方分类。

| 指标 | 数量 |
|------|-----:|
| 扫描 Config/Story JSON | 132161 |
| JSON 解析失败 | 0 |
| 核心剧情图文件 | 30579 |
| 核心 `$type` | 466 |
| 展开继承节点后的主表行数 | 481 |
| 核心或任务外对白相关类型 | 543 |
| A 同目录 DLL 类型总数 | 79041 |

### 1.1 核心类型族

| 类型族 | 类型数 | 实例数 |
|--------|-------:|-------:|
| `RPG.GameCore.JsonConfig` | 13 | 46697 |
| `RPG.GameCore.PredicateConfig` | 44 | 2298 |
| `RPG.GameCore.TargetEvaluator` | 16 | 19399 |
| `RPG.GameCore.TaskConfig` | 392 | 322292 |
| `not-found` | 1 | 5 |

### 1.2 文件桶

| 文件桶 | 不重复类型 | 实例数 |
|--------|-----------:|-------:|
| `Mission/Act` | 280 | 254476 |
| `Mission/Talk` | 58 | 4179 |
| `Mission/Mission_` | 300 | 35995 |
| `Story/Mission` | 38 | 9898 |
| `Story/Discussion` | 113 | 86143 |

### 1.3 生成类别

| 类别 | 类型数 | 实例数 |
|------|-------:|-------:|
| 对白载荷 | 18 | 53594 |
| 对话交互/控制 | 15 | 3784 |
| 分支条件 | 44 | 2298 |
| 角色/实体动作 | 72 | 23949 |
| 结构·容器/回调 | 53 | 6141 |
| 剧情控制·事件总线 | 4 | 88483 |
| 目标选择 | 16 | 19399 |
| 其它任务动作 | 156 | 7913 |
| 任务状态 | 13 | 1637 |
| 数据/值对象 | 5 | 2652 |
| 选项载荷 | 5 | 61083 |
| 演出动作 | 23 | 3104 |
| 演出生命周期 | 9 | 114947 |
| 音频 | 10 | 1161 |
| UI/交互 | 23 | 546 |

## 2. 展开的核心类型继承与引用清单

| 继承树　　　　　　　   | 类别　　　      | 总实例　　   | 文件数　　   | 功能说明 | 主要引用来源（实例） |
|--------------------------|------------|-----------:|-----------:|----------|----------------------|
| RPG.GameCore.JsonConfig | 关键基类 | — | — | 可序列化配置/值对象根；自身不表示可执行 task。 |  |
| ・RPG.GameCore.DynamicJsonConfig | 继承节点 | — | — |  |  |
| ・・RPG.GameCore.MunicipalChatEntityInfo | 角色/实体动作 | 28 | 11 |  | Mission/Mission_ 28 |
| ・RPG.GameCore.GroupEntityInfo | 角色/实体动作 | 491 | 182 |  | Mission/Act 254；Mission/Talk 4；Mission/Mission_ 220；Story/Discussion 13 |
| ・RPG.GameCore.OptionTalkInfo | 选项载荷 | 42312 | 8796 | 选项载荷基类；共享 TalkSentenceID、TriggerCustomString 与 VisibleFilter。 | Mission/Act 26145；Mission/Talk 102；Mission/Mission_ 11；Story/Mission 1415；Story/Discussion 14639 |
| ・・RPG.GameCore.DiceCombatOptionTalkInfo | 选项载荷 | 5 | 5 |  | Mission/Act 2；Story/Discussion 3 |
| ・RPG.GameCore.PhotoGraphAimContainerTargetBase | 继承节点 | — | — |  |  |
| ・・RPG.GameCore.PhotoGraphAimContaierTarget | 数据/值对象 | 13 | 10 |  | Mission/Mission_ 13 |
| ・RPG.GameCore.PhotoGraphFindNpc | 角色/实体动作 | 3 | 3 |  | Mission/Mission_ 3 |
| ・RPG.GameCore.ScreenTransferBaseAction | 继承节点 | — | — |  |  |
| ・・RPG.GameCore.ScrTrfActPerformance | 演出动作 | 140 | 74 |  | Mission/Act 137；Mission/Mission_ 3 |
| ・・RPG.GameCore.ScrTrfActPerformanceGroup | 演出动作 | 597 | 302 |  | Mission/Act 584；Mission/Mission_ 3；Story/Discussion 10 |
| ・・RPG.GameCore.ScrTrfActTaskList | 结构·容器/回调 | 469 | 312 |  | Mission/Act 408；Mission/Mission_ 42；Story/Discussion 19 |
| ・RPG.GameCore.SharedValue | 继承节点 | — | — |  |  |
| ・・RPG.GameCore.SharedFloat | 数据/值对象 | 606 | 606 |  | Mission/Act 602；Mission/Talk 1；Mission/Mission_ 1；Story/Discussion 2 |
| ・・RPG.GameCore.SharedInt | 数据/值对象 | 32 | 12 |  | Mission/Act 25；Mission/Mission_ 7 |
| ・・RPG.GameCore.SharedString | 数据/值对象 | 1999 | 692 |  | Mission/Act 1948；Mission/Talk 3；Mission/Mission_ 48 |
| ・・RPG.GameCore.SharedStringList | 数据/值对象 | 2 | 2 |  | Mission/Act 1；Story/Discussion 1 |
| ・RPG.GameCore.TargetSeqOperation | 关键基类 | — | — | 目标表达式中间基类。 |  |
| ・・RPG.GameCore.TargetEvaluator | 关键基类 | — | — | 目标求值器根；选择 NPC、Prop、Anchor、玩家或对话实体。 |  |
| ・・・RPG.GameCore.AdvGroupFetchTargetByString | 目标选择 | 4 | 2 |  | Mission/Act 4 |
| ・・・RPG.GameCore.GroupFetchLocalTarget | 目标选择 | 392 | 182 |  | Mission/Act 392 |
| ・・・RPG.GameCore.TargetAlias | 目标选择 | 78 | 64 |  | Mission/Act 72；Mission/Mission_ 6 |
| ・・・RPG.GameCore.TargetConcat | 目标选择 | 38 | 16 |  | Mission/Mission_ 38 |
| ・・・RPG.GameCore.TargetFetchAdvFakeAvatar | 目标选择 | 6 | 3 |  | Mission/Act 6 |
| ・・・RPG.GameCore.TargetFetchAdvLocalPlayer | 目标选择 | 3335 | 1990 |  | Mission/Act 3313；Mission/Mission_ 22 |
| ・・・RPG.GameCore.TargetFetchAdvMonsterEx | 目标选择 | 10 | 5 |  | Mission/Act 7；Mission/Mission_ 3 |
| ・・・RPG.GameCore.TargetFetchAdvNPC | 目标选择 | 357 | 132 |  | Mission/Act 174；Mission/Mission_ 182；Story/Discussion 1 |
| ・・・RPG.GameCore.TargetFetchAdvNpcEx | 目标选择 | 7304 | 2009 |  | Mission/Act 7069；Mission/Mission_ 234；Story/Discussion 1 |
| ・・・RPG.GameCore.TargetFetchAdvProp | 目标选择 | 364 | 118 |  | Mission/Act 9；Mission/Mission_ 355 |
| ・・・RPG.GameCore.TargetFetchAdvPropEx | 目标选择 | 6707 | 3821 |  | Mission/Act 3954；Mission/Talk 9；Mission/Mission_ 2499；Story/Mission 4；Story/Discussion 241 |
| ・・・RPG.GameCore.TargetFetchAnchor | 目标选择 | 494 | 368 |  | Mission/Act 480；Mission/Mission_ 3；Story/Discussion 11 |
| ・・・RPG.GameCore.TargetFetchAnchorByName | 目标选择 | 4 | 4 |  | Mission/Act 4 |
| ・・・RPG.GameCore.TargetFetchDialogueEntity | 目标选择 | 281 | 271 |  | Mission/Act 280；Mission/Talk 1 |
| ・・・RPG.GameCore.TargetFetchSummonUnit | 目标选择 | 16 | 8 |  | Mission/Act 16 |
| ・・・RPG.GameCore.TargetFetchUniqueNameEntity | 目标选择 | 9 | 3 |  | Mission/Act 9 |
| ・RPG.GameCore.TaskConfig | 关键基类 | — | — | 可执行任务节点根；共享 TaskEnabled。未知叶子可保持 opaque，但仍须递归其 object/array。 |  |
| ・・CMOKPGLKOOG | 其它任务动作 | 2 | 2 |  | Mission/Mission_ 2 |
| ・・DKBHPNAJNPD | 其它任务动作 | 12 | 12 |  | Mission/Mission_ 12 |
| ・・DMBGHOJIJIL | 其它任务动作 | 2 | 1 |  | Story/Discussion 2 |
| ・・FPBABHMOAII | 其它任务动作 | 2 | 2 |  | Mission/Act 2 |
| ・・JNEDMEACFJF | 其它任务动作 | 10 | 1 |  | Mission/Act 10 |
| ・・JNIPOABPBPD | 其它任务动作 | 1 | 1 |  | Story/Discussion 1 |
| ・・KHHLCOPIEBE | 其它任务动作 | 2 | 2 |  | Mission/Act 2 |
| ・・KIMKPNKNHFI | 其它任务动作 | 11 | 11 |  | Story/Discussion 11 |
| ・・LLCLGLFDGBM | 其它任务动作 | 2 | 2 |  | Mission/Act 1；Mission/Mission_ 1 |
| ・・LNFKIOADLAN | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・MDGPFEMNJGP | 其它任务动作 | 1 | 1 |  | Story/Discussion 1 |
| ・・MNLJCDFDLFD | 其它任务动作 | 1 | 1 |  | Story/Discussion 1 |
| ・・POIHKFPHKEO | 结构·容器/回调 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.ActiveTemplateVirtualCamera | 演出动作 | 320 | 133 |  | Mission/Act 320 |
| ・・RPG.GameCore.ActiveVirtualCamera | 演出动作 | 800 | 390 |  | Mission/Act 748；Mission/Mission_ 52 |
| ・・RPG.GameCore.ActiveVirtualCamera_PerformanceTransition | 演出动作 | 12 | 6 |  | Mission/Act 12 |
| ・・RPG.GameCore.AddFinishMissionData_ConsumeItem | 结构·容器/回调 | 118 | 108 |  | Mission/Act 88；Mission/Mission_ 10；Story/Discussion 20 |
| ・・RPG.GameCore.AddFinishMissionData_PlayMessage | 任务状态 | 80 | 80 |  | Mission/Act 80 |
| ・・RPG.GameCore.AddFinishMissionData_PlayMessageAdaptive | 任务状态 | 29 | 29 |  | Mission/Act 26；Story/Discussion 3 |
| ・・RPG.GameCore.AddFinishMissionData_SelectConsumeItem | 对白载荷 | 20 | 20 |  | Mission/Act 18；Story/Discussion 2 |
| ・・RPG.GameCore.AddMazeBuff | 继承节点 | — | — |  |  |
| ・・・RPG.GameCore.AddClientMazeBuff | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.AddStreamingSource | 其它任务动作 | 5 | 2 |  | Mission/Act 4；Mission/Mission_ 1 |
| ・・RPG.GameCore.AddTrialPlayer | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.AdvAINavigateTo | 其它任务动作 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.AdvCharacterDisableHitBox | 角色/实体动作 | 2 | 1 |  | Mission/Act 2 |
| ・・RPG.GameCore.AdvClientChangePropState | 角色/实体动作 | 6 | 5 |  | Mission/Act 6 |
| ・・RPG.GameCore.AdvCreateEntityAsync | 角色/实体动作 | 16 | 12 |  | Mission/Act 16 |
| ・・RPG.GameCore.AdvCreateGroupEntity | 角色/实体动作 | 94 | 48 |  | Mission/Act 94 |
| ・・RPG.GameCore.AdvCreateGroupEntityV2 | 角色/实体动作 | 29 | 28 |  | Mission/Act 29 |
| ・・RPG.GameCore.AdvDestroyEntityAsync | 角色/实体动作 | 16 | 12 |  | Mission/Act 16 |
| ・・RPG.GameCore.AdvDestroyGroupEntity | 角色/实体动作 | 103 | 79 |  | Mission/Act 103 |
| ・・RPG.GameCore.AdvEnablePropDialogMode | 角色/实体动作 | 224 | 188 |  | Mission/Act 184；Mission/Mission_ 40 |
| ・・RPG.GameCore.AdvEntityFaceTo | 角色/实体动作 | 3953 | 1999 |  | Mission/Act 3936；Mission/Mission_ 17 |
| ・・RPG.GameCore.AdvEntityFaceToPoint | 角色/实体动作 | 8 | 8 |  | Mission/Act 8 |
| ・・RPG.GameCore.AdvEntityStopLookAt | 角色/实体动作 | 21 | 19 |  | Mission/Act 21 |
| ・・RPG.GameCore.AdvHideMazeBtn | 其它任务动作 | 30 | 15 |  | Mission/Mission_ 30 |
| ・・RPG.GameCore.AdvNpcFaceTo | 角色/实体动作 | 2 | 2 |  | Mission/Act 2 |
| ・・RPG.GameCore.AdvNpcFaceToPlayer | 角色/实体动作 | 7513 | 6968 |  | Mission/Act 7464；Mission/Talk 48；Mission/Mission_ 1 |
| ・・RPG.GameCore.AdvSetAIFollow | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.AdvSetAIMoveTo | 结构·容器/回调 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.AdvSpecialVisionProtect | 其它任务动作 | 10 | 5 |  | Mission/Act 10 |
| ・・RPG.GameCore.AdvWaitingEventBase | 关键基类 | — | — | 事件等待 task 根；共享 IsLoop，派生类通过 OnEvent、OnChange 等回调续接。 |  |
| ・・・RPG.GameCore.WaitDrinkMakerCheersInitFinish | 结构·容器/回调 | 8 | 8 |  | Story/Discussion 8 |
| ・・・RPG.GameCore.WaitEntityEvent | 结构·容器/回调 | 1 | 1 |  | Mission/Act 1 |
| ・・・RPG.GameCore.WaitFloorCustomValueChange | 结构·容器/回调 | 26 | 23 |  | Mission/Act 4；Mission/Mission_ 22 |
| ・・・RPG.GameCore.WaitFloorCustomValueChangeV2 | 结构·容器/回调 | 15 | 15 |  | Mission/Act 1；Mission/Mission_ 14 |
| ・・・RPG.GameCore.WaitFloorSavedValueChangeV2 | 结构·容器/回调 | 6 | 3 |  | Mission/Act 5；Mission/Mission_ 1 |
| ・・・RPG.GameCore.WaitGroupEvent | 结构·容器/回调 | 151 | 42 |  | Mission/Act 151 |
| ・・・RPG.GameCore.WaitMissionCustomValueChange | 结构·容器/回调 | 43 | 39 |  | Mission/Mission_ 43 |
| ・・RPG.GameCore.AdventureCameraLookAtSimple | 演出动作 | 19 | 11 |  | Mission/Act 16；Mission/Mission_ 3 |
| ・・RPG.GameCore.AdventureForbidAttackTriggerBattle | 其它任务动作 | 2 | 2 |  | Mission/Mission_ 2 |
| ・・RPG.GameCore.AdventureShowReading | UI/交互 | 107 | 90 |  | Mission/Act 47；Mission/Mission_ 9；Story/Discussion 51 |
| ・・RPG.GameCore.AnimSetParameter | 其它任务动作 | 33 | 24 |  | Mission/Act 24；Mission/Mission_ 9 |
| ・・RPG.GameCore.BaseAdventureCameraLookAt | 继承节点 | — | — |  |  |
| ・・・RPG.GameCore.AdventureCameraLookAt | 演出动作 | 16 | 16 |  | Mission/Act 1；Mission/Mission_ 15 |
| ・・RPG.GameCore.BindSwitchPhotoGraphFuncBtn | 结构·容器/回调 | 10 | 10 |  | Mission/Mission_ 10 |
| ・・RPG.GameCore.BlockInputController | 其它任务动作 | 76 | 35 |  | Mission/Talk 3；Mission/Mission_ 73 |
| ・・RPG.GameCore.CacheUI | UI/交互 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.CalculateMissionCustomValue | 任务状态 | 201 | 69 |  | Mission/Act 107；Mission/Mission_ 34；Story/Mission 7；Story/Discussion 53 |
| ・・RPG.GameCore.CaptureLocalPlayer | 其它任务动作 | 29 | 29 |  | Mission/Act 22；Mission/Talk 7 |
| ・・RPG.GameCore.CaptureNPCToCharacter | 角色/实体动作 | 618 | 471 |  | Mission/Act 498；Mission/Talk 8；Mission/Mission_ 112 |
| ・・RPG.GameCore.ChangeDynamicOptionalBlock | 其它任务动作 | 48 | 48 |  | Mission/Mission_ 48 |
| ・・RPG.GameCore.ChangeHeartDialModelByScript | 其它任务动作 | 1 | 1 |  | Story/Discussion 1 |
| ・・RPG.GameCore.ChangeHeroType | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.ChangePropState | 角色/实体动作 | 184 | 176 |  | Mission/Mission_ 184 |
| ・・RPG.GameCore.ChangeTeamLeader | 其它任务动作 | 3 | 3 |  | Mission/Mission_ 3 |
| ・・RPG.GameCore.ChangeTrackVirtualCameraFollowAndAim | 演出动作 | 8 | 5 |  | Mission/Act 8 |
| ・・RPG.GameCore.ChangeTrackingMission | 任务状态 | 47 | 47 |  | Mission/Mission_ 47 |
| ・・RPG.GameCore.CharacterDisableLookAt | 角色/实体动作 | 31 | 10 |  | Mission/Act 30；Mission/Talk 1 |
| ・・RPG.GameCore.CharacterHeadLookAt | 角色/实体动作 | 45 | 26 |  | Mission/Act 45 |
| ・・RPG.GameCore.CharacterHeadStopLookAt | 角色/实体动作 | 9 | 7 |  | Mission/Act 5；Mission/Mission_ 4 |
| ・・RPG.GameCore.CharacterNavigateTo | 角色/实体动作 | 57 | 32 |  | Mission/Act 43；Mission/Mission_ 14 |
| ・・RPG.GameCore.CharacterSteerTo | 角色/实体动作 | 8 | 8 |  | Mission/Act 1；Mission/Talk 7 |
| ・・RPG.GameCore.CharacterStopFreeStyle | 角色/实体动作 | 4 | 4 |  | Mission/Act 2；Mission/Mission_ 2 |
| ・・RPG.GameCore.CharacterTriggerAnimState | 角色/实体动作 | 41 | 31 |  | Mission/Act 24；Mission/Talk 14；Mission/Mission_ 3 |
| ・・RPG.GameCore.CharacterTriggerFreeStyle | 角色/实体动作 | 6603 | 1701 |  | Mission/Act 6568；Mission/Mission_ 35 |
| ・・RPG.GameCore.CheckMainMissionFinishedInCurrentVersion | 结构·容器/回调 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.ClearDialogCamera | 演出动作 | 9 | 9 |  | Mission/Act 9 |
| ・・RPG.GameCore.ClearNpcDistanceTrigger | 角色/实体动作 | 8 | 8 |  | Mission/Mission_ 8 |
| ・・RPG.GameCore.ClearTalkUI | 对话交互/控制 | 43 | 37 |  | Mission/Act 25；Story/Discussion 18 |
| ・・RPG.GameCore.ClientFinishMission | 结构·容器/回调 | 905 | 854 |  | Mission/Act 85；Mission/Mission_ 819；Story/Discussion 1 |
| ・・RPG.GameCore.ClosePage | UI/交互 | 23 | 22 |  | Mission/Mission_ 23 |
| ・・RPG.GameCore.CollectDataConditions | 其它任务动作 | 687 | 590 |  | Mission/Act 302；Mission/Talk 3；Mission/Mission_ 263；Story/Mission 5；Story/Discussion 114 |
| ・・RPG.GameCore.CollectionPlaySimpleTalk | 对白载荷 | 7 | 4 |  | Mission/Act 7 |
| ・・RPG.GameCore.ComparePropState | 角色/实体动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.CompositeConfig | 关键基类 | — | — | 组合 task 根；SequenceConfig、SelectorConfig、RandomConfig 通过子 TaskList 组织执行。 |  |
| ・・・RPG.GameCore.RandomConfig | 结构·容器/回调 | 153 | 137 | 随机组合节点；以 OddsList、TaskList 和随机次数/去重配置选择子 task。 | Mission/Act 142；Story/Mission 7；Story/Discussion 4 |
| ・・・RPG.GameCore.SelectorConfig | 结构·容器/回调 | 22 | 16 | 选择组合节点；声明 TaskConfig[] TaskList。 | Mission/Act 16；Mission/Mission_ 6 |
| ・・・RPG.GameCore.SequenceConfig | 结构·容器/回调 | 6 | 1 | 顺序组合节点；声明 TaskConfig[] TaskList。 | Mission/Act 6 |
| ・・RPG.GameCore.ConfirmCheckpointRecover | 结构·容器/回调 | 7 | 7 |  | Mission/Talk 7 |
| ・・RPG.GameCore.ConsumeMissionItem | 结构·容器/回调 | 171 | 160 |  | Mission/Mission_ 171 |
| ・・RPG.GameCore.ConsumeMissionItemPerformance | 结构·容器/回调 | 90 | 68 |  | Mission/Act 77；Mission/Mission_ 3；Story/Discussion 10 |
| ・・RPG.GameCore.ConsumeOrigamiItem | 结构·容器/回调 | 48 | 48 |  | Mission/Act 48 |
| ・・RPG.GameCore.ConvinceInitialize | 其它任务动作 | 5 | 5 |  | Story/Discussion 5 |
| ・・RPG.GameCore.ConvinceMoveCurrTurnOption | 其它任务动作 | 3 | 3 |  | Story/Discussion 3 |
| ・・RPG.GameCore.ConvinceMoveNextTurn | 其它任务动作 | 3 | 3 |  | Story/Discussion 3 |
| ・・RPG.GameCore.ConvinceMovePrevTurn | 其它任务动作 | 3 | 3 |  | Story/Discussion 3 |
| ・・RPG.GameCore.ConvinceMoveTurn | 其它任务动作 | 69 | 5 |  | Story/Discussion 69 |
| ・・RPG.GameCore.ConvincePlayOptionTalk | 选项载荷 | 16 | 5 |  | Story/Discussion 16 |
| ・・RPG.GameCore.ConvinceShowToast | UI/交互 | 24 | 5 |  | Story/Discussion 24 |
| ・・RPG.GameCore.ConvinceWaitAllTurnFinish | 其它任务动作 | 5 | 5 |  | Story/Discussion 5 |
| ・・RPG.GameCore.ConvinceWaitTrickSkill | 其它任务动作 | 9 | 3 |  | Story/Discussion 9 |
| ・・RPG.GameCore.ConvinceWaitTurnBegin | 其它任务动作 | 16 | 5 |  | Story/Discussion 16 |
| ・・RPG.GameCore.CreateAirline | 其它任务动作 | 7 | 2 |  | Mission/Act 7 |
| ・・RPG.GameCore.CreateLevelAreas | 其它任务动作 | 47 | 36 |  | Mission/Act 23；Mission/Talk 1；Mission/Mission_ 23 |
| ・・RPG.GameCore.CreateNPC | 角色/实体动作 | 786 | 561 |  | Mission/Act 52；Mission/Mission_ 734 |
| ・・RPG.GameCore.CreatePhoneOnCharacter | 角色/实体动作 | 12 | 8 |  | Mission/Act 10；Mission/Mission_ 2 |
| ・・RPG.GameCore.CreateProp | 角色/实体动作 | 879 | 648 |  | Mission/Act 22；Mission/Mission_ 857 |
| ・・RPG.GameCore.CreateTrialPlayer | 其它任务动作 | 13 | 13 |  | Mission/Mission_ 13 |
| ・・RPG.GameCore.CreateVirtualTeam | 其它任务动作 | 10 | 10 |  | Mission/Mission_ 10 |
| ・・RPG.GameCore.DebateInitialize | 对白载荷 | 17 | 17 |  | Story/Discussion 17 |
| ・・RPG.GameCore.DebateReturnTestimony | 其它任务动作 | 74 | 17 |  | Story/Discussion 74 |
| ・・RPG.GameCore.DebateShowToast | UI/交互 | 15 | 12 |  | Story/Discussion 15 |
| ・・RPG.GameCore.DefineDynamicValue | 其它任务动作 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.DestroyCharacter | 角色/实体动作 | 3 | 3 |  | Mission/Act 3 |
| ・・RPG.GameCore.DestroyCurvePropGroupPuzzle | 角色/实体动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.DestroyNPC | 角色/实体动作 | 182 | 139 |  | Mission/Act 38；Mission/Mission_ 144 |
| ・・RPG.GameCore.DestroyProp | 角色/实体动作 | 417 | 339 |  | Mission/Act 60；Mission/Talk 5；Mission/Mission_ 352 |
| ・・RPG.GameCore.DestroyTrialPlayer | 其它任务动作 | 5 | 5 |  | Mission/Mission_ 5 |
| ・・RPG.GameCore.DestroyVirtualTeam | 其它任务动作 | 3 | 3 |  | Mission/Mission_ 3 |
| ・・RPG.GameCore.DrinkMakerCheersCancelMakerDrinkAfterPerformance | 演出动作 | 4 | 4 |  | Story/Discussion 4 |
| ・・RPG.GameCore.ElfProgressUpgrade | 其它任务动作 | 1 | 1 |  | Story/Discussion 1 |
| ・・RPG.GameCore.EnableBillboard | 其它任务动作 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.EnableNPCMonsterAI | 角色/实体动作 | 20 | 10 |  | Mission/Act 9；Mission/Mission_ 11 |
| ・・RPG.GameCore.EnablePerformanceMode | 演出动作 | 36 | 18 |  | Mission/Act 32；Mission/Mission_ 4 |
| ・・RPG.GameCore.EnablePlayerPlayIdleShow | 其它任务动作 | 8 | 8 |  | Mission/Mission_ 8 |
| ・・RPG.GameCore.EndDialogueEntityInteract | 对话交互/控制 | 664 | 642 |  | Mission/Act 662；Mission/Talk 1；Mission/Mission_ 1 |
| ・・RPG.GameCore.EndPerformance | 演出生命周期 | 22029 | 19945 |  | Mission/Act 16210；Mission/Talk 81；Mission/Mission_ 9；Story/Mission 740；Story/Discussion 4989 |
| ・・RPG.GameCore.EndPropInteract | 角色/实体动作 | 15 | 13 |  | Mission/Mission_ 15 |
| ・・RPG.GameCore.EnterAetherGym | 其它任务动作 | 3 | 3 |  | Mission/Mission_ 3 |
| ・・RPG.GameCore.EnterFlipperLightDeviceControl | 其它任务动作 | 2 | 1 |  | Mission/Mission_ 2 |
| ・・RPG.GameCore.EnterMap | 其它任务动作 | 103 | 103 |  | Mission/Mission_ 103 |
| ・・RPG.GameCore.EnterMapByCondition | 其它任务动作 | 19 | 19 |  | Mission/Act 9；Mission/Talk 7；Mission/Mission_ 3 |
| ・・RPG.GameCore.ExitTransitionLoadingUI | 演出动作 | 17 | 17 |  | Mission/Mission_ 17 |
| ・・RPG.GameCore.FinishLevelGraph | 演出生命周期 | 21237 | 21178 |  | Mission/Act 14485；Mission/Talk 1226；Mission/Mission_ 35；Story/Mission 734；Story/Discussion 4757 |
| ・・RPG.GameCore.FinishPerformanceMission | 演出生命周期 | 6651 | 6485 |  | Mission/Act 2；Mission/Mission_ 6649 |
| ・・RPG.GameCore.FinishRogueAeonTalk | 对话交互/控制 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.ForcePlayerMoveForwardOnly | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.ForceSetDialogCamera | 演出动作 | 3 | 3 |  | Mission/Act 3 |
| ・・RPG.GameCore.GuessTheSilhouetteResult | 其它任务动作 | 16 | 15 |  | Mission/Mission_ 16 |
| ・・RPG.GameCore.HeliobusSNSQuickPost | 结构·容器/回调 | 17 | 9 |  | Mission/Act 16；Story/Discussion 1 |
| ・・RPG.GameCore.HideAllEntity | 角色/实体动作 | 3 | 2 |  | Mission/Act 2；Mission/Mission_ 1 |
| ・・RPG.GameCore.HideEntity | 角色/实体动作 | 43 | 22 |  | Mission/Act 20；Mission/Mission_ 23 |
| ・・RPG.GameCore.HideEntityV2 | 角色/实体动作 | 21 | 18 |  | Mission/Act 21 |
| ・・RPG.GameCore.HideSummonUnit | 其它任务动作 | 18 | 9 |  | Mission/Act 18 |
| ・・RPG.GameCore.HideTopPage | UI/交互 | 6 | 3 |  | Mission/Mission_ 6 |
| ・・RPG.GameCore.HideWaypointByProp | 角色/实体动作 | 29 | 11 |  | Mission/Mission_ 29 |
| ・・RPG.GameCore.LensDistortionCurveEffect | 其它任务动作 | 2 | 2 |  | Mission/Act 1；Story/Discussion 1 |
| ・・RPG.GameCore.LevelAudioState | 音频 | 20 | 8 |  | Mission/Mission_ 17；Story/Mission 1；Story/Discussion 2 |
| ・・RPG.GameCore.LevelAudioTrigger | 音频 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.LevelPerformanceInitialize | 演出生命周期 | 19971 | 19945 |  | Mission/Act 14405；Mission/Talk 42；Mission/Mission_ 8；Story/Mission 733；Story/Discussion 4783 |
| ・・RPG.GameCore.LockCurrentTeleportAction | 其它任务动作 | 6 | 6 |  | Mission/Mission_ 6 |
| ・・RPG.GameCore.LockPhotoIdentifyHint | 其它任务动作 | 56 | 56 |  | Mission/Mission_ 56 |
| ・・RPG.GameCore.LockPlayerControl | 其它任务动作 | 66 | 60 |  | Mission/Act 5；Mission/Talk 2；Mission/Mission_ 59 |
| ・・RPG.GameCore.LockTeamLeader | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.MonsterResearchSubmit | 结构·容器/回调 | 7 | 7 |  | Mission/Act 7 |
| ・・RPG.GameCore.MoveVirtualCameraOnDollyPath | 演出动作 | 8 | 5 |  | Mission/Act 8 |
| ・・RPG.GameCore.NpcPossession | 角色/实体动作 | 8 | 7 |  | Mission/Act 3；Mission/Mission_ 5 |
| ・・RPG.GameCore.NpcSetupTrigger | 结构·容器/回调 | 8 | 8 |  | Mission/Mission_ 8 |
| ・・RPG.GameCore.NpcToPlayerDistanceTrigger | 结构·容器/回调 | 9 | 9 |  | Mission/Mission_ 9 |
| ・・RPG.GameCore.OnMuseumPerformanceBegin | 结构·容器/回调 | 4 | 1 |  | Mission/Act 4 |
| ・・RPG.GameCore.OnMuseumPerformanceEnd | 演出动作 | 5 | 1 |  | Mission/Act 5 |
| ・・RPG.GameCore.OpenRaid | 结构·容器/回调 | 8 | 8 |  | Mission/Mission_ 8 |
| ・・RPG.GameCore.OpenTreasureChallenge | 结构·容器/回调 | 95 | 95 |  | Mission/Act 46；Mission/Talk 1；Mission/Mission_ 48 |
| ・・RPG.GameCore.OverrideEndTransferColor | 其它任务动作 | 58 | 57 |  | Mission/Act 8；Story/Mission 9；Story/Discussion 41 |
| ・・RPG.GameCore.OverrideEndTransferType | 其它任务动作 | 40 | 36 |  | Mission/Act 12；Story/Discussion 28 |
| ・・RPG.GameCore.OverrideFinishActionAutoTransfer | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.OverridePerformanceEndCrack | 演出动作 | 31 | 27 |  | Mission/Act 23；Story/Discussion 8 |
| ・・RPG.GameCore.OverridePerformanceEndScreenCut | 演出动作 | 10 | 10 |  | Mission/Act 2；Story/Discussion 8 |
| ・・RPG.GameCore.PPFilterStackEffect | 其它任务动作 | 153 | 76 |  | Mission/Act 88；Mission/Mission_ 52；Story/Mission 4；Story/Discussion 9 |
| ・・RPG.GameCore.PerformanceDynamicLoadCharacter | 演出动作 | 6 | 1 |  | Story/Mission 6 |
| ・・RPG.GameCore.PerformanceEndBlackText | 对白载荷 | 6 | 6 |  | Mission/Act 3；Story/Mission 3 |
| ・・RPG.GameCore.PerformanceEndSeq | 结构·容器/回调 | 32 | 31 |  | Mission/Mission_ 32 |
| ・・RPG.GameCore.PerformanceExtendEndBlack | 演出动作 | 212 | 212 |  | Mission/Act 53；Mission/Mission_ 1；Story/Mission 2；Story/Discussion 156 |
| ・・RPG.GameCore.PerformanceTransition | 对白载荷 | 4351 | 2298 |  | Mission/Act 3942；Mission/Talk 1；Mission/Mission_ 177；Story/Mission 2；Story/Discussion 229 |
| ・・RPG.GameCore.PhotoGraphAimTarget | 其它任务动作 | 317 | 144 |  | Mission/Mission_ 317 |
| ・・RPG.GameCore.PhotoGraphShowIdentifyResult | 其它任务动作 | 90 | 74 |  | Mission/Mission_ 90 |
| ・・RPG.GameCore.PhotoGraphWaitIdentifyFinish | 结构·容器/回调 | 171 | 120 |  | Mission/Mission_ 171 |
| ・・RPG.GameCore.PlayAndWaitRogueSimpleTalk | 对白载荷 | 114 | 36 |  | Mission/Act 114 |
| ・・RPG.GameCore.PlayFullScreenTransfer | 对白载荷 | 1806 | 1031 |  | Mission/Act 1619；Mission/Mission_ 99；Story/Discussion 88 |
| ・・RPG.GameCore.PlayMazeButtonEffect | 其它任务动作 | 5 | 5 |  | Mission/Mission_ 5 |
| ・・RPG.GameCore.PlayMessage | 其它任务动作 | 211 | 208 |  | Mission/Act 205；Mission/Mission_ 4；Story/Discussion 2 |
| ・・RPG.GameCore.PlayMultiVoiceTalk | 对白载荷 | 835 | 833 |  | Mission/Act 835 |
| ・・RPG.GameCore.PlayMunicipalChat | 其它任务动作 | 11 | 11 |  | Mission/Mission_ 11 |
| ・・RPG.GameCore.PlayNPCBubbleTalk | 对白载荷 | 209 | 172 |  | Mission/Act 1；Mission/Talk 1；Mission/Mission_ 207 |
| ・・RPG.GameCore.PlayNPCSingleBubbleTalk | 对白载荷 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.PlayOptionTalk | 选项载荷 | 18698 | 8791 |  | Mission/Act 11463；Mission/Talk 43；Mission/Mission_ 9；Story/Mission 595；Story/Discussion 6588 |
| ・・RPG.GameCore.PlayOrigamiTraceTalk | 对白载荷 | 33 | 33 |  | Mission/Act 33 |
| ・・RPG.GameCore.PlayRogueOptionTalk | 选项载荷 | 52 | 30 |  | Mission/Act 52 |
| ・・RPG.GameCore.PlayRogueSimpleTalk | 对白载荷 | 6 | 2 |  | Mission/Act 6 |
| ・・RPG.GameCore.PlayScreenCrack | 其它任务动作 | 14 | 14 |  | Mission/Act 7；Mission/Mission_ 6；Story/Discussion 1 |
| ・・RPG.GameCore.PlayScreenTransfer | 对白载荷 | 827 | 437 |  | Mission/Act 581；Mission/Talk 9；Mission/Mission_ 215；Story/Mission 4；Story/Discussion 18 |
| ・・RPG.GameCore.PlaySequenceDialogue | 结构·容器/回调 | 16 | 13 |  | Mission/Act 16 |
| ・・RPG.GameCore.PlayTimeline | 演出生命周期 | 21230 | 5480 |  | Mission/Act 10；Mission/Mission_ 1；Story/Mission 2264；Story/Discussion 18955 |
| ・・RPG.GameCore.PlayTimelinePrefab | 演出生命周期 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.PlayVideo | 演出生命周期 | 320 | 318 |  | Mission/Act 318；Story/Mission 1；Story/Discussion 1 |
| ・・RPG.GameCore.PlayVoice | 音频 | 64 | 48 |  | Mission/Act 55；Mission/Mission_ 9 |
| ・・RPG.GameCore.PlayVoice_Sequence | 音频 | 7 | 4 |  | Mission/Act 7 |
| ・・RPG.GameCore.PlayVoice_Single | 音频 | 37 | 33 |  | Mission/Act 31；Mission/Mission_ 6 |
| ・・RPG.GameCore.PlayerForceWalk | 其它任务动作 | 40 | 24 |  | Mission/Mission_ 40 |
| ・・RPG.GameCore.PlayerRemoteControlOtherEntity | 角色/实体动作 | 30 | 20 |  | Mission/Mission_ 30 |
| ・・RPG.GameCore.PlayerSelectMotionMode | 其它任务动作 | 11 | 10 |  | Mission/Mission_ 11 |
| ・・RPG.GameCore.PredicateConfig | 关键基类 | — | — | 条件节点根；共享 Inverse。它本身继承 TaskConfig，不能仅靠 TaskConfig 判断动作或条件。 |  |
| ・・・MLMOAFNJPBG | 分支条件 | 2 | 1 |  | Mission/Act 2 |
| ・・・RPG.GameCore.AdvByEntityExist | 分支条件 | 33 | 5 |  | Mission/Act 33 |
| ・・・RPG.GameCore.AdventureIsTriggerBattleByNpcMonster | 分支条件 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・・RPG.GameCore.ByAnd | 分支条件 | 154 | 63 |  | Mission/Act 136；Mission/Mission_ 12；Story/Mission 2；Story/Discussion 4 |
| ・・・RPG.GameCore.ByAny | 分支条件 | 10 | 8 |  | Mission/Act 8；Mission/Mission_ 2 |
| ・・・RPG.GameCore.ByCheckColonyTrace | 分支条件 | 35 | 35 |  | Mission/Act 35 |
| ・・・RPG.GameCore.ByCheckFloorCustomBool | 分支条件 | 13 | 11 |  | Mission/Act 3；Mission/Mission_ 10 |
| ・・・RPG.GameCore.ByCheckLineupHeroAvatarID | 分支条件 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・・RPG.GameCore.ByCheckRogueExploreWin | 分支条件 | 2 | 2 |  | Mission/Mission_ 2 |
| ・・・RPG.GameCore.ByCompareCurrentTeammemberCount | 分支条件 | 2 | 2 |  | Mission/Mission_ 2 |
| ・・・RPG.GameCore.ByCompareDynamicValue | 分支条件 | 8 | 1 |  | Mission/Act 8 |
| ・・・RPG.GameCore.ByCompareFloorCustomFloat | 分支条件 | 9 | 4 |  | Mission/Act 8；Mission/Mission_ 1 |
| ・・・RPG.GameCore.ByCompareFloorCustomFloatV2 | 分支条件 | 19 | 14 |  | Mission/Act 5；Mission/Mission_ 14 |
| ・・・RPG.GameCore.ByCompareFloorCustomString | 分支条件 | 19 | 9 |  | Mission/Mission_ 19 |
| ・・・RPG.GameCore.ByCompareFloorSavedValue | 分支条件 | 149 | 44 |  | Mission/Act 128；Mission/Mission_ 17；Story/Discussion 4 |
| ・・・RPG.GameCore.ByCompareFloorSavedValueV2 | 分支条件 | 1 | 1 |  | Story/Discussion 1 |
| ・・・RPG.GameCore.ByCompareGraphDynamicFloat | 分支条件 | 2 | 1 |  | Story/Discussion 2 |
| ・・・RPG.GameCore.ByCompareGroupProperty | 分支条件 | 9 | 1 |  | Mission/Act 9 |
| ・・・RPG.GameCore.ByCompareHeartDialTracingNPC | 分支条件 | 2 | 2 |  | Mission/Act 2 |
| ・・・RPG.GameCore.ByCompareIsBookAvailable | 分支条件 | 10 | 10 |  | Mission/Mission_ 10 |
| ・・・RPG.GameCore.ByCompareItemNum | 分支条件 | 66 | 28 |  | Mission/Act 66 |
| ・・・RPG.GameCore.ByCompareItemNumber | 分支条件 | 38 | 21 |  | Mission/Act 21；Mission/Mission_ 10；Story/Discussion 7 |
| ・・・RPG.GameCore.ByCompareMainMissionState | 分支条件 | 99 | 77 |  | Mission/Act 72；Mission/Mission_ 9；Story/Discussion 18 |
| ・・・RPG.GameCore.ByCompareMissionBattleWin | 分支条件 | 5 | 5 |  | Mission/Mission_ 5 |
| ・・・RPG.GameCore.ByCompareMissionCustomValue | 分支条件 | 445 | 222 |  | Mission/Act 130；Mission/Mission_ 169；Story/Discussion 146 |
| ・・・RPG.GameCore.ByComparePerformance | 分支条件 | 26 | 20 |  | Mission/Act 11；Mission/Mission_ 5；Story/Discussion 10 |
| ・・・RPG.GameCore.ByComparePerformanceResult | 分支条件 | 32 | 6 |  | Mission/Act 5；Story/Discussion 27 |
| ・・・RPG.GameCore.ByComparePropState | 分支条件 | 67 | 27 |  | Mission/Act 48；Mission/Mission_ 19 |
| ・・・RPG.GameCore.ByComparePropStateNumber | 分支条件 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・・RPG.GameCore.ByCompareQuestGetReward | 分支条件 | 159 | 58 |  | Mission/Act 159 |
| ・・・RPG.GameCore.ByCompareQuestProgress | 分支条件 | 151 | 57 |  | Mission/Act 148；Mission/Mission_ 2；Story/Discussion 1 |
| ・・・RPG.GameCore.ByCompareStoryLineID | 分支条件 | 118 | 113 |  | Mission/Act 118 |
| ・・・RPG.GameCore.ByCompareSubMissionState | 分支条件 | 465 | 285 |  | Mission/Act 292；Mission/Talk 3；Mission/Mission_ 117；Story/Mission 12；Story/Discussion 41 |
| ・・・RPG.GameCore.ByCompareSummonUnitCount | 分支条件 | 1 | 1 |  | Mission/Act 1 |
| ・・・RPG.GameCore.ByCompareTeamLeaderPath | 分支条件 | 14 | 2 |  | Mission/Act 14 |
| ・・・RPG.GameCore.ByCompareTextJoinValue | 分支条件 | 6 | 2 |  | Mission/Act 6 |
| ・・・RPG.GameCore.ByCompareVersionFinalMainMission | 分支条件 | 7 | 7 |  | Mission/Act 3；Mission/Mission_ 1；Story/Mission 3 |
| ・・・RPG.GameCore.ByCurrentAudioLanguage | 分支条件 | 1 | 1 |  | Mission/Act 1 |
| ・・・RPG.GameCore.ByHeroGender | 分支条件 | 52 | 37 |  | Mission/Act 40；Mission/Mission_ 12 |
| ・・・RPG.GameCore.ByLocalPlayerAvatarID | 分支条件 | 2 | 2 |  | Mission/Act 1；Mission/Mission_ 1 |
| ・・・RPG.GameCore.ByLocalPlayerIsFakeAvatar | 分支条件 | 6 | 6 |  | Mission/Act 1；Mission/Mission_ 5 |
| ・・・RPG.GameCore.ByMainMissionFinish | 分支条件 | 1 | 1 |  | Mission/Talk 1 |
| ・・・RPG.GameCore.ByTargetNpcExists | 分支条件 | 50 | 37 |  | Mission/Act 3；Mission/Mission_ 47 |
| ・・・RPG.GameCore.ConvinceByCompareHp | 分支条件 | 5 | 5 |  | Story/Discussion 5 |
| ・・RPG.GameCore.PredicateTaskList | 结构·容器/回调 | 1360 | 841 |  | Mission/Act 829；Mission/Talk 4；Mission/Mission_ 381；Story/Mission 11；Story/Discussion 135 |
| ・・RPG.GameCore.PredicateTaskListWithFail | 结构·容器/回调 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.PropClosePuzzle | 角色/实体动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.PropDestruct | 角色/实体动作 | 5 | 5 |  | Mission/Act 2；Mission/Mission_ 3 |
| ・・RPG.GameCore.PropEnableCollider | 角色/实体动作 | 56 | 43 |  | Mission/Act 17；Mission/Mission_ 39 |
| ・・RPG.GameCore.PropInitPuzzle | 角色/实体动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.PropMoveTo | 角色/实体动作 | 6 | 4 |  | Mission/Act 6 |
| ・・RPG.GameCore.PropPuzzleEventListener | 结构·容器/回调 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.PropReqInteract | 结构·容器/回调 | 46 | 46 |  | Mission/Act 4；Mission/Mission_ 41；Story/Discussion 1 |
| ・・RPG.GameCore.PropSetVisibility | 角色/实体动作 | 101 | 94 |  | Mission/Act 33；Mission/Talk 2；Mission/Mission_ 66 |
| ・・RPG.GameCore.PropSetupHitBox | 结构·容器/回调 | 3 | 3 |  | Mission/Mission_ 3 |
| ・・RPG.GameCore.PropSetupOptionsTrigger | 角色/实体动作 | 6 | 6 |  | Mission/Mission_ 6 |
| ・・RPG.GameCore.PropSetupTrigger | 结构·容器/回调 | 1151 | 955 |  | Mission/Act 1；Mission/Talk 2；Mission/Mission_ 1148 |
| ・・RPG.GameCore.PropSetupUITrigger | 结构·容器/回调 | 488 | 442 |  | Mission/Mission_ 488 |
| ・・RPG.GameCore.PropStateChangeListenerConfig | 结构·容器/回调 | 6 | 5 |  | Mission/Act 3；Mission/Mission_ 3 |
| ・・RPG.GameCore.PropStateExecute | 结构·容器/回调 | 86 | 51 |  | Mission/Act 32；Mission/Mission_ 54 |
| ・・RPG.GameCore.PropTriggerAnimState | 角色/实体动作 | 72 | 49 |  | Mission/Act 22；Mission/Mission_ 50 |
| ・・RPG.GameCore.PropsReqInteractByColonyMirrorTakenDiff | 角色/实体动作 | 3 | 3 |  | Mission/Act 3 |
| ・・RPG.GameCore.PuzzleSetAnimatorParams | 其它任务动作 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.QuestGetReward | 任务状态 | 161 | 63 |  | Mission/Act 161 |
| ・・RPG.GameCore.RadialBlurEffect | 其它任务动作 | 18 | 9 |  | Mission/Mission_ 18 |
| ・・RPG.GameCore.RaidSceneTransfer | 其它任务动作 | 119 | 119 |  | Mission/Mission_ 119 |
| ・・RPG.GameCore.RecoverAllCharactersHP | 角色/实体动作 | 7 | 7 |  | Mission/Talk 7 |
| ・・RPG.GameCore.ReleaseCacheUI | UI/交互 | 2 | 1 |  | Mission/Mission_ 2 |
| ・・RPG.GameCore.ReleaseCharacter | 角色/实体动作 | 32 | 23 |  | Mission/Act 15；Mission/Talk 14；Mission/Mission_ 3 |
| ・・RPG.GameCore.ReleaseEnvProfileForStory | 其它任务动作 | 1 | 1 |  | Story/Discussion 1 |
| ・・RPG.GameCore.RemoveAirline | 其它任务动作 | 9 | 2 |  | Mission/Act 9 |
| ・・RPG.GameCore.RemoveBattleEventData | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.RemoveEffect | 其它任务动作 | 3 | 2 |  | Mission/Act 1；Mission/Mission_ 2 |
| ・・RPG.GameCore.RemoveLevelAreas | 其它任务动作 | 43 | 30 |  | Mission/Act 28；Mission/Mission_ 15 |
| ・・RPG.GameCore.RemoveMazeBuff | 其它任务动作 | 2 | 2 |  | Mission/Mission_ 2 |
| ・・RPG.GameCore.RemoveStreamingSource | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.RemoveVirtualLineupBindPlane | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.ReplaceTrialPlayer | 其它任务动作 | 3 | 3 |  | Mission/Mission_ 3 |
| ・・RPG.GameCore.ReplaceVirtualTeam | 其它任务动作 | 5 | 5 |  | Mission/Mission_ 5 |
| ・・RPG.GameCore.ResetBillboardInfo | 其它任务动作 | 23 | 23 |  | Mission/Talk 8；Mission/Mission_ 15 |
| ・・RPG.GameCore.ResetMissionAudioState | 音频 | 6 | 6 |  | Mission/Mission_ 6 |
| ・・RPG.GameCore.ResetMissionWayPoint | 任务状态 | 42 | 17 |  | Mission/Mission_ 42 |
| ・・RPG.GameCore.ResetPhotoGraphTargets | 其它任务动作 | 7 | 7 |  | Mission/Mission_ 7 |
| ・・RPG.GameCore.RetrySwordTrainingFinalBattle | 其它任务动作 | 2 | 1 |  | Story/Discussion 2 |
| ・・RPG.GameCore.ReturnToLoginPage | UI/交互 | 4 | 4 |  | Mission/Mission_ 4 |
| ・・RPG.GameCore.RogueFinish | 其它任务动作 | 2 | 2 |  | Mission/Mission_ 2 |
| ・・RPG.GameCore.RogueShowSelectMainPage | UI/交互 | 3 | 3 |  | Mission/Act 2；Mission/Mission_ 1 |
| ・・RPG.GameCore.SaveMessage | 其它任务动作 | 153 | 150 |  | Mission/Act 51；Mission/Mission_ 102 |
| ・・RPG.GameCore.SceneGachaListener | 结构·容器/回调 | 5 | 5 |  | Mission/Mission_ 5 |
| ・・RPG.GameCore.SelectMissionItem | 对白载荷 | 78 | 63 |  | Mission/Act 71；Mission/Mission_ 3；Story/Discussion 4 |
| ・・RPG.GameCore.SetAdvAchievement | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.SetAllMissionWaypointsVisiable | 任务状态 | 20 | 6 |  | Mission/Mission_ 20 |
| ・・RPG.GameCore.SetAllRogueDoorState | 其它任务动作 | 4 | 4 |  | Mission/Act 2；Mission/Mission_ 2 |
| ・・RPG.GameCore.SetAudioEmotionState | 音频 | 101 | 73 |  | Mission/Act 21；Mission/Mission_ 59；Story/Mission 13；Story/Discussion 8 |
| ・・RPG.GameCore.SetBillboardInfo | 其它任务动作 | 46 | 34 |  | Mission/Talk 1；Mission/Mission_ 45 |
| ・・RPG.GameCore.SetCharacterAtlasFaceEmotion | 角色/实体动作 | 31 | 20 |  | Mission/Act 6；Mission/Mission_ 25 |
| ・・RPG.GameCore.SetCharacterShadowFactor | 角色/实体动作 | 28 | 14 |  | Mission/Act 8；Story/Discussion 20 |
| ・・RPG.GameCore.SetCharacterVisible | 角色/实体动作 | 20 | 20 |  | Mission/Act 19；Mission/Mission_ 1 |
| ・・RPG.GameCore.SetClientGroupProperty | 角色/实体动作 | 8 | 1 |  | Story/Discussion 8 |
| ・・RPG.GameCore.SetClockBoyEmotion | 其它任务动作 | 8 | 7 |  | Mission/Act 8 |
| ・・RPG.GameCore.SetDynamicValueBase | 继承节点 | — | — |  |  |
| ・・・RPG.GameCore.SetDynamicValueByAddValue | 其它任务动作 | 3 | 1 |  | Mission/Act 3 |
| ・・RPG.GameCore.SetEffectAnimatorTrigger | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.SetEntityTalkEnable | 对话交互/控制 | 10 | 10 |  | Mission/Mission_ 10 |
| ・・RPG.GameCore.SetEntityVisible | 角色/实体动作 | 56 | 19 |  | Mission/Act 52；Mission/Mission_ 3；Story/Discussion 1 |
| ・・RPG.GameCore.SetFloorCustomBool | 其它任务动作 | 10 | 9 |  | Mission/Act 9；Mission/Mission_ 1 |
| ・・RPG.GameCore.SetFloorCustomFloat | 其它任务动作 | 118 | 73 |  | Mission/Act 99；Mission/Mission_ 9；Story/Discussion 10 |
| ・・RPG.GameCore.SetFloorCustomFloatV2 | 其它任务动作 | 155 | 83 |  | Mission/Act 143；Mission/Mission_ 12 |
| ・・RPG.GameCore.SetFloorCustomString | 其它任务动作 | 3 | 3 |  | Mission/Mission_ 3 |
| ・・RPG.GameCore.SetFloorSavedValue | 其它任务动作 | 37 | 27 |  | Mission/Act 2；Mission/Mission_ 35 |
| ・・RPG.GameCore.SetForceStreamingThisFrame | 其它任务动作 | 3 | 3 |  | Mission/Mission_ 3 |
| ・・RPG.GameCore.SetFuncBtn | 其它任务动作 | 8 | 3 |  | Mission/Mission_ 8 |
| ・・RPG.GameCore.SetGraphDynamicFloat | 其它任务动作 | 3 | 1 |  | Story/Discussion 3 |
| ・・RPG.GameCore.SetHLODSwitchDelay | 其它任务动作 | 2 | 1 |  | Mission/Mission_ 2 |
| ・・RPG.GameCore.SetHudTemplate | 其它任务动作 | 34 | 34 |  | Mission/Act 3；Mission/Mission_ 31 |
| ・・RPG.GameCore.SetLoadingStratageType | 其它任务动作 | 32 | 32 |  | Mission/Mission_ 32 |
| ・・RPG.GameCore.SetLocalPlayerDitherAlpha | 其它任务动作 | 41 | 35 |  | Mission/Act 36；Mission/Mission_ 5 |
| ・・RPG.GameCore.SetMissionAudioState | 音频 | 42 | 38 |  | Mission/Act 12；Mission/Mission_ 24；Story/Mission 1；Story/Discussion 5 |
| ・・RPG.GameCore.SetMissionCustomValue | 任务状态 | 984 | 413 |  | Mission/Act 494；Mission/Mission_ 131；Story/Mission 7；Story/Discussion 352 |
| ・・RPG.GameCore.SetMissionWayPoint | 任务状态 | 44 | 22 |  | Mission/Mission_ 44 |
| ・・RPG.GameCore.SetMunicipalEnable | 其它任务动作 | 37 | 31 |  | Mission/Act 8；Mission/Mission_ 24；Story/Mission 2；Story/Discussion 3 |
| ・・RPG.GameCore.SetNPCMonstersVisible | 角色/实体动作 | 9 | 4 |  | Mission/Mission_ 9 |
| ・・RPG.GameCore.SetNpcStatus | 角色/实体动作 | 61 | 49 |  | Mission/Act 2；Mission/Mission_ 59 |
| ・・RPG.GameCore.SetNpcWaypath | 角色/实体动作 | 50 | 46 |  | Mission/Act 1；Mission/Mission_ 49 |
| ・・RPG.GameCore.SetPerformanceResult | 演出动作 | 822 | 453 |  | Mission/Act 446；Story/Mission 3；Story/Discussion 373 |
| ・・RPG.GameCore.SetRogueRoomFinish | 其它任务动作 | 2 | 2 |  | Mission/Act 1；Mission/Mission_ 1 |
| ・・RPG.GameCore.SetSpecialVisionOn | 其它任务动作 | 17 | 13 |  | Mission/Act 14；Mission/Mission_ 3 |
| ・・RPG.GameCore.SetStageItemState | 其它任务动作 | 5 | 3 |  | Mission/Act 1；Story/Mission 4 |
| ・・RPG.GameCore.SetTargetEntityFadeWithAnim | 角色/实体动作 | 221 | 208 |  | Mission/Act 221 |
| ・・RPG.GameCore.SetTargetUniqueName | 其它任务动作 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.SetTextJoinValue | 其它任务动作 | 512 | 126 |  | Mission/Act 302；Mission/Mission_ 45；Story/Discussion 165 |
| ・・RPG.GameCore.SetTraceOrigamiFlag | 其它任务动作 | 84 | 49 |  | Mission/Act 84 |
| ・・RPG.GameCore.SetTrackingMission | 任务状态 | 17 | 17 |  | Mission/Mission_ 17 |
| ・・RPG.GameCore.SetVirtualLineupBindPlane | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.SetWaypointIgnoreLock | 其它任务动作 | 29 | 9 |  | Mission/Mission_ 29 |
| ・・RPG.GameCore.SetWaypointSafeZone | 其它任务动作 | 20 | 6 |  | Mission/Mission_ 20 |
| ・・RPG.GameCore.ShowActivityPage | UI/交互 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.ShowBillboardInStoryMode | 其它任务动作 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.ShowDeleteMissionDialog | 结构·容器/回调 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.ShowEnterPasswordPage | 对白载荷 | 2 | 2 |  | Story/Discussion 2 |
| ・・RPG.GameCore.ShowEnvBuffDialog | 结构·容器/回调 | 16 | 16 |  | Mission/Mission_ 16 |
| ・・RPG.GameCore.ShowFistClubMissionPage | 结构·容器/回调 | 5 | 5 |  | Mission/Act 5 |
| ・・RPG.GameCore.ShowFuncBtn | 其它任务动作 | 55 | 41 |  | Mission/Mission_ 55 |
| ・・RPG.GameCore.ShowGroupChallengeSelectPage | UI/交互 | 2 | 2 |  | Mission/Act 1；Mission/Talk 1 |
| ・・RPG.GameCore.ShowGuideDetailDialog | 其它任务动作 | 3 | 3 |  | Mission/Mission_ 3 |
| ・・RPG.GameCore.ShowGuideHintWithText | 结构·容器/回调 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.ShowGuideText | 其它任务动作 | 2 | 1 |  | Mission/Mission_ 2 |
| ・・RPG.GameCore.ShowHeartDialToast | UI/交互 | 7 | 7 |  | Mission/Act 1；Mission/Mission_ 6 |
| ・・RPG.GameCore.ShowMazeUI | UI/交互 | 2 | 1 |  | Mission/Mission_ 2 |
| ・・RPG.GameCore.ShowMuseumPage | UI/交互 | 2 | 1 |  | Mission/Act 2 |
| ・・RPG.GameCore.ShowOfferingClockieUpgradeHint | 其它任务动作 | 3 | 3 |  | Mission/Act 3 |
| ・・RPG.GameCore.ShowPerformanceRollingSubtitles | 演出动作 | 8 | 8 |  | Mission/Act 6；Story/Discussion 2 |
| ・・RPG.GameCore.ShowPlayGOSubPackageDialog | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.ShowReading | UI/交互 | 175 | 143 |  | Mission/Act 139；Mission/Mission_ 11；Story/Mission 1；Story/Discussion 24 |
| ・・RPG.GameCore.ShowRogueTalkBg | 对话交互/控制 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.ShowRogueTalkUI | 对话交互/控制 | 38 | 38 |  | Mission/Act 38 |
| ・・RPG.GameCore.ShowSDFText | 其它任务动作 | 15 | 5 |  | Mission/Act 15 |
| ・・RPG.GameCore.ShowShop | 其它任务动作 | 84 | 84 |  | Mission/Act 77；Mission/Talk 7 |
| ・・RPG.GameCore.ShowSpaceZooMainPage | 结构·容器/回调 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.ShowSubPackage | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.ShowTalkUI | 对话交互/控制 | 88 | 56 |  | Mission/Act 25；Mission/Talk 10；Mission/Mission_ 53 |
| ・・RPG.GameCore.ShowTransitionLoadingUI | 演出动作 | 17 | 17 |  | Mission/Mission_ 17 |
| ・・RPG.GameCore.ShowTutorialGuide | 其它任务动作 | 5 | 5 |  | Mission/Act 1；Mission/Mission_ 4 |
| ・・RPG.GameCore.ShowTutorialUI | UI/交互 | 3 | 2 |  | Mission/Mission_ 3 |
| ・・RPG.GameCore.ShowUI | 结构·容器/回调 | 203 | 180 |  | Mission/Act 58；Mission/Talk 15；Mission/Mission_ 103；Story/Discussion 27 |
| ・・RPG.GameCore.ShowWaypointByProp | 角色/实体动作 | 30 | 16 |  | Mission/Mission_ 30 |
| ・・RPG.GameCore.ShowWorldShop | 其它任务动作 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.SimpleTalkListConfig | 关键基类 | — | — | 顺序对白共享基类；声明 SimpleTalkInfo[] SimpleTalkList。 |  |
| ・・・RPG.GameCore.PlayAndWaitSimpleTalk | 对白载荷 | 41861 | 12902 |  | Mission/Act 41855；Mission/Mission_ 6 |
| ・・・RPG.GameCore.PlayMissionTalk | 对白载荷 | 1364 | 1244 |  | Mission/Act 1；Mission/Talk 13；Mission/Mission_ 1350 |
| ・・・RPG.GameCore.PlaySimpleTalk | 对白载荷 | 2057 | 405 |  | Mission/Act 1941；Mission/Talk 90；Mission/Mission_ 26 |
| ・・RPG.GameCore.SpeedLineEffect | 其它任务动作 | 18 | 9 |  | Mission/Mission_ 18 |
| ・・RPG.GameCore.StartDialogueEntityInteract | 对话交互/控制 | 642 | 641 |  | Mission/Act 640；Mission/Talk 1；Mission/Mission_ 1 |
| ・・RPG.GameCore.StartPropInteractMode | 角色/实体动作 | 13 | 13 |  | Mission/Mission_ 13 |
| ・・RPG.GameCore.StopBlendShapesEmotion | 其它任务动作 | 5 | 5 |  | Mission/Act 5 |
| ・・RPG.GameCore.StopMunicipalChat | 其它任务动作 | 6 | 6 |  | Mission/Mission_ 6 |
| ・・RPG.GameCore.StopPermanentEmotion | 其它任务动作 | 21 | 14 |  | Mission/Act 21 |
| ・・RPG.GameCore.StopRandomMissionTalk | 对话交互/控制 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.StoryLineReplaceTrialPlayer | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.SwitchAudioListenerToTarget | 音频 | 23 | 22 |  | Story/Mission 3；Story/Discussion 20 |
| ・・RPG.GameCore.SwitchCase | 结构·容器/回调 | 67 | 34 |  | Mission/Act 27；Mission/Mission_ 3；Story/Mission 1；Story/Discussion 36 |
| ・・RPG.GameCore.SwitchCharacterAnchor | 角色/实体动作 | 264 | 213 |  | Mission/Act 100；Mission/Talk 2；Mission/Mission_ 160；Story/Discussion 2 |
| ・・RPG.GameCore.SwitchCharacterAnchorV2 | 角色/实体动作 | 179 | 163 |  | Mission/Act 96；Mission/Mission_ 52；Story/Mission 1；Story/Discussion 30 |
| ・・RPG.GameCore.SwitchPhotoGraphMode | 其它任务动作 | 181 | 116 |  | Mission/Talk 1；Mission/Mission_ 180 |
| ・・RPG.GameCore.SwitchUIMenuBGM | UI/交互 | 30 | 15 |  | Mission/Act 30 |
| ・・RPG.GameCore.SwordTrainingNotifySelectStory | 其它任务动作 | 2 | 2 |  | Story/Discussion 2 |
| ・・RPG.GameCore.TalkFigure | 对话交互/控制 | 176 | 58 |  | Mission/Act 158；Story/Discussion 18 |
| ・・RPG.GameCore.TeleportToRotatableRegion | 其它任务动作 | 10 | 10 |  | Mission/Mission_ 10 |
| ・・RPG.GameCore.ToastPile | UI/交互 | 49 | 29 |  | Mission/Mission_ 49 |
| ・・RPG.GameCore.TrainPartySwitchEnvironment | 其它任务动作 | 34 | 34 |  | Story/Discussion 34 |
| ・・RPG.GameCore.TransitEnvProfile | 其它任务动作 | 8 | 7 |  | Mission/Mission_ 8 |
| ・・・RPG.GameCore.TransitEnvProfileForStory | 其它任务动作 | 2 | 2 |  | Mission/Act 1；Story/Discussion 1 |
| ・・RPG.GameCore.TravelShipResetState | 其它任务动作 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.TriggerBattle | 其它任务动作 | 264 | 257 |  | Mission/Mission_ 264 |
| ・・RPG.GameCore.TriggerBlendShapesEmotion | 其它任务动作 | 89 | 67 |  | Mission/Act 89 |
| ・・RPG.GameCore.TriggerCustomString | 剧情控制·事件总线 | 32610 | 9342 |  | Mission/Act 20284；Mission/Talk 672；Mission/Mission_ 2263；Story/Mission 999；Story/Discussion 8392 |
| ・・・RPG.GameCore.TriggerCustomStringOnDialogEnd | 剧情控制·事件总线 | 593 | 512 |  | Mission/Act 295；Mission/Talk 280；Story/Discussion 18 |
| ・・RPG.GameCore.TriggerCustomStringList | 剧情控制·事件总线 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.TriggerDialogueEvent | 对话交互/控制 | 1 | 1 |  | Mission/Act 1 |
| ・・RPG.GameCore.TriggerDrinkMakerBartendInMainMission | 任务状态 | 2 | 2 |  | Mission/Mission_ 2 |
| ・・RPG.GameCore.TriggerDrinkMakerBartendInMission | 结构·容器/回调 | 6 | 6 |  | Mission/Mission_ 6 |
| ・・RPG.GameCore.TriggerEffect | 其它任务动作 | 91 | 75 |  | Mission/Act 87；Mission/Mission_ 2；Story/Discussion 2 |
| ・・RPG.GameCore.TriggerEffectList | 其它任务动作 | 40 | 27 |  | Mission/Act 24；Mission/Mission_ 16 |
| ・・RPG.GameCore.TriggerEffectListOnCharacter | 角色/实体动作 | 2 | 2 |  | Mission/Act 2 |
| ・・RPG.GameCore.TriggerEffectOnAnchor | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.TriggerEntityEvent | 角色/实体动作 | 4 | 2 |  | Mission/Act 4 |
| ・・RPG.GameCore.TriggerEntityEventV2 | 角色/实体动作 | 19 | 12 |  | Mission/Act 19 |
| ・・RPG.GameCore.TriggerGroupEvent | 其它任务动作 | 241 | 121 |  | Mission/Act 224；Story/Discussion 17 |
| ・・・RPG.GameCore.TriggerGroupEventOnDialogEnd | 其它任务动作 | 201 | 170 |  | Mission/Act 186；Story/Discussion 15 |
| ・・RPG.GameCore.TriggerPerformance | 演出生命周期 | 3556 | 3219 |  | Mission/Act 3；Mission/Talk 1117；Mission/Mission_ 2435；Story/Mission 1 |
| ・・RPG.GameCore.TriggerPermanentEmotion | 其它任务动作 | 55 | 24 |  | Mission/Act 55 |
| ・・RPG.GameCore.TriggerRogueDialogue | 对话交互/控制 | 24 | 24 |  | Mission/Talk 8；Mission/Mission_ 16 |
| ・・RPG.GameCore.TriggerSound | 音频 | 860 | 470 |  | Mission/Act 789；Mission/Mission_ 56；Story/Discussion 15 |
| ・・RPG.GameCore.TriggerUINotify | UI/交互 | 6 | 6 |  | Mission/Mission_ 3；Story/Discussion 3 |
| ・・RPG.GameCore.TutorialTaskUnlock | 其它任务动作 | 24 | 24 |  | Mission/Act 4；Mission/Mission_ 20 |
| ・・RPG.GameCore.UnLockPlayerControl | 其它任务动作 | 79 | 72 |  | Mission/Act 6；Mission/Talk 2；Mission/Mission_ 71 |
| ・・RPG.GameCore.UpdateTreasureChallengeProgress | 其它任务动作 | 67 | 50 |  | Mission/Act 8；Mission/Mission_ 59 |
| ・・RPG.GameCore.VCameraConfigChange | 演出动作 | 4 | 3 |  | Mission/Act 4 |
| ・・RPG.GameCore.VerifyInteractingEntity | 角色/实体动作 | 91 | 91 |  | Mission/Act 81；Mission/Talk 8；Mission/Mission_ 2 |
| ・・RPG.GameCore.WaitCustomString | 剧情控制·事件总线 | 55279 | 15108 |  | Mission/Act 31519；Mission/Talk 124；Mission/Mission_ 7008；Story/Mission 1561；Story/Discussion 15067 |
| ・・RPG.GameCore.WaitFor | 结构·容器/回调 | 2 | 2 |  | Mission/Mission_ 2 |
| ・・RPG.GameCore.WaitFrame | 其它任务动作 | 18 | 15 |  | Mission/Act 17；Mission/Mission_ 1 |
| ・・RPG.GameCore.WaitMissionTalkFinish | 对话交互/控制 | 71 | 70 |  | Mission/Act 1；Mission/Talk 12；Mission/Mission_ 58 |
| ・・RPG.GameCore.WaitNewDecalDialogExit | 其它任务动作 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.WaitPerformanceEnd | 演出生命周期 | 19952 | 19945 |  | Mission/Act 14427；Mission/Talk 32；Mission/Mission_ 3；Story/Mission 733；Story/Discussion 4757 |
| ・・RPG.GameCore.WaitPhotoGraphResult | 结构·容器/回调 | 66 | 58 |  | Mission/Mission_ 66 |
| ・・RPG.GameCore.WaitPredicateSucc | 其它任务动作 | 3 | 3 |  | Mission/Mission_ 3 |
| ・・RPG.GameCore.WaitPropDestroy | 结构·容器/回调 | 2 | 2 |  | Mission/Mission_ 2 |
| ・・RPG.GameCore.WaitPropStateChangeByCollectionMirrorTakenDiff | 角色/实体动作 | 6 | 6 |  | Mission/Mission_ 6 |
| ・・RPG.GameCore.WaitRogueSimpleTalkFinish | 对话交互/控制 | 6 | 2 |  | Mission/Act 6 |
| ・・RPG.GameCore.WaitSecond | 其它任务动作 | 2151 | 1396 |  | Mission/Act 1278；Mission/Talk 8；Mission/Mission_ 730；Story/Mission 4；Story/Discussion 131 |
| ・・RPG.GameCore.WaitSilverWolfCompanionToastExit | UI/交互 | 1 | 1 |  | Mission/Mission_ 1 |
| ・・RPG.GameCore.WaitSimpleTalkFinish | 对话交互/控制 | 2018 | 385 |  | Mission/Act 1902；Mission/Talk 91；Mission/Mission_ 25 |
| ・・RPG.GameCore.WaitStreamingJobFinished | 其它任务动作 | 14 | 10 |  | Mission/Act 8；Mission/Mission_ 6 |
| ・・RPG.GameCore.WaitSubMission | 任务状态 | 5 | 5 |  | Mission/Mission_ 5 |
| ・・RPG.GameCore.WaitTutorial | 结构·容器/回调 | 5 | 5 |  | Mission/Mission_ 5 |
| ・・RPG.GameCore.WaitUIControllerClose | UI/交互 | 75 | 56 |  | Mission/Mission_ 75 |
| ・・RPG.GameCore.WaitUIEvent | UI/交互 | 7 | 7 |  | Mission/Mission_ 7 |
| ・・RPG.GameCore.WaitUINodeOpen | UI/交互 | 1 | 1 |  | Mission/Mission_ 1 |
| RPG.GameCore.TakeEventMission | 任务状态 | 5 | 4 |  | Mission/Talk 5 |

## 3. 审查提示

- 表中类型名前连续的 `・` 数量表达游戏类型之间真实的元数据继承深度；插入的中间基类没有来源和实例数。该层级不表达 JSON 嵌套深度，JSON 嵌套仍须通用 walker 处理。
- 类型数量不等于 handler 数量。类别为“对白载荷 / 选项载荷 / 剧情控制 / 演出生命周期”的类型才优先需要语义处理。
- `PredicateConfig` 与 `TargetEvaluator` 在 L1 引用扫描中可以 opaque；若 L2/L3 要展示选项可见条件和说话目标，再逐步解释。
- A/B 版本差异必须允许：类型目录负责提供提示，不能成为 JSON 解析的硬门槛。
