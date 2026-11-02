# Chapter 105007「亏成首富，从不要钱开始」数据可得性与解析实测报告

> 实测日期：2026-09-25  
> 实验对象：开拓续闻 chapterId=105007（MainMission 1054520–1054528，共 9 个任务、143 个子任务、4 个楼层）  
> 语言：CHS（简体中文）  
> 实验脚本：[parse.mjs](./parse.mjs)  
> 结构化产物：[output.chs.json](./output.chs.json)  
> 台词整理（目标章节）：[dialogue.chs.md](./dialogue.chs.md)  
> 分支格式演示（代理章节）：[proxy-1040537.chs.md](./proxy-1040537.chs.md)

## 1. 结论

**本案例最重要的实测结果是一个数据边界事实：目标章节的演出图（Act / DS / Story JSON）整体不存在于当前数据快照中，且这不是同步落后，而是上游仓库确实没有发布。** Excel 层（任务、子任务、演出索引、台词字典、TextMap）在 4.5.0 基础包中已完整入库，但 114 条 Performance 索引行指向的图文件路径全部不存在：

| 层 | 来源 | 状态 |
|---|---|---|
| 任务元数据 | `MainMission` / `MissionChapterConfig` / `ActivityPanel` | ✅ 完整（9 任务、名称、顺序、面板） |
| 子任务定义 | `Config/Level/Mission/105452x/MissionInfo_*.partial.json` | ✅ 完整（143 个子任务：接取/完成/路点/组） |
| 演出索引 | `PerformanceC/DS/E/Video` | ⚠️ 索引在、路径全死（114/114 不存在） |
| 演出图 | `Story/Discussion/Mission/105452x/DS*.json`、`Config/Level/Mission/105452x/Act/*.json` | ❌ 整层缺失 |
| 场景组图 | `Config/Level/GroupGraph/F10551001` 等 4 楼层 | ⚠️ 部分在（84 个引用本章的组文件） |
| 台词字典 | `TalkSentenceConfig` 1552\* 系列 | ✅ 完整（1805 句，1362 句带说话人） |
| Timeline 资产 | `*.playable` | ❌ 全仓库为 0（但不影响文本重建，见 §6） |

版本归属已定位：章节标题 Hash 属于 `ActivityPanel` 行 80030，UI 预制体为 `QuestMainStory451Panel`（4.5.1 版本主线面板），`UnlockConditions=[FinishMainMission:1000510]`，`FinishConditions=[FinishMainMission:1054528]`。即 **Excel 桩先于剧情图入库**：4.5.0 基础包携带了下个版本面板的任务/字典/索引，而演出图属于 4.5.1 内容。

数据新鲜度已排除同步问题：子模块 `extern/TurnBasedGameData` HEAD 为 `4ce30f69b3`（OSPRODWin4.5.0_D16545211，2026-09-16），与 origin/main 完全一致；git 全历史 pickaxe `105452001` 在 Story/ 与 TalkSentenceConfig 的图引用中从未出现；`MainMission.json` 于 4.5.0 提交 `5d064ec9bd`（2026-08-26）新增 105452x，同一提交将 TalkSentenceConfig 整表重写、带入 1552\* 系列 1805 句。

这不是孤例，而是新版本内容的系统性空洞（同机位证据）：

| 内容 | 演出图状态 |
|---|---|
| 本章 105007（1054520–1054528，Gap） | 全部缺失 |
| 姊妹主线章节 105008「为何一切尚未消失？」（1054500–1054506，Main） | 同样缺失（DS 索引 61 行全死） |
| 105008 的 Branch 支线 2054500–2054502（鸡窝头侦探等） | **完整**（DS 45 行 + Act 12 行全部存在） |
| 上一代续闻章节 104006「命运/驻足梦国之夜」（1040531–1040554，Gap） | **完整**（128/128 演出行全部存在） |
| 章节间章 105006（1054400 系） | 部分缺失（15 任务中 10 个无图） |

因此本案例拆成两半执行：**A. 目标章节按可得层解析**（任务结构、场景层普查、字典文本整理）；**B. 用数据完整的同规格章节 104006 作代理**，完成原本目标章节无法提供的演出图类型分析与分支格式验证。两侧结论对正式解析器同等重要。

## 2. 实测输入与关联链

### 2.1 使用的数据

