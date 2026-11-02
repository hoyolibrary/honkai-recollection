# 逐光捡金（深渊挑战）提取器设计计划

> 状态：设计定稿，公式与数据链路已实测验证（数据事实已按 2026-09 实测复核修正）。本文档描述四种
> 深渊挑战（忘却之庭 / 虚构叙事 / 末日幻影 / 异相仲裁）的设计方案，覆盖数据定位、公共结构建模、
> 敌人血量计算与输出布局。本文仅记录数据提取侧的设计、实现口径和验证依据。

---

## 1. 四种深渊的游戏内标识

四种模式分别对应 ExcelOutput 中一组前缀一致的配置表：

| 游戏内名称 | 模式 | 数据表前缀 | 备注 |
|------------|---------|-----------|------|
| 忘却之庭 | `maze` | `ChallengeMaze*`（另有 `ChallengeTheme*` 主题资源） | 又名 ChallengeMaze / Memory of Chaos；模式标识与表前缀一致取 `maze` |
| 虚构叙事 | `story` | `ChallengeStory*` | Pure Fiction |
| 末日幻影 | `boss` | `ChallengeBoss*` | Apocalyptic Shadow |
| 异相仲裁 | `peak` | `ChallengePeak*` | Anomaly Arbitration |

`ChallengeGroupConfig.ChallengeGroupType` 枚举进一步印证：`Memory`（忘却之庭）、`Story`（虚构叙事）、
`Boss`（末日幻影）。异相仲裁表结构独立（`ChallengePeak*`），无对应 `ChallengeGroupType`。

数据定位规则：按关键字 `ChallengeMaze` / `ChallengeStory` / `ChallengeBoss` / `ChallengePeak` 过滤
`data/ExcelOutput/` 文件名即可圈定各自表集；以下情况需额外注意：

- `ChallengeGroupConfig`、`ChallengeTargetConfig`、`ChallengeGeneralConfig`、`ChallengeBadgeConfig`
  等无模式前缀的表为四模式共用（或按 `ChallengeGroupType` 区分）。
- `ScheduleDataChallengeMaze/Story/Boss` 为期数时间表；**新期可能改指向 `ScheduleDataGlobal`**
  （如忘却之庭 1035 期的 `ScheduleDataID=291016` 在 `ScheduleDataGlobal.json` 中），取时间需要回退链。
- `ChallengeActivityConfig`、`StrongChallenge*`、`HeliobusChallenge*` 等为活动玩法，不属于本计划。

### 1.1 忘却之庭：区分「回忆」与「混沌回忆」

`ChallengeMazeConfig` 全部 615 层挂在 `ChallengeGroupConfig`（56 行，`ChallengeGroupType` 均为
`Memory`）之下，其中混有**固定内容**，必须按期过滤。规则：**只取 `ScheduleDataID` 非空的 Group**：

| GroupID | 名称（CHS） | 层数 | ScheduleDataID | 判定 |
|---------|------------|------|----------------|------|
| 100 | 永屹之城遗秘 | 15 | 无 | **回忆**（固定内容，排除） |
| 101–119 | 早期混沌回忆各期 | 各 10 | 201001– | 历史期，保留（旧版仅 10 层） |
| 900 | 天艟求仙迷航录 | 6 | 无 | 固定活动变体，排除 |
| 1001–1035 | 混沌回忆各期 | 各 12 | 201001+ / ScheduleDataGlobal | **分期更新的混沌回忆**，主体数据 |

其他注意：

- 1001–1034 各期 `GroupName` 即期主题名（如 1001「迷梦造舸」）；`ChallengeGroupConfig` 表有
  `GroupName` 字段，仅**最新期的行缺失该键**（如 1035 行），期名输出空串，保留期号用于识别。
  1035 期即「来生泅渡」：配置数据已随当前版本**提前入库**，但该期下个版本才启动
  （`ScheduleDataGlobal` 291016：begin 2026-09-28 06:00 / end 2026-11-02 04:00），期名/层名文本
  在 TextMap 尚无条目属预期；期上线、数据源同步后重跑即恢复（期名应为「来生泅渡」，可作复验锚点）。
- 按 `ScheduleDataID` 非空规则实际命中 **54 个 Group**（101–119 共 19 个 + 1001–1035 共 35 个），
  与 `ScheduleDataChallengeMaze` 的 54 行一一对应（早期各 10 层、近期各 12 层）。
- 层 ID 规律：混沌回忆层 ID = GroupID×10 + 层号（如 1035 期为 5401–5412）；末日幻影同理（3020 期
  为 30201–30204）。

---

## 2. 涉及的原始表清单

### 2.1 忘却之庭（ChallengeMaze / Memory）

| 表 | 内容 | 主键 |
|----|------|------|
| `ChallengeMazeConfig` | 每期每层的层配置 | ID（层） |
| `ChallengeGroupConfig` | 每期一条：期名 Hash、期图 `TabPicPath`、`MazeBuffID`（期级 MazeBuff，俗称天气）、`ScheduleDataID`、`TierceID` | GroupID |
| `ScheduleDataChallengeMaze` / `ScheduleDataGlobal` | 期开始/结束时间 | ID |
| `ChallengeMazeGroupExtra` | 期海报背景图 | GroupID |
| `ChallengeMazeRewardLine` | 满星奖励线 | — |
| `ChallengeMazeTierce` | 星启模式第三节点配置（混淆字段，见 §7）；GroupID 1033–1035 的 `TierceID` 指向之 | `PHFMCACHFIJ` |
| `ChallengeTargetConfig` | 星数目标（ROUNDS_LEFT 等类型） | ID |

