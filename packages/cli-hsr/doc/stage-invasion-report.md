# 贪饕污染（StageInvasion）调查报告与数据提取设计

> 本文是 [abyss-challenge-extractor-plan.md](./abyss-challenge-extractor-plan.md) 的增补专题，
> §1–4 为机制调查结论（数据侧事实），§5 为四深渊侵染数据的提取设计与生效逻辑。提取实现以本文为准；
> HP 公式、公共模型、工程约定仍以主文档为唯一来源。
>
> 调查基线：`extern/TurnBasedGameData` @ OSPRODWin4.6.0（724b139d8c），
> 历史对比使用 4.4.0（b11066beac）/ 4.5.0（5d064ec9bd）提交。

---

## 1. 结论摘要

1. **机制内部代号 `StageInvasion`（关卡侵染）**，客户端战斗能力代号 `Gluttony`（贪饕）。
   全部配置为 4.5 版本新增的静态表，**不存在随机成分**：哪个关卡、哪只怪、第几次出怪被污染、
   污染等级几，均逐条写死在配置里。
2. 污染共 **3 个等级**（`InvasionID 1/2/3`）。等级 1/2 随 4.5 上线，**等级 3 为 4.6 新增**；
   4.6 同时把污染范围从"一部分敌人"扩展到全玩法（差分宇宙、混沌回忆等在 4.6 才进入配置）。
3. 等级越高敌人血量提升越高（+10%/+20%/+30%，§4.2 已收敛）；被污染敌人致死不死、
   回复生命，伤害会持续压制其生命上限（战斗内以"饕噬"debuff 展示已压制比例），
   压制掉生命上限的 KillThresh 比例（40%/40%/60%，§4.4 原生验证）才可击杀。
4. 各副本挂载方式不同：四深渊按 StageID 逐关卡配置；材料本/遗器本按 FarmType 整类挂等级 1
   并用怪物白名单圈定；差分宇宙·周期演算按周期 ChallengeID 整段挂等级 3；
   大世界按 NPC 实例配置。**货币战争（GridFight）在导出表中未找到挂载配置**（§3.5）。
5. 游戏内另有一套无关的同名系统：Fate 联动活动「命运/今晚留下来」的"圣杯战争·污染等级 1–7"
   （`FateAffix.json`），与贪饕污染无关，不要混用其文本与命名。

## 2. 数据源清单（ExcelOutput）

| 表 | 版本 | 内容 |
|----|----|------|
| `StageInvasionConfig` | 4.5 新增，4.6 追加 | 每条：`StageID` + `InvasionID` + `MonsterInvasionList[]`。子项 `DBLDCKODNEN`=怪物战斗 ID（MonsterConfig.MonsterID 口径）、`LMEBOHHDIAG`=出怪序号循环掩码数组（空数组=该怪全部实例，语义见 §4.4/§5.3） |
| `StageInvasionBuff` | 4.5 新增，4.6 补等级 3 | `InvasionID 1/2/3 → MazeBuffID 3034001/2/3` + `InvasionDesc`（等级机制描述文本，**在 TextMap 中存在**） |
| `StageMonsterInvasionParam` | 4.5 新增，4.6 补等级 3 | 每等级 5 个参数（服务器侧怪物属性口径，见 §4.2） |
| `StageInvasionMaterial` / `StageInvasionMaterialWhite` | 4.5 新增 | 材料本挂载：FarmType（`COCOON3/COCOON_AVATAR_EXP/COCOON_COIN/COCOON_EQUIPMENT_EXP/RELIC/ELEMENT`）→ 等级 1；白名单 108 只怪（覆盖 Cocoon/FarmElement 关卡出怪槽位约 96.6%） |
| `StageInvasionRogueConfig` / `StageInvasionRogueMonster` | 4.6 新增 | 差分宇宙挂载：`RogueTournWeeklyChallenge.ChallengeID 108–114`（周期演算 7 期）→ 等级 3；18 个固定 Boss 关（VerseSimulation 8300xxxx：凶梦传染、裂界造物、吞神子嗣等） |
| `StageInvasionNPCMonster` | 4.5 新增 | 大世界 3 只固定 NPC（PlaneID 20541 / FloorID 20541001），等级 2 |
| `ActivityVoracityInvasionBuf` / `ActivityVoracityInvasionPro` | 4.6 新增 | 活动侧：愿力进度 0/40%/70% 解锁玩家增益 `MazeBuff 3034011/2/3`（阿哈来点作用/小助力/帮大忙了：攻 150→300、防 120→240、生命 300→600、速 8→12、暴伤 15%→30%，仅受侵染关卡生效） |
| `MonsterBlackListConfig` | 4.5 新增 | 侵染系统的怪物排除表，当前为空表 |