| 数据 | 本例用途 |
|---|---|
| `ExcelOutput/MissionChapterConfig.json` + TextMap | 章节存在性与元数据（ChapterType=Activity） |
| `ExcelOutput/ActivityPanel.json` + TextMap | 章节标题 Hash 归属、版本面板、解锁/完成条件 |
| `packages/cli-hsr/output/CHS/mission/graph.json` | 9 个任务的名称、类型（Gap）、顺序、世界（602） |
| `Config/Level/Mission/105452x/MissionInfo_*.partial.json` | 143 个子任务（TakeType/TakeParam、FinishType/Param、路点、GroupIDList） |
| `ExcelOutput/PerformanceC/DS/E/Video.json` | 114 条演出索引 + 播放元数据（IsSkip/StartBlack/ChangePlayerType/Plane/Floor） |
| `Config/Level/GroupGraph/F10551001` 等 4 楼层 | 84 个引用本章的组文件（触发装设、演出调用、任务推进、走图对白） |
| `packages/cli-hsr/output/CHS/scenario/talksentence.json` | 1552\* 系列 1805 句台词（含说话人） |
| 代理：`Config/Level/Mission/10405xx`、`Story/Discussion/Mission/10405xx`、`Story/Mission/10405xx` | 196 个图文件、128 条演出行（全部存在） |
| `docs/scenario-type-inheritance-inventory.md` | 类型族背景与分类依据 |

沿用定分枪案例的原则：台词与角色一律消费 cli-hsr 已处理输出，不在案例脚本里重复 TextMap join；只有章节/面板标题 Hash 仍用 `json-bigint` 保真读取。

### 2.2 关联链在哪里断掉

```text
MissionChapterConfig 105007
  → MainMission 1054520–1054528（graph.json 已有）
  → MissionInfo.partial：子任务 → FinishType=Talk + ParamStr1="Mission_105452xxx"
  → GroupGraph 组图：AdvSetupCustomTaskTrigger(Prop) → WaitGroupEvent(EnterArea_Gxx)
      → TriggerPerformance(D, 105452001)
  → PerformanceDS[105452001].PerformancePath
      = "Story/Discussion/Mission/1054520/DS105452001.json"
  → ❌ 文件不存在（114/114 全部如此）
```

断点精确落在最后一跳。此前的每一层都成立，而且组图本身证明这些演出 ID 就是被当前版本数据引用的活数据。

值得记录的正面发现：**`MissionInfo.partial.json` 是比 `SubMission.json`（纯文本字典）更完整的子任务结构来源**。它带 `LevelFloorID`、`GroupIDList`、路点（WayPoint\*）和接取参数，即使演出图缺失，也能重建"子任务 → 楼层 → 组 → 演出 ID"的骨架。正式流水线应把它纳入拉取清单（目前 docs 只提到 `Mission/` 目录的 Act/Talk）。

### 2.3 场景组图（GroupGraph）的角色

本章 4 个楼层（10551001/20551001/40552001/40553001）中，内容含 `105452` 的组文件共 84 个。以 G74 为例的典型形状：

```text
AdvSetupCustomTaskTrigger（Prop 300001 触发）
  → TriggerGroupEvent("EnterArea_G74")
WaitGroupEvent("EnterArea_G74")
  → TriggerPerformance(D, 105452001)
  → PerformanceEndSeq(Case 0: ClientFinishMission 105452001
                       Case 1: ClientFinishMission + OpenTreasureChallenge RaidID 40552)
```

组图是**任务在现场的接线层**：装触发器、调演出、收任务。它不是对白主体，但含有少量内嵌台词（`PlayMissionTalk` 走图旁白、`PlayNPCBubbleTalk` 气泡）。本章足迹内共 26 处 `TalkSentenceID` 引用，25 处成功解析为 CHS 文本（如 155221803 服务生「这边走。」）。有趣的是这 25 句全部属于 1552\* 系列——走图旁白与演出正文共用同一字典段。

两个变体任务的性质也由这一层确认：1054521/1054525 的 50+ 个子任务全部落在楼层 40552（Raid 层），是「不要钱挑战」的玩法变体（由 105452001 完成后 `OpenTreasureChallenge(40552)` 开启），复用正片演出、无独立台词块。

## 3. 场景层类型普查（53 类型）

对 84 个组文件做全量 `$type` 统计，去重 53 种、共 509 个实例。按"对文本展示的作用"分类（分类表完整保存在 output.chs.json 的 `sceneLayer.typeCensus`）：