### 2.2 虚构叙事（ChallengeStory）

| 表 | 内容 |
|----|------|
| `ChallengeStoryMazeConfig` | 每期每层（104 行 ≈ 26 期 × 4 层），含 `Floor`、上下半 `MazeGroupID1/2`、`EventIDList1/2` |
| `ChallengeStoryGroupConfig` | 每期一条：名称、`ScheduleDataID`、`MazeBuffID`（仅 Normal 期为真实天气，见 §7）、`ThemeID` |
| `ChallengeStoryGroupExtra` | 期主题图标/海报、**期级可选 buff `BuffList`**（游戏内三选一，单组；`SubMazeBuffList` 为内部通用战斗修正，不输出）、`StoryType`（Normal/Fever）；`ThemeID` → `ChallengeStoryTheme`（主题配色，5 个颜色字段） |
| `ChallengeStoryMazeExtra` | 层补充：`TurnLimit`（回合上限）、`ClearScore`、`BattleTargetID` |
| `ChallengeStoryTargetConfig` | 得分目标（TOTAL_SCORE） |
| `StageInfiniteGroup` / `StageInfiniteWaveConfig` / `StageInfiniteMonsterGroup` | `_StageInfiniteGroup` 关联实际波次、波次能力参数与敌人组；用于生命值倍率与实战敌人条目（§5.1） |
| `ChallengeStoryMazeTierce` | 第三节点（星启）配置（字段混淆）；GroupID 2024–2026 的 `TierceID` 指向之，含 ClearScore（`IDBJENCBJHM`）、BattleTarget（`LDKPJPCMMAE`） |
| `ScheduleDataChallengeStory` | 期时间 |

### 2.3 末日幻影（ChallengeBoss）

| 表 | 内容 |
|----|------|
| `ChallengeBossMazeConfig` | 每期每层（80 行 ≈ 20 期 × 4 层），结构同 Story |
| `ChallengeBossGroupConfig` | 每期一条，`ScheduleDataID` → `ScheduleDataChallengeBoss`；**`MazeBuffID` 不是天气**（见 §7） |
| `ChallengeBossGroupExtra` | 期图标 + **玩家可选 buff** `BuffList1/2/3`（三个节点各一组，→ `MazeBuff`）+ Boss 位置展示（`BossPositionEntrancePrefabPath3` 出现 `TierceMode` 命名） |
| `ChallengeBossMazeExtra` | **`MonsterID1/2/3`：三个节点的 Boss MonsterID**（第 4 层有第三节点，见 §3/§4）；同时是首领图鉴关联键（→ `MonsterGuideConfig`） |
| `ChallengeBossMazeTierce` | 第三节点（TierceMode）配置：`DLCKKJFMJOB`=触发层、`PHFMCACHFIJ`=TierceID、`JEBMBCLBIOI`=模板列表、`HFIAAGAKFMD`=Stage 列表、`LOJCIDLKPKG`=推荐弱点、`OGEOMCGNNMP`=星启得分目标 ID 列表 + `GNGENMHNLAH`=星启最高档目标 ID（→ `ChallengeBossTargetConfig`） |
| `ChallengeBossTargetConfig` | 得分目标（TOTAL_SCORE）：3001–3003 常规档（4000/5200/6600），5000–5003 星启档（10200/6000/7800/9900） |
| `ChallengeBossRewardLine` | 奖励线 |
| `MonsterGuideConfig` / `MonsterGuideTag` | **首领图鉴**：按展示 Boss 战斗 MonsterID（`Extra.MonsterID1/2/3`）关联 `TagList` → 特性条目（名称 + 简介富文本 + 插值参数）；TagList 首个为核心特性（坚防守备），其余为常规特性 |

### 2.4 异相仲裁（ChallengePeak）

结构与其他三者不同：**每期 4 层 = 3 个前置层 + 1 个 Boss 层**（`ChallengePeakGroupConfig.PreLevelIDList` +
`BossLevelID`），固定层名「骑士（一/二/三）」「将杀王棋」。

| 表 | 内容 |
|----|------|
| `ChallengePeakGroupConfig` | 每期一条（9 行）：`Title` Hash、`PreLevelIDList`、`BossLevelID`、`ThemeIconPicPath`、`RankIconPathList`（奖牌图标） |
| `ChallengePeakConfig` | 每层节点（36 行 = 9 期 × 4 层）：`Title`、`NormalTargetList`、`DamageType`、`EventIDList`（→ StageConfig；StageName Hash → MonsterName Hash 唯一反查预览首领）、`TagList`（敌方特性 → MazeBuff）、`ProgressValueList`、`HPProgressValueList` |
| `ChallengePeakBossConfig` | Boss 层（9 行）：`HardTitle`、`BuffList`（可选增益插件）、`HardEventIDList`、`HardTagList`、`ColorMedalTarget`/`HardTarget`（评奖阈值） |
| `ChallengePeakCommonConst` | 常量（前置任务等） |
| `ChallengePeakReward` / `ChallengePeakRewardOR` | 奖励 |
| `ChallengeBadgeConfig`（`Type=Peak`） | 徽章图标（`ChallengePeakGroupID` 关联期，Bronze/Silver/Gold/Ultra） |
| `BattleTargetConfig`（`Type=ChallengeTarget`） | 异相仲裁目标真实归属表（2026-09-21 第三步实测）：`NormalTargetList`/`HardTarget` 引用的 ID（3000–3005、3007）全部在本表（回合上限 `BattleTarget_TurnLimit_PeakBattle_*`、死亡数 `BattleTarget_DeathCount`），**不在** `ChallengeTargetConfig`（原稿误记；3001–3003 与 `ChallengeBossTargetConfig` 的 ID 撞号但语义无关） |