配套客户端能力：`Config/ConfigAbility/BattleEventAbility_ChallengePeakBattle.json` 中
`ChallengePeakBattle_GluttonyAbility_LV1/2/3`（监听 `OnListenCharacterCreate`，把
**MazeBuff 303400x.ParamList[0..4]** 注入修饰器 `MCommon_Gluttony_LV1/2/3` 的
`MDF_Param1..5`）。**注意**：`MCommon_Gluttony_*` 修饰器本体（含血量倍率的实际应用）
仅存在于客户端二进制配置，导出 JSON 与编译代码中均无实体，参数到效果的精确映射
只能靠原生侧证 + 实测闭环，见 §4.2/§4.4。

## 3. 污染与各副本的挂载关系

### 3.1 四深渊（逐光捡金）——本次提取范围

`StageInvasionConfig` 全部 14 条均为 `Challenge` 类关卡，与四模式配置表逐一命中：

| StageID | 模式 / 期 | 位置 | 等级 | 被污染怪物（标记） |
|---------|-----------|------|------|--------------------|
| 30125112 | 混沌回忆 1035 期 | 第 11 层节点 2 | 2 | 4063010（全部） |
| 30125121 | 混沌回忆 1035 期 | 第 12 层节点 1 | 3 | 5014010、8003010（全部） |
| 30126112 | 混沌回忆 1036 期 | 第 11 层节点 2 | 2 | 802401106（全部） |
| 30126123 | 混沌回忆 1036 期 | 第 12 层星启节点 | 3 | 4064010（全部）、4062010 `[1,0]`、4063010（全部） |
| 30324032 | 虚构叙事 2026 期 | 第 3 层节点 2 | 2 | 2032020 `[1,0,0]`、2002030 `[1,0]`、8012020 `[1,0,0]` |
| 30324042 | 虚构叙事 2026 期 | 第 4 层节点 2 | 2 | 5012100 `[1,0,0]`、4062020 `[1,0]`、2012010 `[1,0,1,0,0]` |
| 30325032 | 虚构叙事 2027 期 | 第 3 层节点 2 | 2 | 300305007（全部）、1002030 `[1,0,1,0,0]`、2002030 `[1,0,1,0]` |
| 30325042 | 虚构叙事 2027 期 | 第 4 层节点 2 | 3 | 300302007（全部）、5012120 `[1,0,1,0,0]`、2032010 `[1,0,1,0]` |
| 420503 | 末日幻影 3020 期 | 第 3 层节点 1 | 2 | 202206017、202303203（全部，均为变身形态） |
| 420504 | 末日幻影 3020 期 | 第 4 层节点 1 | 2 | 202206018、202303204（全部，均为变身形态） |
| 420533 | 末日幻影 3021/3022 期 | 第 3 层节点 1 | 2 | 800302201、300301401（全部，均为变身形态） |
| 420534 | 末日幻影 3021/3022 期 | 第 4 层节点 1 | 3 | 同上 |
| 30509012 | 异相仲裁 第 9 期 | 第 2 层节点 1 | 2 | 5013010、5014010（全部） |
| 30510011 | 异相仲裁 第 10 期 | 第 1 层节点 1 | 3 | 5014020、5013040（全部） |

规律：**每期只选中末段 1~2 个节点**（混沌回忆为最深两层，其余模式为第 3/4 层的节点 1/2），
等级大体随层位递进；深渊 Boss 关通常整关污染（标记空数组），混编关则逐怪按出怪序号循环标记
（§4.4）。两个实现期事实（提取落地时确认）：

1. **末日四关的侵染对象是战斗中变身出的形态**（波次怪 202401603/4、200401403/4 之外的
   202206017/8、202303203/4、800302201、300301401）——静态波次内无此怪，逐实例标记天然
   为空，仅节点徽章生效（§5.1/§5.3）；30126123 的 4062010 同理（召唤形态）。
