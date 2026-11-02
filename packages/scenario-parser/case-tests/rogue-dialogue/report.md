# 第三个案例：模拟宇宙 / 差分宇宙事件对白

日期：2026-09-26。数据快照：`4ce30f69b32dc259ab9a8da3ba57035485103221`。

本案例核对两个指定句子的真实入口，并补充普通事件、差分宇宙不同版本、寰宇蝗灾、星神对白和不可知域事件共 8 个样本。结论是：**正文结构相对简单，但选项文本与入口并不统一；可以共用 Rogue 对白解析，不能只靠台词字典或单张入口表。**

## 1. 产物和复现

在 `packages/scenario-parser` 执行：

```bash
npm run test:rogue-dialogue
```

只读取项目的 `./data`，依赖工作区现有 `json-bigint`，不需要 cli-hsr 预生成输出或 DummyDll。可传输出目录，例如 `npm run test:rogue-dialogue -- .cache/rogue-dialogue`，以便对照已保存结果。

- [extractor.mjs](./extractor.mjs)：案例用表索引、入口路径巡检、Act/Opt 配对、文本与控制边提取。
- [parse.mjs](./parse.mjs)：8 个真实案例、回归断言与扩面巡检。
- [dialogue.chs.md](./dialogue.chs.md)：可读中文对白，保留并列选项与汇合链接。
- [output.chs.json](./output.chs.json)：样本入口行、原始选项、正文、来源指针和控制边。
- [coverage.json](./coverage.json)：当前入口集合的覆盖统计、缺失路径、未解析选项、图内未匹配信号。

提取器留在案例目录内，尚未注册为 cli-hsr 的全量生产 Extractor，也没有修改现有主线快速提取器。案例输出用于核对格式和后续实现依据，不代表模拟宇宙全部运行时逻辑已还原。

## 2. 两个指定句子的真实归属

| TalkSentenceID | Excel 入口 | 展示名称 | 图文件 | 正文 / 选项 |
|---|---|---|---|---:|
| 403058523 | `RogueMagicStory.StoryID=53023`，`LevelGraphPath` | 未来学大会•其三 | `Config/Level/RogueDialogue/RogueNpcDialogEvent/Act/Act403058520.json` | 9 / 6 |
| 403818312 | `RogueTournTitanTalent.ID=13002`，`ActJson` | 约束人德之法 | `Config/Level/RogueDialogue/RogueNpcDialogEvent/Act/Act403818310.json` | 14 / 7 |

第一句是“帕提维娅成功通过了课题审核……”；入口行 `StoryCategory=MagicWar`，标题来自 `StoryName.Hash`。

第二句是“人子对塔兰顿的感情十分复杂……”；入口行 `TitanType=Talentum`、`Level=2`、`PreID=12902`。剧情名应取 `ActTitle`，不是同一行的天赋名 `TalentTitle`（“赐福凝练”）。因此不能将这段剧情归到 `RogueMagicStory`，也不能从相同的 RogueNpcDialogEvent 目录推定它属于普通事件图鉴。

两份图都使用 `PlayAndWaitRogueSimpleTalk.SimpleTalkList` 和 `PlayRogueOptionTalk.OptionList`，正文与选项均有显式 `TalkSentenceID`。无需套用第二个案例的 DS 锚点区间补句，也无需按编号前缀认领。

两段剧情的选项均存在多选一后汇合：第一段的 403058525–403058527 都发出 `TalkSentence_403058528`；三个选项只对应一份后续正文。脚本保存每条边并在文档中链接到共同 sequence，不将后续正文复制三遍，也不将选项摊平成连续发言。

## 3. 入口不是一个统一的故事表

本次扫描全部 `Rogue*.json` 表中的真实对白/NPC 配置路径，再沿 JSON 内路径递归。发现 10 张表直接提供入口：

| 表 | 入口字段 / 路径数 | 说明 |
|---|---|---|
| RogueMagicStory | LevelGraphPath / 39 | 不可知域剧情 |
| RogueTournTitanTalent | ActJson / 36 | 泰坦天赋关联剧情；标题为 ActTitle |
| RogueTournFormula | FormulaStoryJson / 27 | 方程附带剧情，只有部分行有路径 |
| RoguePersonaTalent | OMKFHNLHBBB / 12 | 当前快照的混淆字段；按实际路径发现，不重命名为臆测字段 |
| RogueNousSubStory | LevelGraphPath / 20 | 黄金与机械的子剧情入口 |
| RogueDLCSubStory | LevelGraphPath + OptionPath / 84 | 42 行分别引用 Act 与 Opt |
| RogueCommonDialogue | DialoguePath / 7 | 共用对白 |
| RogueNPC | NPCJsonPath / 260 | 经 NPC 配置的 DialogueList 取具体图 |
| RogueTournNPC | NPCJsonPath / 316 | 差分宇宙 NPC 配置 |
| RogueMagicNPC | NPCJsonPath / 55 | 不可知域 NPC 配置 |