目标映射口径：`type ← AbilityName`、`param ← TargetParam`、`name ← TargetName`（富文本含
`#1[i]` 插值）；`3000`（`BattleTarget_DeathCount`）无参数，名称为「没有角色无法战斗」。
目标参数：前置层 4/2 轮 + 死亡数，Boss 层 6/4/2 轮，绝境（`HardTarget 3007`）2 轮。

期数时间：**确认无表可查**——无 `ScheduleDataChallengePeak`，`ActivityModule → ActivityConfig →
ActivityPanel` 链上均无时间字段，`ScheduleDataActivityPanel` 也不含相关 ID；`beginTime/endTime`
输出缺省，期序按 `ID` 升序。

---

## 3. 公共数据模型与输出布局

四种模式共享「期 → 层 → 节点 → 波次 → 敌人」五级结构。

### 3.1 模式标识

`<mode>` ∈ `maze | story | boss | peak`，与输出目录一一对应。

### 3.2 公共子类型（`challenge/index.ts`）

```ts
import type { IMetadataEntity } from "../../common/IEntity";

/** 期级/节点级 buff（MazeBuff：期级俗称天气、节点级俗称水温、另有可选 buff） */
export interface HsrChallengeBuff {
  id: number;
  name: string;
  desc: string;
  icon?: string;
  params: number[];
}

/** 首领图鉴特性（MonsterGuideTag），首个为核心特性、其余为常规特性 */
export interface HsrChallengeTrait {
  id: number;
  name: string;
  desc: string;
  params: number[];   // desc 中 #N[i] 占位符的插值参数
}

/** 波次中的单个敌人。名称/图标/弱点查敌人库，此处不带。 */
export interface HsrChallengeEnemy {
  monsterId: number;   // MonsterConfig.MonsterID（战斗 ID）
  templateId: number;  // MonsterTemplateConfig.MonsterTemplateID（用于关联敌人库）
  hp: number;          // §5 公式：虚构专用定点 floor，其它模式 Double ceil
  rawHp: number;       // 基准数值：不含战斗组与波次能力倍率（ceil）；hp/rawHp 即挑战生命值倍率差
  hpMultiplier?: number; // 波次额外生命值倍率，hp 已包含；缺省为 1
  hpCalculation?: "story"; // 虚构专用计算口径，用于标识重算算法
  eliteGroup?: number;   // 实际波次敌人组指定值，重算时优先于 Stage.eliteGroup
}

/** 一个关卡（StageConfig） */
export interface HsrChallengeStage {
  stageId: number;
  level: number;                    // StageConfig.Level（敌人等级）
  hardLevelGroup?: number;
  eliteGroup?: number;          // Stage 未带时回退 MonsterConfig.EliteGroup 后的生效值
  waves: HsrChallengeEnemy[][];     // 波次 × 每波有序敌人
}

export type HsrChallengeNodeIndex = 1 | 2 | 3; // 节点序号（1 起始）；1/2 为标准节点（俗称上半/下半），3 为星启节点

export interface HsrChallengeNode {
  index: HsrChallengeNodeIndex;
  name?: string;                 // 无独立文本时缺省，节点序号单独保留
  damageTypes: string[];            // 推荐弱点（DamageType1/2），与 HsrMonster 弱点字段同口径
  enemyBuffs: HsrChallengeBuff[];   // 节点敌方特性（水温等）
  bossMonsterIds: number[];         // 模板 ID 口径的展示 Boss（无则为空数组）
  bossTraits: HsrChallengeTrait[];  // 展示 Boss 的图鉴特性（无图鉴行为空数组）
  stages: HsrChallengeStage[];
}

export interface HsrChallengeFloor {
  id: number;                       // 层 ID（如 30204）
  index: number;                    // Floor 字段（1 起始）
  name: string;                     // 层名（如「第 4 层」「骑士（一）」）
  nodes: HsrChallengeNode[];
}

/** 四模式期实体公共基类（各模式文件 extends 之） */
export interface HsrChallengeSeasonBase extends IMetadataEntity<number> {
  code: string;                          // seasonId 字符串
  beginTime?: string;                     // "YYYY-MM-DD HH:mm:ss"，异相仲裁缺省
  endTime?: string;
  icon: string;                          // TabPicPath → getUrl（空路径输出空串）
  poster?: string;                        // ThemePicPath / 海报图 → getUrl
  mazeBuff?: HsrChallengeBuff;            // 期级 MazeBuff（Group.MazeBuffID，描述特性时俗称"天气"）；末日幻影不输出（§7）
  selectableBuffs: HsrChallengeBuff[][]; // 玩家可选 buff，外层按节点或分组（boss: BuffList1/2/3；story: 单组；peak: Boss 层 BuffList）
  floors: HsrChallengeFloor[];           // index.json 中被 _.omit
}

/** 得分/星数目标的公共形态 */
export interface HsrChallengeTarget {
  id: number;
  type: string;   // 游戏内枚举（ROUNDS_LEFT / DEAD_AVATAR / TOTAL_SCORE），统一 string
  name: string;             // ChallengeTargetName 文本
  param?: number;           // ChallengeTargetParam1（轮数/分数阈值等）
}

/** 出场索引条目（语言无关，§3.4 appearances.json） */
export interface HsrChallengeAppearance {
  mode: "maze" | "story" | "boss" | "peak";
  seasonId: number;
  floorIndex: number;
  nodeIndex: HsrChallengeNodeIndex;
  level: number;       // Stage Level
  hp: number;
  monsterId: number;   // 精确到变体
}
export type HsrChallengeAppearances = Record<string, HsrChallengeAppearance[]>; // key: templateId
```