2. **末日 3022 期复用 3021 期的 StageID**（420533/420534）：侵染按 StageID 生效，
   两期同样带徽章，属数据忠实行为。

### 3.2 材料本 / 遗器本（不在本次提取范围，备查）

`StageInvasionMaterial` 把三类 FarmType 整体挂**等级 1**（花萼全系列、RELIC 遗器本、
ELEMENT 属性本），怪物白名单 108 条；即材料本体系内"全员、恒定等级 1"，同样非随机。

### 3.3 差分宇宙（4.6 起整体挂等级 3）

周期演算 ChallengeID 108–114（"周期演算：恶欲袭来 / 纷争游戏 / 碰碰运气 / 不可亵玩 /
亿里挑一 / 天生丽质 / 喜剧秀场"）全部等级 3，另有 18 个 VerseSimulation Boss 关逐关配置。

### 3.4 大世界 / 任务图

`StageInvasionNPCMonster` 按 NPC 实例（PlaneID/FloorID/GroupID/InstanceID）配置，
当前 3 只、等级 2。

### 3.5 货币战争（GridFight）——未找到配置

货币战争的内部表为 `GridFight*`（Role=棋子、Trait=羁绊、Division=职级），已确认其 4.5/4.6
变更与全部现表均无 `Gluttony/Invasion/3034001–3/3034011–3` 引用，`Config/Level/GridFight/`
下亦无相关文件。其污染大概率由服务器侧或模式运行时挂载，**静态导出数据无法解释**；
后续若提取该玩法需另行调查，本文不覆盖。

### 3.6 版本演变（git diff 事实）

| 版本 | 变化 |
|------|------|
| 4.5 | 整套 `StageInvasion*` 表新增；仅等级 1/2；深渊仅 5 条（末日幻影 3020、虚构叙事 2026、异相仲裁第 9 期），混沌回忆与差分宇宙未配置；教程页 10501："旧日星神「贪饕」渐趋苏醒……该世界**一部分敌人**受此侵染" |
| 4.6 | 原表**追加**：等级 3（`StageInvasionBuff`/`StageMonsterInvasionParam` 补行、`MazeBuff 3034003`）；混沌回忆 1035/1036、虚构叙事 2027、末日幻影 3021、异相仲裁第 10 期节点；整套差分宇宙 rogue 表；教程页 10502："「贪饕」的侵染**已遍布这个世界**"，机制描述加入"欢愉伤害拥有更强的压制效果"（游戏内玩法介绍页文案即教程 1050202） |

配置为**累加式**：4.6 的表完整保留 4.5 条目。提取输出因此天然带版本痕迹，
同一期的污染配置不会在后续版本被回收。

## 4. 等级、数值与文案

### 4.1 等级定义

`StageInvasionBuff`：`InvasionID 1/2/3 → MazeBuff 3034001/3034002/3034003`
（`InBattleBindingKey = ChallengePeakBattle_GluttonyAbility_LV1/2/3`）。
三条 `InvasionDesc` 在 TextMap 中存在（"被污染的怪物获得了「贪饕」的力量……"，
等级间仅有"致命伤害/致命攻击"措辞差异）。

**注意**：`MazeBuff 3034001–3` 自身的 `BuffName/BuffDesc` Hash 不存在于任何 TextMap
（占位哈希），**不得**走 `parseChallengeBuff` 取文本；展示文案一律取
`StageInvasionBuff.InvasionDesc`，输出等级数值；名称字段缺失时不猜造显示名。

### 4.2 数值参数与血量系数（下标语义已原生验证；倍率值待实测校准）

两套按等级的参数表并存，5 个槽位的语义已从 4.6 客户端 DummyDll 的
`RPG.GameCore.StageMonsterInvasionParamType` 枚举确证（§4.4），两表槽位一一对应：

| 下标 | 枚举名 | `StageMonsterInvasionParam`（服务器怪物属性口径） | `MazeBuff 303400x.ParamList`（客户端战斗能力口径） |
|------|--------|---------------------------------------------------|---------------------------------------------------|
| 0 | KillThresh | 0.4 / 0.4 / 0.6 | 0.4 / 0.4 / 0.65 |
| 1 | MaxHPRatio | 0.2 / 0.4 / 0.8 | 0.1 / 0.2 / 0.3 |
| 2 | NormalDamageConvertRatio | 1 / 1 / 1 | 1 / 1 / 0.5 |
| 3 | ElationDamageConvertRatio | 1 / 1 / 3 | 1 / 1 / 1 |
| 4 | MaxHPRatioForMultHP | 0.4 / 0.72 / 1.44 | 0.2 / 0.35 / 0.5 |