| 类别 | 实例数 | 含义 |
|---|---:|---|
| control（控制流） | 205 | 事件总线（Wait/Trigger GroupEvent、WaitCustomString）、触发器装设、条件容器、等待器 |
| mission（任务推进） | 183 | ClientFinishMission 87、TriggerPerformance 74、SetMissionCustomValue、SetTextJoinValue… |
| presentation（演出表现，**文本无用**） | 81 | 面向/转向、显隐、渐隐、滤镜、HUD、教程锁、加载策略、音频、特效、目标选择器… |
| talk（直接承载台词） | 24 | PlayMissionTalk 18、PlayNPCBubbleTalk 3、PlayFullScreenTransfer 3 |
| obfuscated（混淆类型） | 13 | 见下 |
| lifecycle | 3 | PerformanceEndSeq 等 |
| talk-media | 0 | 组图层没有 Timeline（那是演出图内的事） |

**混淆类型已按字段形状部分解码**。`NONAIBLAJKA` 的字段形状为 `PlaneID=10551 / FloorID=10551001 / "C" / 105452705 / MaskConfig`——它就是 `TriggerPerformance` 的混淆版本，且确实在主线场景组里真实出现。另有 6 个混淆类型（`BDLHKCMCMGJ`、`LLPEOHPKGOM` 均携带演出 ID 串；`MCFJIFLMBCE`/`MPCOPCFENHI` 共享编号 7602；两个仅剩空对象或单数字）无法仅凭实例定名。结论：**解析器必须内置"按字段形状识别"的兜底通道**，`$type` 名匹配不能是唯一判据（与 docs §1.8.6 第 3 条一致，本案例给出主线场景层的实测证据）。

## 4. 台词字典与文本整理

1552\* 系列与任务存在稳定的编号映射：**`155` + 任务末两位 + 区块位**。

| 任务 | 前缀 | 句数 | 内容 |
|---|---|---:|---|
| 1054526 一名陌生网红的挑战 | 155260/155261 | 227 | 知更鸟线开场 |
| 1054520 不要钱挑战•第一日 | 155200/155201/155202 | 363 | 小勤/购物/天气卡 |
| 1054522 第二日 | 155220/155221 | 305 | 指针塔、拍卖会 |
| 1054523 第三日 | 155230/155231 | 220 | — |
| 1054524 结算日 | 155240/155241/155242 | 374 | 大禽频道、结算 |
| 1054527 猜赛车挑战 | 155270 | 223 | 球笼赛车 |
| 1054528 挑战结束，然后… | 155280 | 93 | 大结局 |
| 1054521 / 1054525（变体） | 无 | 0 | Raid 变体，复用正片 |

1805 句全部解析到 CHS 文本，1362 句带说话人。说话人分布（前列）：旁白 443、知更鸟 221、砂金 214、大禽 211、小勤 135、{NICKNAME} 115、拍卖师 62、舒俱 35、舒翁 30。文本含 56 处 `{NICKNAME}`、2 处 `{TEXTJOIN#…}`、以及 `{M#…}{F#…}` 性别分支占位符——与定分枪案例一致，产物不做破坏性清洗。

产出 [dialogue.chs.md](./dialogue.chs.md)（1889 行）：按任务顺序分节、任务内按句 ID 升序。**必须明确其限制**：同一演出块内句 ID 按播放顺序连续分配，故 ID 顺序是块内顺序的可靠近似；但块间次序与选项分支无法从字典恢复。实测抽查显示正文读感连贯，但说话人为空的行中混有玩家选项文本（例如知更鸟问"你对赛车感兴趣吗？"之后的连续多行不同回答，实为选项/回应对），在无图数据下无法区分，文档头已声明。

**后续实测校验（2026-09-25，对照游戏内实际剧情）**：dialogue.chs.md 与真实剧情内容基本一致，仅两类偏差——玩家选项被摊平成顺序行、部分旁白与全屏文本顺序有少量差异；在理解故事内容的级别已经足够。这确认了「句 ID 顺序 ≈ 演出顺序」假设成立，也把上述两类偏差定为快速浏览视图（Tier 1）的已知误差特性而非未知风险。同日人工复核 [proxy-1040537.chs.md](./proxy-1040537.chs.md) 未发现明显问题。

## 5. 代理章节实测：这一代主线规格图的真实形状