设计要点：

- **Stage 级属性上提**：`level / hardLevelGroup / eliteGroup` 挂在 stage；虚构叙事敌人条目
  另携带波次 `hpMultiplier` 与实际敌人组的 `eliteGroup`（§5.1），保留各关卡与波次的独立计算参数。
- **波次为二维数组**：一般模式按 `StageConfig.MonsterList` 展开，波内 `Monster0..N` 按序站位；
  虚构叙事按实际无限波次表展开，合并同波同组内重复刷新的同一敌人。
- **`bossMonsterIds` 用模板 ID 口径**：`ChallengeBossMazeExtra.MonsterID1/2/3` 是战斗 MonsterID，
  经 `MonsterConfig.MonsterTemplateID` 换算后输出，可关联敌人库图标与名称；Peak 没有 Extra 表，改以
  `StageConfig.StageName.Hash` 对应 `MonsterConfig.MonsterName.Hash` 唯一反查模板 ID；战斗 ID
  已由波次数据携带，不丢失。
- 敌人名称/图标/弱点/抗性**不进挑战输出**，需要时按 templateId 关联 `${lang}/monster/index.json`。
- 第三节点（星启 / TierceMode）存在于三种模式：
  - 末日幻影第 4 层：`ChallengeBossMazeExtra.MonsterID3`（3020 期 → 501401404），对应 Stage
    420524（`_BindingMazeBuff: 3110018`），配置在 `ChallengeBossMazeTierce`（Group.TierceID）。
  - 忘却之庭：`ChallengeGroupConfig.TierceID` ↔ `ChallengeMazeTierce.PHFMCACHFIJ`（如 1035 期
    TierceID=5413，触发层 5412）。
  - 虚构叙事：2024–2026 期的 `TierceID` → `ChallengeStoryMazeTierce`（§2.2）。

### 3.3 各模式扩展类型

输出类型置于 `packages/gacha-game-types/src/games/hsr/challenge/`：`index.ts` 为公共子类型（§3.2），
`HsrChallengeMaze.ts` / `HsrChallengeStory.ts` / `HsrChallengeBoss.ts` / `HsrChallengePeak.ts`
为各模式文件。期实体均 `extends HsrChallengeSeasonBase`（继承 `IMetadataEntity<number>`，
有期名 + 期图）：