这张表统计直接路径，不等价于玩法导航树。例如 `RogueNousMainStory.RogueNPCID` 是另一层元数据关联；`RogueDLCMainStory` 本身没有本次扫描识别的 JSON 路径。`RogueAeonStoryConfig` 则直接存故事文本 Hash，不能视为 `PlayAeonTalk` 的必经入口。本案例不声称重建所有玩法的解锁顺序。

### 3.1 图鉴 → NPC → Act / Opt

“游牧矿工”的实测链路：

```text
RogueHandBookEvent[EventHandbookID=2]
  UnlockNPCProgressIDList[].FDOELDMEBPE = 10101 / 110101 / 310101
  → RogueNPC[RogueNPCID=10101].NPCJsonPath
  → Config/Level/Rogue/RogueNPC/RogueNPC10101.json
  → DialogueList[0]
      DialoguePath → .../Event0010101/Act0010101.json
      OptionPath   → .../Event0010101/Opt0010101.json
```

这里 `UnlockNPCProgressIDList` 是图鉴进度关联，不应当作唯一的可播放入口。一个图鉴条目可以挂多个版本 NPC。脚本按当前快照的混淆字段 `FDOELDMEBPE` 核对，保留完整原行，不通过数值前缀猜对应关系。

差分宇宙“杰姆·哈克与杰姆·哈尔”使用 `RogueTournHandBookEvent[5]`，进度关联 410301 / 610301 / 710301，分别经 `RogueTournNPC` 指向不同版本的配置。样本 410301 与 710301 的正文均为 403810301–403810305，但选项分别为 2 个与 3 个，选项 ID、展示行和效果参数也不同。**正文复用不意味着事件配置相同。**

## 4. 同一种选项 UI，至少三条文本关联链

### 4.1 剧情选项：直接走台词字典

```text
PlayRogueOptionTalk.OptionList[].TalkSentenceID
  → TalkSentenceConfig.TalkSentenceText.Hash → TextMapCHS
```

两个指定句子所属图均为这一种。不能要求每个 Rogue 选项都有 `RogueOptionID`。

### 4.2 旧事件选项：Act 与 Opt 分离

```text
Act.OptionList[].RogueOptionID
  → 同一入口 OptionPath 指向的 Opt.OptionList[].OptionID
  → DisplayID
  → RogueDialogueOptionDisplay.OptionDisplayID
  → OptionTitle.Hash / OptionDesc.Hash → TextMapCHS
```

“游牧矿工”选项 10101 / 10102 通过 Opt 关联到展示行 10101 / 10102，得到“克里珀的恩赐。” / “克里珀的祝福。”及效果描述。**ID 恰巧相等只是本例现象**；差分样本 410301 的 `DisplayID=10305`，已证明不能直接拿 `RogueOptionID` 查展示表。

Act 中还保留 `OptionTextmapID.Hash`，但当前扫描的 3091 个此类引用全部在所加载的 CHS TextMap 中缺失。它们在输出中保留为原始字段与诊断，展示文本从显式 Opt/Excel 关联获取，不因旧 Hash 失效而丢掉选项。

### 4.3 新事件选项：Excel 中的 Option 配置

```text
Act.OptionList[].RogueOptionID
  → RogueDialogueOption.OptionID
  → OptionDisplayID
  → RogueDialogueOptionDisplay.OptionDisplayID
```

`RogueTournNPC[710301]` 引用的 Opt 文件缺失，但 Act 的 `RogueOptionID=1030501` 可在 `RogueDialogueOption` 查到，其 `OptionDisplayID=210305`，并非旧版的 10305。两者标题相同，效果模板和参数不同：

| 版本样本 | 配置 | 描述模板 | 参数 |
|---|---|---|---|
| 410301 | Opt 410301 → Display 10305 | 获得#2-#5个随机2星祝福。 | DescValue=1，DescValue2=3 |
| 710301 | Excel Option 1030501 → Display 210305 | 获得#1-#2个随机2星祝福。 | ParamList=[1,2] |

案例输出保留模板和参数，不将旧 `DescValue` 机械映射为 `#1`，也不宣称解析器选定的展示顺序等同于游戏运行时优先级。`DynamicMap`、`SpecialOptionID` 和其他原始字段同样保留，条件可见性、动态参数与效果结算不在此次验证范围内。

Excel 与图文件中的文本 Hash 可能超过 JavaScript 安全整数范围，本案例统一用 `json-bigint` 保留为字符串。用普通 `JSON.parse` 读取这些 Hash 会改变数值，造成假的“TextMap 缺失”。

## 5. 特殊结构覆盖