代理选用 chapter 104006（「命运/驻足梦国之夜/咏叹腐朽金黄」，13 任务、128 条演出行全部存在、196 个图文件：DS 89 + Story 9 + Act 34 + Mission\_ 62 + 其他 2）。

### 5.1 类型分布：比想象中窄得多

196 个文件去重仅 **36 种 `$type`、1945 个实例**（对照 docs §1.8 的全量核心图 466 种）。Top 10：

| 类型 | 实例 | 类别 |
|---|---:|---|
| OptionTalkInfo | 355 | 对白（选项条目） |
| PlayTimeline | 343 | 媒体（正文在字典） |
| WaitCustomString | 259 | 控制 |
| PlayOptionTalk | 145 | 对白（选项组） |
| EndPerformance / LevelPerformanceInitialize / WaitPerformanceEnd / FinishLevelGraph | 各 132–134 | 生命周期 |
| TriggerCustomString | 110 | 控制 |
| ClientFinishMission | 36 | 任务 |
| PlayAndWaitSimpleTalk | 21（仅 Act） | 对白 |
| AdvNpcFaceToPlayer | 16（仅 Act） | 表现 |
| PlayMissionTalk | 15（仅 Mission\_） | 对白 |

也就是说，**这一代的开拓续闻规格只用了核心图类型清单的约 8%**。把 36 种类型做对，就覆盖了整章；其余 400+ 类型属于其他玩法域（Rogue、市政、战斗等）。这直接回答了"子类型要支持到多细"：主线规格下按类别（§6 的三类处理法）粗分即可，无需 466 个 switch。

### 5.2 DS 格式的关键结构：正文不在图里

对白主体（Discussion 图）的形状（以 1040537 的 DS104053701 为例，22 个序列）：

```text
seq0  [入口] LevelPerformanceInitialize → PlayTimeline(DS…01.playable) → PlayOptionTalk
        选项 #105003454 → TriggerCustomString "TalkSentence_105003458"
        选项 #105003455 → "TalkSentence_105003456"
        选项 #105003457 → "TalkSentence_105003458"
seq1  [W:105003456] PlayTimeline(02) → T:"TalkSentence_105003458"
seq2  [W:105003458] PlayTimeline(03) → T:"Wait_Option_104053701_20"
seq3  [W:Wait_Option_…_20] PlayOptionTalk（下一组选项 460/462/464）
seq4/5 [W:461 / W:463] PlayTimeline → T:"Wait_Option_…_20"   ← 回环：选错重选
seq6  [W:465] PlayTimeline → T:"Wait_Option_…_29"             ← 跳组：直达下一题
…
seq21 [W:105003505] PlayTimeline(19) → T:"Wait_Option_…_29"   ← 远距离汇合
```

要点：

1. **正文句几乎不携带 `TalkSentenceID` 字段**——`PlayTimeline` 的 `.playable` 资产里播放的台词只存在于字典。图内显式 ID 只有选项文本（OptionTalkInfo.TalkSentenceID）。
2. **分支/汇合边是 CustomString**，形态有二：`TalkSentence_{id}`（句子锚点，id 恰好是目标序列播放的首句 ID）与 `Wait_Option_{file}_{n}`（枢纽串，无句子含义，承担"选项组间汇合 / 重试回环 / 跳组"）。
3. 一组选项中可混合两种走向：有的选项直接触发共享回应句（无专属分支），有的触发专属分支再汇合。
4. 汇合可在 ID 空间上跳跃（seq21 播放的 #105003505 数值上位于段尾，逻辑上属于中段选项组）。

### 5.3 锚点区间归属法（本案例提出并验证的算法）

由 2 可推出正文归属规则：**等待句子锚点 w 的序列拥有字典区间 [w, 下一个更大锚点) 内的非锚点句**；入口序列拥有 [块起点, 首个锚点)；块起点由"从最小锚点向下走、字典连续、不越过上一块末尾"推定。选项锚点（选项文本）不属于正文。

在 1040537 全部 11 个 DS/Story 文件上验证：**0 孤句、0 未展开**（覆盖检查写入每块尾部）。这证明仅凭「图 + 字典」即可完整重建这一代演出的分支文本，`.playable` 资产对文本重建不需要。

这一条对现有方案是实质性修正：docs §3.1 与两个参考仓的做法（白名单扫图内 `TalkSentenceID`）在 DS 格式上**只能拿到选项文本，会丢掉几乎全部正文**。参考仓解析的是旧格式 Act（SimpleTalkList 在图内），新一代主线对白不是这种形状。