```ts
// HsrChallengeBoss.ts（末日幻影）
export interface HsrChallengeBossFloor extends HsrChallengeFloor {
  scoreTargets: HsrChallengeTarget[];   // 标准状态得分目标（ChallengeTargetID 3001–3003 → 4000/5200/6600）
  tierce?: {                            // 星启模式（游戏内可开关），仅星启期期末层存在：
    node: HsrChallengeNode;             //   星启第三节点（index=3），与标准节点分开保存
    scoreTargets: HsrChallengeTarget[]; //   星启得分目标（OGEOMCGNNMP + GNGENMHNLAH，按分值升序 6000/7800/9900/10200）
  };
}
export interface HsrChallengeBossSeason extends HsrChallengeSeasonBase {
  hasTierce: boolean;                   // Group.TierceID != null（当前 3018–3020）
  floors: HsrChallengeBossFloor[];
}

// HsrChallengeMaze.ts（混沌回忆；2026-09-19 第二步落地形态）
export interface HsrChallengeMazeFloor extends HsrChallengeFloor {
  starTargets: HsrChallengeTarget[];    // → ChallengeTargetConfig（ROUNDS_LEFT / DEAD_AVATAR，三星条件）
  tierce?: {                            // 星启模式（游戏内可开关），仅星启期（1033+）期末层存在：
    node: HsrChallengeNode;             //   星启第三节点（index=3），与标准节点分开保存
    starTargets: HsrChallengeTarget[];  //   星启星数条件（601/602/603 + 600 = 15/30 轮 + 死亡角色 + 33 轮）
  };
}
export interface HsrChallengeMazeSeason extends HsrChallengeSeasonBase {
  selectableBuffs: HsrChallengeBuff[][];   // 混沌回忆无期级可选 buff，固定 []
  floors: HsrChallengeMazeFloor[];
}

// HsrChallengeStory.ts（虚构叙事；2026-09-19 第二步落地形态）
export interface HsrChallengeStoryFloor extends HsrChallengeFloor {
  turnLimit?: number;                   // ChallengeStoryMazeExtra
  clearScore?: number;
  battleTargets: HsrChallengeTarget[];  // BattleTargetID[]
  scoreTargets: HsrChallengeTarget[];   // → ChallengeStoryTargetConfig
  tierce?: {                            // 星启模式，仅星启期（2024–2026）第 4 层存在
    node: HsrChallengeNode;             //   星启第三节点（index=3，含 Stage 波次）
    clearScore: number;                 //   星启通关分（IDBJENCBJHM，如 45000）
    battleTargets: HsrChallengeTarget[];  // 星启战斗目标（LDKPJPCMMAE）
    scoreTargets: HsrChallengeTarget[];   // 星启得分目标（4001–4003 + 4000 = 60000/75000/90000/99000）
  };
}
export interface HsrChallengeStorySeason extends HsrChallengeSeasonBase {
  themeId?: number;
  themeColors?: { main: string; sub1: string; sub2: string; eff: string };     // ChallengeStoryTheme
  floors: HsrChallengeStoryFloor[];
}

// HsrChallengePeak.ts（异相仲裁；2026-09-21 第三步落地形态）
export interface HsrChallengePeakFloor extends HsrChallengeFloor {
  progressValues: number[];             // 原样输出，语义未确认（§7）
  hpProgressValues: number[];
  targets: HsrChallengeTarget[];        // NormalTargetList → BattleTargetConfig（§2.4，原稿误记 ChallengeTargetConfig）
  isBoss?: boolean;                     // Boss 层（每期第 4 层）
  hard?: {                              // Boss 层绝境难度（ChallengePeakBossConfig）
    title: string;                      // HardTitle（将杀王棋•绝境）
    enemyBuffs: HsrChallengeBuff[];     // HardTagList
    stages: HsrChallengeStage[];        // HardEventIDList（独立关卡，敌人同款但等级更高：120 vs 100；落地新增，超出 §3.3 原稿）
    colorMedalTarget?: number;          // 彩色奖牌阈值（原样输出，实测恒 6）
    hardTarget?: HsrChallengeTarget;    // 绝境目标（3007，不超过 2 轮）
  };
}
export interface HsrChallengeBadge {
  level: string;                        // Bronze / Silver / Gold / Ultra
  name: string;
  icon?: string;                        // IconMiddlePath → getUrl
}
export interface HsrChallengePeakSeason extends HsrChallengeSeasonBase {
  badges: HsrChallengeBadge[];          // ChallengeBadgeConfig（Type=Peak；1–3 期无奖牌配置，输出空数组，4–9 期各 4 枚）
  floors: HsrChallengePeakFloor[];      // 3 前置层 + 1 Boss 层，每层单节点；可选增益插件复用 selectableBuffs（单组，Boss 层 BuffList）
}
```

### 3.4 落点与输出布局

- **输出类型**：`packages/gacha-game-types/src/games/hsr/challenge/`（submodule）。
- **Extractor 目录**：`extract/challenge/`，`index.ts` 为 Runner，四个 Extractor 共置同目录，
  公共解析（期/层/节点组装、波次展开、buff 解析、HP 计算）抽到 `ChallengeCommon.ts`（§6）。
- **输出文件**：

```text
output/<lang>/challenge/<mode>/index.json      # 期列表（_.omit(season, ["floors"])）
output/<lang>/challenge/<mode>/<seasonId>.json # 单期完整数据（含 floors，明细拆分模式，参考 extract/monster/index.ts）
output/challenge/appearances.json             # 语言无关出场索引，写 output 根（与 elements.json 同级）
```

- `appearances.json`：`HsrChallengeAppearances`（§3.2），仅收 Stage 实际出场敌人（带真实 HP，
  不收纯展示的 bossMonsterIds）；每模板按 mode 定序 + seasonId 降序排（最新在前），用于按敌人模板查询挑战出场记录。

---

## 4. 波次与敌人：关联链路（已验证）

```text
ChallengeXxxMazeConfig
  ├── EventIDList1: [30001011]      ──→ StageConfig.StageID（StageType="Challenge"）
  │     ├── Level: 90               ──→ 敌人等级（曲线自变量）
  │     ├── HardLevelGroup: 1       ──→ 等级曲线分组（HardLevelGroup.json）
  │     ├── EliteGroup: 92          ──→ 战斗内属性修正组（EliteGroup.json）
  │     └── MonsterList: [          ──→ 波次数组，每个元素为一波
  │           { Monster0: 8012010, Monster1: 8012020, ... },   ← 第 1 波
  │           { Monster0: 8012010, Monster1: 8013010, ... },   ← 第 2 波
  │         ]                          每个 MonsterN 是 MonsterConfig.MonsterID
  └── NpcMonsterIDList1: [2024016]  ──→ 节点主怪（模板 ID 口径），仅作展示摘要
```

- **波次**：`StageConfig.MonsterList` 数组元素即波次，对象键 `Monster0..MonsterN` 为该波有序敌人
  列表（可直接按顺序还原站位）；`StageConfigData` 中的 `_Wave` 键可交叉验证波数。