| 样本 | 正文 / 选项 | 本次确认 |
|---|---:|---|
| 未来学大会•其三 | 9 / 6 | 两组选项分别汇合，句子 403058523 可定位 |
| 约束人德之法 | 14 / 7 | TitanTalent 独立入口，句子 403818312 可定位 |
| 游牧矿工，NPC 10101 | 4 / 2 | PlayRogueSimpleTalk + WaitRogueSimpleTalkFinish；旧 Opt 文本链 |
| 杰姆事件，NPC 410301 | 5 / 2 | 图鉴进度关联、独立效果参数 |
| 杰姆事件，NPC 710301 | 5 / 3 | Opt 缺失、Excel Option 链仍可还原标题 |
| RogueDLCSubStory 101 | 8 / 2 | 蝗灾 Act/Opt 双路径、SpecialOptionID、分支与汇合 |
| RogueNPC 103 | 16 / 2 | PlayAeonTalk.SimpleTalkList 与普通对白共用载荷提取 |
| RogueMagicNPC 510801，酒馆 | 14 / 6 | WaitDialogueEvent 与无直接 Trigger 的选项 |

`WaitDialogueEvent.DialogueEventList[]` 将 `DialogueEventID` 关联到 `SuccessCustomString`，再抵达 `WaitCustomString`。酒馆样本中 110803 → `TalkSentence_403810804` 等关系可以静态验证，但前面的选项没有直接 `TriggerCustomString`。本案例保存这些回调边，**不凭 ID 接近推断某选项必然产生哪个 DialogueEventID**；选项效果如何触发运行时事件仍需额外数据/运行时验证。

所有 object/array 默认递归。顺序对白不依赖子项具有 `$type`；PlayAeonTalk 的载荷也不会漏掉。背景、生命周期、未知控制任务保留原始字段，选项保留图标与附加属性。未还原客户端调度器、条件求值或奖励结算。

## 6. 扩面结果与数据边界

本次范围是上述 Rogue Excel 入口可达的对白/NPC/选项配置；不含未挂入口的孤立图、战斗/棋盘/Modifier、全部 Config 扫描或 Excel 内纯文本故事。

- 引用文件 2279 个，存在 2112 个；缺失 167 个，均为 OptionPath 所指 Opt 文件。
- 932 个演出图，932 种 Act/Opt 配对，21 种 `$type`。
- 选项共 4176 个：台词字典 1018、旧 Opt 2276、Excel Option 632、标题未解析 250。
- 图内正文/选项的 `TalkSentenceID` 均可查到当前字典和 CHS 文本，缺失计数为 0。
- 指定两个句子在此入口集合中各命中一个图，反向入口行见 coverage.json 的 targetReferences。

250 个标题缺口来自 43 个图：`Event0390101` 的 4 个展示行只有 ID，没有 OptionTitle/OptionDesc；其余 246 个位于差分 Tourn2/Tourn3 图，既没有可用的本地 Opt 项，也查不到对应的 Excel Option 行。具体配置缺失原因随每条诊断保留，不能把没有标题的占位行强行补成猜测文本。

另有 90 条发送信号在本图没有匹配的 `WaitCustomString`（涉及 45 个图）。包括 `TriggerPopTalk`、`DialogueFinished` 等可能供外部消费的串，也包括 `TalkSentence_*` / `triggerOpt_*` / `triggerEvent_*`。本案例只确认“本图无接收者”，未证明它们都是坏边；这些边完整保留为未匹配，不自动删掉或视为剧情结束。

**样本完整与扩面完整是两个不同结论。** 8 个样本的正文、选项标题和内部已声明跳转全部通过断言；扩面仍有上述缺口，不报成“模拟宇宙全部解析成功”。缺失的旧内联 Hash 与缺失 Opt，即使已有可用替代关联，也持续计入诊断。

## 7. 对快速提取与后续解析的修正

1. Rogue 应有独立入口索引；任务目录、MainMission 和六位句块归属不能直接套用。展示名称也要按入口区分 StoryName、ActTitle、EventTitle 等字段。
2. 文本解析同时支持台词字典与选项展示表，并保留正文共用而选项不同的多个事件版本。仅扫描 TalkSentenceID 会漏掉本次范围内 3158 个事件选项。
3. 有图时直接按 SimpleTalkList 和 OptionList 提取，再保存 CustomString 边即可覆盖这批简单剧情，不需要 DS 区间插值。没有图时也不能从 Rogue 字典编号推出选项归属。
4. Act/Opt 必须由入口行配对。新版 Excel Option 链是有效补充，但缺失记录仍需保留；不能拼文件名或把 OptionID 当 DisplayID。
5. “完整分支”还需区分纯剧情跳转与运行时 DialogueEvent 回调。静态的可读文本、选项、模板、来源可以先提供，动态事件与效果语义需后续单独验证。