### 5.4 演示产物

[proxy-1040537.chs.md](./proxy-1040537.chs.md) 按目标格式渲染了整个任务（11 个演出块）：正文顺序行、选项缩进分支、每条分支结尾 `↩ 汇合于 [#锚点](链接)` 跳转引用、多入度汇合点带 `⟲ 汇合点` 标题与锚点、重试回环以引用回到已展开的选项组、纯 Timeline 无对白的演出（DS104053707）标记为可跳过。此文件即未来剧情查看器「分支视图」的格式样例。2026-09-25 人工复核未发现明显问题。

## 6. 对未来剧情查看器的直接结论

### 6.1 类型处置三分法（结合本案例场景层 + 代理图两层实测）

**完整展开（文本核心）**：`PlayAndWaitSimpleTalk` / `PlaySimpleTalk` / `PlayMissionTalk`（SimpleTalkList 系，一个 handler 吃掉全部变体，仅保留 playback 差异——与定分枪结论一致）；`PlayOptionTalk` + `OptionTalkInfo`；气泡系 `PlayNPCBubbleTalk`；`PlayFullScreenTransfer`（转场黑字，图内带 ID）；锚点区间归属法重建的 Timeline 正文。

**折叠为一行（保留语义、不进正文流）**：

| 类型 | 一句话形式 |
|---|---|
| PlayVideo | `[视频过场]` |
| PlayTimeline（节点本身） | `[Timeline 演出]`（正文已按锚点展开；保留 .playable 名供追溯） |
| RaidSceneTransfer | `[进入副本]` |
| TriggerBattle | `[进入战斗]` |
| OpenTreasureChallenge | `[开启挑战]` |
| AdventureShowReading | `[阅读物]` |
| LevelPerformanceInitialize | 元数据行：场景角色名单（CreateCharacterList 对"谁在场"有信息量） |
| EndPerformance / WaitPerformanceEnd / FinishLevelGraph | `[演出结束]` |
| ClientFinishMission / SetMissionCustomValue | `[任务进度 → #id]` |

**直接跳过（对文本展示无用）**：面向/转向（AdvNpcFaceToPlayer、AdvEntityFaceTo）、显隐/渐隐/创建实体、滤镜（PPFilterStackEffect）、HUD（SetHudTemplate、ShowUI、ShowTutorialUI、TutorialLockPlayerAction）、加载策略（SetLoadingStratageType）、音频（SetMissionAudioState、TriggerSound）、特效（TriggerEffect）、角色动作（CharacterTriggerFreeStyle）、碰撞/物件状态、目标选择器（TargetFetch\* 家族）、表情气泡（ShowEmojiBubble）。本案例场景层 81 实例 + 代理图约 30 实例全部落入此类，无一携带文本。

**进事件 IR 但不进正文视图**：Wait/TriggerCustomString（含 `Wait_Option_*` 枢纽）、WaitGroupEvent/TriggerGroupEvent、PredicateTaskList/SwitchCase/RandomConfig、ByCompare\* 条件族、PerformanceEndSeq。它们不渲染，但分支视图的拓扑完全依赖它们。

### 6.2 子类型粒度

- 选项：本两层实测只遇到裸 `OptionTalkInfo`，无 Rogue/Dice 子类。主线规格下一个 handler 即可，子类留给对应玩法域。
- SimpleTalk 家族：按基类 `SimpleTalkListConfig` 处理（定分枪已证），无需逐子类。
- Timeline：**不需要解析 .playable**。文本完全可由锚点区间归属法还原；playable 只影响语音与运镜。
- 混淆类型：按字段形状识别（本案例解码 `NONAIBLAJKA` = TriggerPerformance），未解码的保留原始节点进 opaque。

## 7. 对现有方向的修正建议

以下按 [scenario-parser-directions.md](../../docs/scenario-parser-directions.md) 的章节号（两级提取为总纲，已收录进该文档 §5.5）：