（每列为等级 1/2/3。客户端 MazeBuff 参数按 §2 的接线原样进入修饰器 `MDF_Param1..5`。）

机制参数在编译代码中的消费点已全部定位（§4.4）：

- **KillThresh**：注册侵染时 `KillMarkRatio = 1 − KillThresh`（0.6 / 0.6 / 0.4），
  即击杀标记亮线——压制掉生命上限的 40%/40%/60% 后才可击杀；
- **MaxHPRatio**：战斗统计快照记录 `GetProperty(MaxHP) × MaxHPRatio` 与 `GetDirtyHP()`
  （`FixPoint.op_Multiply`），供击杀标记/统计 UI 对照——此处消费的是**服务器表 slot1**
  （0.2/0.4/0.8），不是显示血量倍率；
- **Normal/ElationDamageConvertRatio**：伤害 → 生命上限压制的转化率，由
  `MCommon_Gluttony_DirtyHp` 修饰器（饕噬 debuff，读取 `MDF_AccumDirtyHPRatio`）结算；
  等级 3 的欢愉转化率 3 与 4.6 教程"欢愉伤害拥有更强的压制效果"吻合。

**血量提升倍率已按外部对照收敛（2026-10-06）**：系数取 **MazeBuff 303400x.ParamList[1]
（0.1 / 0.2 / 0.3 → ×1.1 / ×1.2 / ×1.3）**，即客户端修饰器 `MDF_Param2`
（MaxHPRatio 槽位的客户端副本；注意与服务器表 slot1 同名同位但数值不同）。依据：

1. 二进制证据链——战斗血量修饰只可能由 `MCommon_Gluttony_LV*` 应用，其输入是
   MazeBuff 参数（§4.4）；服务器口径表 slot1 仅进统计快照、slot4 客户端零读取，
   两者均可排除为显示倍率；
2. 外部站点交叉验证（来生泅渡其十二 = Stage 30125121，等级 3）：该站按等级展示
   贪饕生命值 0.1/0.2/0.3，且其逐怪血量与本站口径吻合——8003010：2,269,526 →
   2,950,384（逐值相等）；5014010：9,645,485 → 全精度连乘 12,539,129.67 取整
   12,539,130（整数基 ×1.3 的 12,539,130.5 为半整数边界，整基相乘口径会得 .131，
   属 ±1 口径差——本站与 `hp` 一致采用全精度一次取整）；未被侵染的 5013060 保持
   基础值 3,404,289。

若该站数值系游戏内实测则闭环完成；若亦为数据侧推导（同样取自 MazeBuff[1]），
则还差一次游戏内实测终验。属性管道形状为 `(Basic + BasicAdd) × (1 + Ratio) + Delta`
（`FixPoint`、内部不取整），工作公式：

**污染血量 = ceil(基础血量 × (1 + 系数))**（虚构无限波次关与波次 HPAddedRatio
同槽叠加，见 §5.3）。系数必须收敛为单一常量表（§5.2），校准只改一处。

战斗内辅助信息（描述／图标来源）：`StatusConfig 66002001
MCommon_Gluttony_DirtyHp`，名称「饕噬」，描述"可回复的生命上限降低 #1[f1]%"，
图标 `SpriteOutput/BuffIcon/Inlevel/IconMonster_W5_StageInvasion.png`。

### 4.3 激励侧（活动文案，仅备查）

按污染等级每只给 4/10/40 愿力（活动"镇伏「贪饕」，汇聚愿力"，ActivityPanel 10190，
解锁条件 FinishMainMission:4010121）；逐光捡金首杀给额外愿力。

### 4.4 原生二进制验证记录（4.6 GameAssembly）

以下为历史版本的侵染机制审查结论，仅用于说明当前字段映射的来源，不是随项目运行的验证步骤，也不代表后续版本仍采用相同地址或实现。