- **敌人 ID**：`MonsterN` 直接是 `MonsterConfig.MonsterID`，与现有敌人库
  `output/<lang>/monster/<id>.json`（`HsrMonster`）一一对应。
- **展示怪与实战怪可能不同**：末日幻影下半的 `ChallengeBossMazeExtra.MonsterID2`（203302204，
  Elite 分体模板）与 Stage 实际出场的 203501204（BigBoss 完整体）是不同 Monster，但模板
  `HPBase` 相同。血量按 **Stage 实际出场怪**计算；`Extra.MonsterID1/2/3` 作为节点 Boss 展示字段输出。
- **末日幻影第三节点**：`ChallengeBossMazeExtra.MonsterID3` → Stage（如 420524）。

## 5. 敌人血量（HP）计算方案（含虚构叙事波次修正）

现有敌人库不含具体血量；血量在挑战侧按配置计算。基础公式在末日幻影 3020 期「仙客天狼」
第 4 层三节点实测全部精确命中，混沌回忆 1035 期 12 层结构一致；虚构叙事还需叠加波次能力修正：

```text
HP = MonsterTemplateConfig.HPBase                        # 模板基础值（可为小数）
   × HardLevelGroup(Stage.HardLevelGroup, Stage.Level).HPRatio   # 等级曲线（HardLevelGroup.json）
   × EliteGroup(Stage.EliteGroup).HPRatio                # 战斗组 HP 倍率（EliteGroup.json）
   × MonsterConfig.HPModifyRatio                         # 敌人个体修正
   × (1 + 波次 HPAddedRatio)                             # 虚构叙事波次能力；无加成时为 1
```

实测样例（末日幻影「仙客天狼」第 4 层，Stage Level=90、HardLevelGroup=1、HPRatio=236.53471）：

| 节点 | Stage（EliteGroup） | MonsterID | HPBase | EliteGroup HPRatio | 计算值 | 游戏内 |
|------|--------------------|-----------|--------|--------------------|--------|--------|
| 上半 | 420504（92） | 202401604 | 26040 | 2.2 | 13,550,601 | 13550601 ✓ |
| 下半 | 420514（908） | 203501204 | 35805 | 2.3 | 19,478,989 | 19478989 ✓ |
| 第三节点 | 420524（163） | 501401404 | 20460 | 6.2 | 30,004,902 | 30004902 ✓ |

混沌回忆抽查：1035 期第 12 层 Stage 30124121（Level 95、g3 HPRatio=375.4385、EliteGroup 164→6.5），
波次 Boss（3024020，HPBase 4650）→ 11,347,629（ceil；原文档记录的 11,347,630 无法由
round/ceil 复现，系笔误，第二步实测时再复核），结构一致。

要点：

- **EliteGroup.json 是此前缺失的一环**（倍率 2.2/2.3/6.2/6.5 的来源），按 `StageConfig.EliteGroup`
  查表；该表还含 `AttackRatio/DefenceRatio/SpeedRatio/StanceRatio`（如 E908 韧性 ×1.25），可一并输出。
- 末日幻影下一期「支配遗忘」仍处测试服阶段：数据源只同步正式服，而正式服当前开启的仍是
  3020 期「仙客天狼」，故同步正式服数据后本地仍不含该期；待其正式上线、数据源同步后
  再用该期三节点数值复验公式（测试服数值可能与正式服有差异，以正式服为准）。
- `MonsterConfig.EliteGroup` 多为 1（倍率 1）；Stage 未带 `EliteGroup` 字段时回退取怪物自身值。
- 部分曲线组等级行稀疏（如 g4501 仅 20/50/75/100 级），取「不高于目标等级的最近一行」；除虚构专用口径（§5.4）外，最终 HP **向上取整**（`Math.ceil(product - 1e-6)`，
  容差吸收浮点噪声；末日幻影三组游戏内实测值均按 ceil 命中，曾记录的「四舍五入」有误）。
- 输出：每个敌人条目 `{ monsterId, templateId, hp, rawHp }`（rawHp 为不含战斗组与波次倍率的基准数值，
  用于对照挑战倍率差与基准数值），等级与倍率上提到 Stage 条目（§3.2）；同模板
  不同 Stage 等级/倍率自然展开为多条。名称、图标、弱点、抗性等仍以敌人库为准，挑战侧不重复输出。

### 5.1 虚构叙事波次生命值倍率

配置链路为 `StageConfig.StageConfigData` 中的 `_StageInfiniteGroup` →
`StageInfiniteGroup.WaveIDList` → `StageInfiniteWaveConfig`。其 `MonsterGroupIDList` →
`StageInfiniteMonsterGroup.MonsterList` 为实际敌人列表，`EliteGroup` 为该组的属性修正。
部分历史期的 `StageConfig.MonsterList` 预览省略中间波次或采用不同战斗变体，故虚构叙事直接按
无限波次表生成敌人条目；同波同组重复刷新的同一 MonsterID 合并展示，不展开每次刷怪次数。