1. **总纲：两级剧情提取（→ §5.5）**。Config/Story/Stages 的还原链路比 ExcelOutput 复杂且存在整体滞后的常态（本案例整章空洞即实证），剧情提取分两级推进——**Tier 1 快速浏览文本**（字典驱动，仅依赖 ExcelOutput，形态即 dialogue.chs.md，实测已达"理解故事内容"级别，任何章节随最新字典即时可产）；**Tier 2 完整分支形式**（图驱动，需 Config/Story 入库，DS 时代需锚点区间归属法，形态即 proxy-1040537.chs.md）。同一章节先挂 Tier 1，Tier 2 就绪后替换或并列；数据滞后只影响 Tier 2。
2. **§1.7 / §3.5（数据拉取范围）**：'拉取 `Config/Level/Mission` + `Story/Mission` + `Story/Discussion` 即可覆盖主线' 的假设被打破——新版本（4.5.x 面板）内容的演出图不在基础包里。正式流水线需要：① 以 Performance 表行做**路径存在性巡检**（本案例 114/114 死路径即为警报信号）；② 接受"整章有字典无图"并落库版本面板归属；③ 把 `MissionInfo_*.partial.json` 与 `GroupGraph/F*`（至少任务引用的楼层）纳入拉取清单。
3. **§2.6（约一半台词无图）**：本案例是"整章粒度"的实例，且证明无图不等于无法展示——字典 ID 前缀 ↔ 任务的映射（1552x↔105452x）可独立于图建立，前端可先挂"无图文本视图"（dialogue.chs.md 即其形态），待图入库后升级为分支视图。
4. **§3.1（解析覆盖）**：新增**锚点区间归属算法**为 DS 时代正文的必需路径；白名单扫图内 ID 的旧方案在新格式上会静默丢正文。汇合信号不止 `TalkSentence_{id}` 一种形态，`Wait_Option_*` 枢纽串承担选项组间拓扑。
5. **§1.8 / §3.6（类型目录）**：466 类清单对主线规格的实际调用面仅约 8%（36 类）。类型目录的优先级排序应以"主线规格调用面"为第一梯队，不必为 400+ 类型做语义表。
6. **§3.2（关联）**：`ActivityPanel` 是章节→版本面板→解锁/完成条件的现成锚点，建议并入 `mission/graph.json` 输出（本案例 80030→QuestMainStory451Panel→FinishMainMission:1054528）。
7. **方法论**：数据滞后期用同规格完整章节做代理分析（本案例 104006）是可行的常规手段；代理结论（格式、类型面、算法）可直接迁移，等目标图入库后重跑即可。

## 8. 本次测试未解决的边界

- `155200/155201/155202` 三个区块在任务内的先后仅有数值顺序佐证，未获图确认；
- 说话人为空的 443 句中选项文本与旁白无法区分（无图；实测影响仅为选项摊平，见 §4 校验）；
- 全屏文本（转场黑字类）与部分旁白的顺序在快速视图中有少量偏差（实测确认，Tier 2 可消除）；
- `Wait_Option_*` 枢纽的"选项组重试"语义（回环至玩家做出特定选择）由结构推断，未经运行时确认；
- 锚点区间归属法样本为 1 个任务（11 块、0 例外，人工复核通过），未在全部 89 个 DS 上回归——正式化时应做全量孤句统计；
- 6 个未解码混淆类型的语义待 DummyDll 交叉（`TakeEventMission` 式的版本错位可能存在）；
- `MissionInfo.partial` 的 `TakeType=AnySequence/Sequence` 接取语义未展开为完整 DAG。

## 9. 产物清单与运行方式

| 产物 | 内容 |
|---|---|
| `parse.mjs` | 全流程脚本：可得性矩阵、演出索引死路径核对、场景层普查（53 类型分类）、字典分组、代理章节普查、DS 分支重建与渲染；含 10 项断言，本次全部通过 |
| `output.chs.json` | 结构化产物（case / availability / performanceIndex / sceneLayer / dialogue / proxy / diagnostics） |
| `dialogue.chs.md` | 目标章节 1805 句台词整理（任务顺序 + 句 ID 顺序，含说话人与限制声明） |
| `proxy-1040537.chs.md` | 代理任务分支格式样例（嵌套缩进 + 汇合点跳转引用，11 演出块全覆盖） |

运行方式（当前目录为 `packages/scenario-parser`）：

```powershell
node ./case-tests/chapter105007/parse.mjs
```

产物固定写回本案例目录。上游 TurnBasedGameData 更新到含 4.5.1 图文件的版本后，重跑本脚本即可看到 `deadPaths` 归零路径的对比（脚本断言届时需要按"全存在"翻转）。