| 证据 | 位置（VA） | 结论 |
|------|-----------|------|
| `StageMonsterInvasionParamType` 枚举 | DummyDll 元数据 | ParamList 下标语义（§4.2 表）；同构枚举 `StageInvasionMonsterState = Normal/Activated/Disable` |
| 表访问器 `PFNOGACIKNN.LMBKNCAIDLC(MonsterID, InvasionID)` | `0x19D2B1E60` | 行按 (MonsterID, InvasionID) 二键取；导出数据 MonsterID 全为 0，即按 InvasionID 生效（保留按怪物覆盖的扩展位）；全二进制仅战斗模块一个调用者 |
| 战斗侵染模块 `LACLKDPNNLH`（`TurnBasedGameMode` 成员，ctor 内创建） | `.ctor 0x18B5D1870` | 用关卡 MazeBuff 列表匹配 `StageInvasionBuff.MazeBuffID` 得 InvasionID；读 `StageConfig.StageType` 分三路装载：8=逐光捡金读 `StageInvasionConfig`、33=差分读 rogue 表、其余走 FarmType/白名单 |
| 出怪掩码判定（出怪事件处理器） | `0x18B5D35B0` 起 | **`LMEBOHHDIAG` 是按"该配置条目内同 MonsterID 出怪序号（0 起）"的循环掩码**：`flags[序号 % len] != 0` 才注册侵染，空数组=全部实例；材料本路径为白名单 `HashSet` + 全局 `BitArray` 的同构掩码 |
| 注册缓存 `GCFLNFHCAFD` → `HDIEJLMEELG..ctor` | `0x18B5D3AC0` / `0x195C2A450` | 建立每实体 `{参数行, StageInvasionMonsterUIData}`，`KillMarkRatio = 1 − ParamList[KillThresh]`（定点转浮点），State=Normal |
| 参数读取口 `EOMGLEBFMAM(entity, paramType)` | `0x18B5D3190` | 返回 `row.ParamList[paramType]`（越界返回 0）；**全二进制无编译期调用者**——仅经数据驱动/热更新路径消费 |
| 统计快照 `HNCBDIEOHKG` | `0x18B5D3350` | 仅 `State==Normal` 时写 `StatisticsComponent.GetMonsterSttFull` 记录基类两槽：DirtyHP 与 `GetProperty(MaxHP) × ParamList[MaxHPRatio]`（`FixPoint.op_Multiply`）；由战斗任务 `GDFOLNCCELE.OnTaskBegin`（`0x195990E80`）触发 |
| 击杀标记 UI `StageInvasionForceKillMarkData.Refresh` | `0x18E117160` | `FillAmount = clamp(UIData.KillMarkRatio, 0..1)`，`State==Activated` 时点亮，`InvasionLevel≠0` 才有效 |
| 状态迁移 `CHAAJBIHMMH` | `0x18B5D2BF0` | 写 `UIData.State` 并广播事件；调用者为数据驱动任务 `PGHBIAMIHMH.OnTaskBegin`（`0x18C218750`）——压制/击杀的状态机由修饰器数据经任务桥驱动 |
| 修饰器接线（导出 JSON） | `BattleEventAbility_ChallengePeakBattle.json` | `GluttonyAbility_LVx` 经谓词 `DNILHDGHLGL`（目标为被侵染怪物）后，以 5 个 `SetDynamicValue` 任务把 MazeBuff 303400x.ParamList[0..4] 注入 `MCommon_Gluttony_LVx` 的 `MDF_Param1..5` |

各函数头部均有 IFix 热更新钩子（`IFix.WrappersManagerImpl.GetPatch(id)` 探测），
未加载补丁时执行上述编译原生逻辑；本表结论对应未打补丁路径，
不覆盖运行时热更新后的替代实现。
另：`StatusConfig 66002011-13 MCommon_Gluttony_BUFF_LV1/2/3`（读取 `MDF_Param1..5`）
即 §2 的玩家愿力增益侧（MazeBuff 3034011-3），`StrongChallenge_Scoring_Ability.json`
另引用 `MCommon_GluttonyTrigger_Mark` 用于强敌挑战评分。

## 5. 侵染数据提取设计

### 5.1 提取设计（cli-hsr）

**Schema（新增 2 个，镜像原始 JSON，含混淆字段）**：