当前使用的 `FantasticStory_Wave_Ability_0001` 在
`Config/ConfigAbility/BattleEvent/FantasticStory_Wave_Ability.json` 中向敌人叠加 `HPAddedRatio`，
`ParamList[1].Value` 为生命值加成，因此总倍率为 `1 + ParamList[1].Value`。
2026 期「立界开篇」第 4 层第一、第二节点三波分别为 ×5 / ×10 / ×44，星启第三节点为
×5.5 / ×13 / ×54。倍率按波次应用，不能上提为整个 Stage 的统一倍率。

敌人条目增加可选字段 `hpMultiplier`（波次额外倍率，无加成时省略），`hp` 已包含该倍率，
且在乘完所有修正后统一取整；`rawHp` 不含 EliteGroup 与波次能力修正。
敌人条目的可选 `eliteGroup` 保存实际波次敌人组的精英组；复算时应优先使用该值，并避免重复应用已包含在 `hp` 中的波次倍率。

### 5.4 虚构专用计算口径（已实施）

仅 `ChallengeStoryExtractor` 显式启用虚构口径，包含历史期和无无限波次配置的关卡：

1. 等级曲线 `HPRatio` 先通过 `Math.fround` 转为 `Single`；其它输入保留现有数值，不统一舍入小数位。
2. 输入按正数标准模式量化到 Q32，使用 `BigInt` 宽整数，按基础值、曲线、精英、怪物修正、
   波次倍率的顺序逐次相乘，每步右移32位截断。
3. 最终血量向下取整；混沌回忆、末日幻影、异相仲裁继续使用原 Double 乘法及 ceil。

计算实现在 `extract/challenge/StoryHp.ts`。虚构敌人输出 `hpCalculation: "story"`；`rawHp` 仍保留敌人库基准的 Double / ceil 口径。

2025期三个首领为57,778,097 / 52,000,287 / 72,222,634，
2026期为63,555,907 / 63,555,907 / 78,000,431，与用户提供值全部一致。
已重新生成13种语言；其它三模式共1170个输出文件与修改前逐字节一致。
当时的回归检查覆盖220个虚构关卡引用、13语言两期六个血量与其它三模式的10个既有锚点。

该实现限定于当前采用的正数标准模式，沿用审查中命中虚构样例的输入与取整选择；
不表示已确认游戏完整血量调用链，也不推广到其它玩法。

---

## 6. 工程结构与实现约定

1. **Schema**（`schema/`，逐表镜像字段，含混淆字段名）：
   四模式主表与 Extra/Group/Tierce/Schedule 表（§2 清单），加上 `MazeBuff`、`StageConfig`
   （仅镜像所需字段子集：StageID/StageType/Level/HardLevelGroup/EliteGroup/MonsterList/StageConfigData）、
   `StageInfiniteGroup`、`StageInfiniteWaveConfig`、`StageInfiniteMonsterGroup`、`HardLevelGroup`、`EliteGroup`。
   枚举：`ChallengeGroupType`、`ChallengeTargetType` 放 `schema/enum/`。
2. **输出类型**：`challenge/index.ts` + 各模式文件（§3.2/§3.3）。
3. **公共解析 `ChallengeCommon.ts`**：
   - **共享表缓存**：StageConfig（29303 行，最大表）、MonsterConfig、MonsterTemplateConfig、
     HardLevelGroup、EliteGroup、MazeBuff 为语言无关表，模块级缓存一次加载、跨语言与四模式复用；
   - StageConfig 波次展开（MonsterList → waves）；
   - MazeBuff 解析（名称/描述/图标/参数），覆盖天气、水温、可选 buff；
   - 期时间关联（ScheduleDataChallenge* → ScheduleDataGlobal 回退；两表的 BeginTime/GlobalBeginTime
     等时间字段互斥，取非空者）；
   - HP 计算（§5 公式，含曲线稀疏等级回退与 EliteGroup 回退）；
   - TextMap 打标：`type` 用原始表名，category/tags 标签名一致。期名：
     `{ challenge<mode>: "<seasonId>", type: "ChallengeXxxGroupConfig" }` + tags
     `["challenge", "challenge<mode>"]`；层名追加 `challengefloor: "<floorId>"`；buff 名称/描述
     `{ challengebuff: "<buffId>", type: "MazeBuff" }`；目标名称追加 `challengetarget: "<targetId>"`；
     首领图鉴特性名称/描述 `{ challengetrait: "<tagId>", type: "MonsterGuideTag" }`；
   - 回忆/固定组过滤（§1.1 规则）。
4. **四模式 Extractor + Runner**（`extract/challenge/`，`index.ts` 为 Runner，按已实现模式数组驱动），
   输出按 §3.4 布局，`JSONBig.stringify`，明细拆分写法对齐 `extract/monster/index.ts`。
5. **注册主入口** `extract/index.ts`（打印 "开始提取逐光捡金数据..."，置于敌人数据之后）。
6. **验证基线**：
   - 行数对账：忘却之庭 615 层 = Σ各期层数 + 回忆 15 层（Group 100）+ 900 组 6 层，期数 54
     （= `ScheduleDataChallengeMaze` 行数；101–119 早期各 10 层 + 1001–1035 各 12 层）；虚构叙事
     104 ÷ 4 = 26 期（= `ScheduleDataChallengeStory` 行数）；末日幻影 80 ÷ 4 = 20 期；异相仲裁
     36 ÷ 4 = 9 期。
  - HP 抽验：末日幻影「仙客天狼」13,550,601 / 19,478,989 / 30,004,902；混沌回忆 1035 期
    第 12 层 11,347,629；「支配遗忘」13,275,627 / 10,888,876 / 10,646,901 为测试服实测值，
    待该期正式上线并同步数据后复验（若正式服调整数值，以正式服为准）；异相仲裁 1 期标准
    Boss 4044010 = 5,409,150 / 绝境 21,636,600、9 期绝境 Boss 403501001 = 49,583,879
    （公式复算锚点，Peak 敌人 EliteGroup 均为 1，游戏内口径待第三步人工对核复核）。
   - 校验所有 MonsterID 在 `MonsterConfig`、所有 StageID 在 `StageConfig`、所有 MazeBuffID 与
     EliteGroup 在对应表中可解析，未命中项打日志。

---

## 7. 待确认问题

| 问题 | 现状 | 建议 |
|------|------|------|
| `*Tierce` 表混淆字段语义（Maze / StoryMaze / BossMaze 三张） | 已确认 `DLCKKJFMJOB`=触发层、`PHFMCACHFIJ`=TierceID（与 Group 表 `TierceID` 对应；Maze 系 1033–1035、Story 系 2024–2026 期同样存在）、`HFIAAGAKFMD`=Stage 列表、`JEBMBCLBIOI`=模板列表、`LOJCIDLKPKG`=推荐弱点；BossMaze 的 `OGEOMCGNNMP`=星启得分目标 ID 列表、`GNGENMHNLAH`=星启最高档目标 ID（3020 期游戏内实测 6000/7800/9900/10200 命中）；第二步实测 Maze 系 `OGEOMCGNNMP`+`GNGENMHNLAH` = 601/602/603 + 600（15/30 轮 + 死亡角色 + 33 轮）、Story 系 = 4001–4003 + 4000（60000/75000/90000/99000），Story 的 `IDBJENCBJHM`=星启通关分（45000）、`LDKPJPCMMAE`=星启战斗目标 ID 列表；其余（`EMNJGCPDIFF`、`PHOIICMCGIH`、`GNOOAGPBNLD`=45 疑似轮数上限、`MLMEGBLDFKE`、`IMCMJHAMMKK`）未知（DummyDll 未收录三张 Tierce 行类型，无法程序化还原） | 按"未确认"镜像，不阻塞 |
| **末日幻影 `Group.MazeBuffID` 非天气**（已确认） | 20 期全部指向 `MazeBuff 3031001`「词语爆裂」，而该 ID 实为虚构叙事第 1 期的环境 buff（`InBattleBindingKey=FantasticStory_BaseAbility_0010`），Boss 期仅借用为战斗基础能力，游戏内不作为天气展示；混沌回忆（记忆紊流各期独立）与虚构叙事 Normal 期（2001–2010）为真实天气；**虚构叙事 Fever 期（2011+，`StoryType=Fever`）的 `Group.MazeBuffID` 指向无文本占位 buff**（名称/描述在 TextMap 均无条目，游戏内不展示，天气已由主题/可选 buff 系统取代） | Boss 提取器不输出 `mazeBuff`；maze 提取器按 `Group.MazeBuffID` 输出；story 提取器按 `Group.MazeBuffID` 输出但名称与描述皆空时不输出（第二步实测） |
| `ChallengeMazeConfig.ConfigList1/2`（值如 200001）指向哪张表 | 未在任何 Challenge 表中命中 | 提取时原样保留 raw 值，不阻塞主流程 |
| `HPProgressValueList` / `ProgressValueList` 的游戏内含义（疑为异相仲裁血量进度与评奖阈值） | 无文本佐证 | 结合 `ChallengePeakReward` 阈值确认字段语义后决定是否输出 |
| 异相仲裁期数时间 | 无 `ScheduleDataChallengePeak`；已确认 `ActivityModule → ActivityConfig → ActivityPanel` 链上均无时间字段 | `beginTime/endTime` 输出缺省，期序按 ID；未来出现时间表再补链 |
| 最新期 Group 行无 `GroupName`（忘却之庭 1035 等） | 表有该字段、仅最新期行缺失 | 输出空串，保留期号用于识别 |
| 1035 期层名文本未随数据同步（2026-09-19 实测，已确认属预期） | 1035 期「来生泅渡」配置数据提前入库、下个版本才启动（begin 2026-09-28 06:00），期名键缺失且 `ChallengeMazeConfig.Name` 的 Hash 在 TextMap 无条目，13 语言均为空串 | 层名输出空串，与期名同口径；期上线后数据源同步、重跑自动恢复，期名应为「来生泅渡」（复验锚点） |
| 忘却之庭早期期（101–119）上游排期乱序（2026-09-19 实测） | 102/105/110/116 的 `BeginTime` 早于前一 GroupID 期（101 系复刻期），109 年份错为 2033；1001+ 全部单调 | 验证脚本仅对 1001+ 断言 `beginTime` 单调递增，早期期只断言非空 |
| 「支配遗忘」期数据缺失（原因已确认） | 该期仍处测试服；数据源仅同步正式服，正式服当前开启 3020 期「仙客天狼」，拉取后本地仍止于 3020 期 | 验收锚点以 3020 期为准；该期正式上线后同步数据，用 §6 测试服锚点复验 |