```ts
// schema/StageInvasionConfig.ts
/** 对齐 ExcelOutput/StageInvasionConfig.json。 */
export interface StageInvasionConfig {
  StageID: number;
  InvasionID: number;
  MonsterInvasionList: StageInvasionMonster[];
}

export interface StageInvasionMonster {
  /** 怪物战斗 ID（MonsterConfig.MonsterID 口径，可精确到变体） */
  DBLDCKODNEN: number;
  /** 出怪序号循环掩码（0 起，第 n 只同名怪看 flags[n % len]；空数组 = 全部实例，语义见 §4.4/§5.3） */
  LMEBOHHDIAG: number[];
}

// schema/StageInvasionBuff.ts
/** 对齐 ExcelOutput/StageInvasionBuff.json。 */
export interface StageInvasionBuff {
  InvasionID: number;
  MazeBuffID: number;
  InvasionDesc: { Hash: bigint };
}
```

**提取模块（新增 `extract/challenge/ChallengeInvasion.ts`，并入共享表加载）**：

- `loadChallengeSharedTables()` 增载两张表，建 `stageInvasionMap: Map<StageID, row>`、
  `invasionBuffMap: Map<InvasionID, row>`。
- `INVASION_HP_BOOST: Record<1 | 2 | 3, number> = { 1: 0.1, 2: 0.2, 3: 0.3 }`
  ——唯一的血量系数常量（= MazeBuff 3034001-3 ParamList[1]，§4.2 已按外部对照收敛；
  标注数据来源与校准日期）。若游戏内实测推翻，只改此一处。
- `applyStageInvasion(stageId, stage)`：按 §5.3 标记算法给 `stage.waves` 内的敌人实例写入
  `invasionLevel` / `invasionHp`（引用未命中走 `noteChallengeMiss`）。
- `deriveNodeInvasion(lang, stages)`：节点级摘要，等级按「stageId 命中
  `stageInvasionMap`」推导（**不依赖实例标记**——末日四关的侵染对象是战斗中变身形态，
  静态波次内无对应实例，仅输出节点摘要；混编关的实例标记仍由 `applyStageInvasion`
  精确控制，两者数据同源不会冲突），取 `InvasionDesc` 文本与「饕噬」图标
  （共享表加载时查 `StatusConfig` ModifierName `MCommon_Gluttony_DirtyHp` 行，
  未命中省略 icon），并对 Desc Hash 打标：
  `category { challengeinvasion: 等级, type: "StageInvasionBuff" }`、
  `tags ["challenge", "challengeinvasion"]`。
- `attachNodeInvasion(lang, carrier)`：deriveNodeInvasion 的挂载便捷入口，
  接受任何 `{ stages, invasion? }` 载体（标准/星启节点与 peak 绝境层同构）。

**挂接点**：四模式节点构建全部经过 `buildStages → buildChallengeStage`（各 Extractor 的
`buildFloor`/节点构造），因此：

1. `ChallengeCommon.buildChallengeStage()` 末尾调用 `applyStageInvasion(stageId, stage)`
   ——一处改动，四模式（含混沌回忆/末日幻影的星启 tierce 节点）自动获得实例标记；
2. 各 Extractor 构造节点后调用 `attachNodeInvasion`（maze/story/boss 的标准与 tierce
   节点、peak 的普通节点与绝境层 hard 同口径）。

**实现状态（2026-10-06）**：以上 schema、类型、提取模块与四模式挂接均已落地
（`schema/StageInvasionConfig.ts`、`schema/StageInvasionBuff.ts`、
`extract/challenge/ChallengeInvasion.ts`、`gacha-game-types` challenge 类型增补），
侵染数据验收全部通过；虚构血量回归不受影响。

Runner（`extract/challenge/index.ts`）无需改动：污染数据内嵌在期 JSON 中输出；
出场索引 `appearances.json` 维持基础血量口径，不加污染字段。

### 5.2 输出数据结构（gacha-game-types）

**设计原则：基准值与侵染值平行输出。**

1. `hp` 保留无污染基准值。
2. 提取器将污染数值物化为平行字段 `invasionHp`，系数校准集中在 `INVASION_HP_BOOST`。
3. 新增字段均可选，兼容旧输出和未侵染期；`hasInvasion` 由数据推导。
4. 节点层保存等级与机制描述，实例层保存侵染标记和血量，二者分别表达配置命中与实际出怪命中。

```ts
// challenge/index.ts 增补

/** 贪饕污染（StageInvasion）节点级摘要 */
export interface HsrChallengeInvasion {
  /** 污染等级 1–3（StageInvasionBuff.InvasionID） */
  level: 1 | 2 | 3;
  /** 机制描述（StageInvasionBuff.InvasionDesc，随等级微调） */
  desc: string;
  /** 污染标识图（StatusConfig「饕噬」图标），缺失省略 */
  icon?: string;
}

export interface HsrChallengeEnemy {
  // ...现有字段不变（monsterId/templateId/hp/rawHp）
  /** 贪饕污染等级；仅被污染实例携带 */
  invasionLevel?: 1 | 2 | 3;
  /**
   * 污染生效时血量 = ceil(基准乘积 × (1 + 波次比率 + INVASION_HP_BOOST[level]))，
   * 向上取整口径与 hp 一致；侵染比率与虚构波次倍率同为 HPAddedRatio 单槽叠加（§5.3），
   * 不是在 hp（已含波次倍率）上再乘 (1 + 系数)。
   * 与 hp 平行输出，仅为实际命中侵染配置的实例生成。
   */
  invasionHp?: number;
}

export interface HsrChallengeNode {
  // ...现有字段不变
  /** 贪饕污染摘要；仅受侵染节点携带 */
  invasion?: HsrChallengeInvasion;
}

export interface HsrChallengeSeasonBase {
  // ...现有字段不变
  /** 期内任一层（标准/星启节点或绝境层）携带污染摘要；期索引保留该字段 */
  hasInvasion?: boolean;
}
```

### 5.3 生效逻辑

**实例标记算法**（`applyStageInvasion`，伪码；掩码语义按 §4.4 原生验证结果实现）：

```text
row = stageInvasionMap[stageId]; 若无 → 原样返回
spawnCount = Map<条目下标, int>            // 每个 MonsterInvasionList 条目独立计数
for wave w, for enemy e（按配置顺序遍历 = 出怪顺序）:
  hit = 条目 i = row.MonsterInvasionList.find(m => m.DBLDCKODNEN === e.monsterId); 若无 → 跳过
  n = spawnCount[i]++;  flags = hit.LMEBOHHDIAG
  if flags 为空 or flags[n % flags.length] !== 0:
    e.invasionLevel = row.InvasionID
    // 侵染比率与波次倍率同为 HPAddedRatio、单 Ratio 槽叠加（§4.2 属性管道 (1+Ratio)）：
    mult = e.hpMultiplier ?? 1              // = 1 + 波次比率（虚构无限波次）
    e.invasionHp = calcChallengeHp(基准参数…, 1 + (mult − 1) + INVASION_HP_BOOST[row.InvasionID])
```

`LMEBOHHDIAG` 是**整个关卡内按出怪序号的循环掩码**（第 n 只同名怪看 `flags[n % len]`，
跨波持续计数），不是按波次的掩码：`[1,0]` 表示第 1/3/5… 只被污染，`[1,0,0]` 表示
第 1/4/7… 只；空数组=全部实例。原实现草案的 `flags[w-1]`（按波下标）是错误口径，
原生判定见 §4.4。

**非波次形态（已实现口径）**：掩码匹配只作用于静态波次内的怪物；末日四关与
30126123 的 4062010 等**侵染对象是战斗中变身/召唤出的形态**，波次内不存在对应
monsterId → 逐实例标记自然为空、`invasionHp` 不物化；节点摘要仍按 stageId 命中配置推导（§5.1），波次敌人保留基础血量。

**虚构无限波次的两处适配**（2026/2027 期被侵染节点全部走 `getStoryChallengeWaves`）：

1. **倍率叠加而非连乘**：波次能力 `FantasticStory_Wave_Ability_0001` 的参数是
   HPAddedRatio，侵染比率若同为该槽则单 Ratio 聚合——`基准 × (1 + 波次比率 + 侵染比率)`
   （如 30324042：×44.72 而非 ×44×1.72）。属性管道的 `(1+Ratio)` 形状支持该假设，
   但修饰器数据不可读，**叠加口径为工作假设，随血量系数一并实测校准**（差异巨大，
   虚构一只怪即可判别）。实现上 `invasionHp` 必须以叠加倍率走 `calcChallengeHp`
   整体重算（一次 ceil），不得用 `e.hp ÷ mult` 回推基准（取整误差会传染）。
   混沌/末日/异相的侵染关 `hpMultiplier=1`，两种口径等价，不受影响。
2. **去重合并行**：无限波次怪物组内同名怪重复出怪（如 30324032 的 2032020 实际
   出怪 13 次，`[1,0,0]` 掩码下第 0/3/6/9/12 只被侵染），提取侧 `new Set` 去重后
   仅展示一行。合并行按「任一实际出怪实例被侵染」标记；当前全部掩码以 1 开头
   （首实例必被侵染），合并行恒为侵染态，与逐实例口径无观察差异——若未来出现
   首位为 0 的掩码，需回到本节重评合并行的标记规则。

### 5.4 验收清单

以下清单独立核对侵染数据，可在数据更新后按相同口径复核。

1. 覆盖：四模式侵染节点摘要与被标记实例数对账——maze 1035/1036（4 节点 6 实例）、
   story 2026/2027（4 节点 12 实例）、boss 3020/3021/3022（6 节点 0 实例，
   变身形态仅节点摘要；3022 复用 3021 的 StageID）、peak 9/10（2 节点 4 实例）；
   更早的期无任何 `invasion` 字段。
2. 混沌回忆 1036 期星启节点（30126123）：波次怪 4063010/4064010 全部标记、
   2013020 未标记；`[1,0]` 掩码的 4062010 为召唤形态不在波次内，不产生实例标记。
3. 金标锚点（30125121，等级 3，外部站点交叉校准）：8003010 `invasionHp=2950384`、
   5014010 `invasionHp=12539130`（全精度一次取整口径）、5013060 无 invasion 字段；
   节点摘要 level/desc/icon 齐备。
4. 掩码混编关（30324032）：被标记实例恰为 2032020/2002030/8012020（首实例被侵染的
   去重合并行），掩码外实例零标记。
5. 公式全量断言：所有 `invasionHp` 满足叠加口径 `hp ÷ mult × (1 + (mult−1) + 系数)`
   （±1 除法容差）且大于 `hp`；虚构无限波次敌人含 `hpMultiplier`，其余模式 mult=1。
6. 输出侵染 StageID 集合与 `StageInvasionConfig` ∩ 四模式输出关卡逐一对账。


## 6. 未定项与后续

| 项 | 现状 | 处理 |
|----|------|------|
| `LMEBOHHDIAG` 精确语义 | **已闭环（§4.4）**：按"该配置条目内同 MonsterID 出怪序号（0 起）"的循环掩码，空=全部；材料本路径为白名单 + 全局 BitArray 同构掩码 | 无需实测；按 §5.3 计数器算法实现 |
| 血量系数 | **已收敛（2026-10-06）**：MazeBuff 303400x.ParamList[1] = 0.1/0.2/0.3（×1.1/×1.2/×1.3）。外部站点来生泅渡其十二（Stage 30125121）逐怪数值与本站基础血量 ×1.3 交叉吻合，半整数样例证实 ceil 口径（§4.2）；服务器表 slot1/slot4 已由二进制消费点排除为显示倍率 | 若游戏内实测推翻，只改 `INVASION_HP_BOOST`（§5.1）。遗留：虚构侧与波次 HPAddedRatio 的叠加/连乘口径仍需一只虚构怪判别（§5.3 工作假设为叠加） |
| 多血条怪判别 | 显示口径与怪物血条数无关（客户端修饰器统一取 MazeBuff[1]）；服务器表 `MaxHPRatioForMultHP`（0.4/0.72/1.44）的用途在客户端无读取点，疑为服务器侧自有口径 | 不实现判别逻辑；若实测出现分歧再重开 |
| 等级显示名 | `MazeBuff 3034001–3` 的名称/描述 Hash 为占位，TextMap 无对应文本 | 保留数值等级；描述取 `StageInvasionBuff.InvasionDesc`，不补造名称 |
| 货币战争挂载 | 导出表无配置（§3.5） | 需运行时/服务器侧调查，超出本次范围 |
| `appearances.json` | 未加污染字段（保持基础血量口径） | 若需在出场索引提供污染血量，另行评审 |
