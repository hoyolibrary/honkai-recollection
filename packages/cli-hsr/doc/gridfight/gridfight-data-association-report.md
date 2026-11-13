# 货币战争（GridFight）数据关联与提取

本文记录货币战争的公共数据结构、静态表关联，以及 4.7 新赛季对既有提取器的兼容适配。奇遇伙伴、主角光环等独立新增机制见 [S2 新增内容](s2-new-content.md)。效果以原表描述和参数为准，不推断战斗执行逻辑。

实现入口：[GridFight Runner](../../extract/quest/gridfight/index.ts)；输出类型：[gridfight.ts](../../../gacha-game-types/src/games/hsr/quest/gridfight.ts)。以下文件名表示发布数据契约，不依赖本地提取产物。

## 1. 输出入口

每种语言的 `gridfight/` 数据域包含以下公共输出文件。带明细的列表使用复数目录下的 `index.json`；玩法本身的 `index.json` 存放赛季信息。

| 文件 | 当前条数 | 内容与来源 |
|---|---:|---|
| `index.json` | 2 | 公共 `HsrSeason` 赛季清单 |
| `roles/index.json` | 140 | 棋子列表，省略星级技能、后台星魂及推荐装备明细 |
| `roles/<id>.json` | 140 | 完整棋子数据；同 ID 后续赛季通过 `detailPath` 指向 `roles/<seasonId>/<id>.json` |
| `equips.json` | 340 | 赛季物品、装备配置、标签、配方与推荐角色 |
| `traits.json` | 67 | 羁绊、层级、效果和成员 |
| `divisions.json` | 168 | 职级、阶段、位面难度和环境说明 |
| `affixes.json` | 53 | 词条及增益引用 |
| `camps.json` | 53 | 按赛季展开的阵营和怪物 ID |
| `portals.json` | 157 | 投资环境 |
| `augments.json` | 632 | 投资策略 |
| `properties.json` | 58 | 普通与特殊属性展示字典 |

全量入口还生成根级跨语言属性字典 `gridfight-properties.json`。S2 新增文件清单及关联结构见 [S2 新增内容](s2-new-content.md)。

## 2. 赛季与实体身份

赛季入口由 `GridFightSeasonModule.ActivityModuleID` 关联 `ActivityConfig.ActivityModuleIDList`，再通过 `ActivityPanelID` 取得面板名称。相同 `SeasonID` 的子赛季合并；历史模块下架时，保留的活动面板标签图标 `BtnGridFightS<n>.png` 可恢复赛季编号。仅出现在装备或配方池中的编号不会自行成为赛季入口。

赛季项使用 `{ id, season, name, icon, desc? }`。`season` 是实际赛季编号；`id` 是不透明的唯一记录键，当前 GridFight 以赛季编号生成，不能改用可能跨季复用的面板 ID。实体 `seasonId` 与入口的 `season` 对应。

有赛季归属的实体以 **`(seasonId, id)`** 标识。原生 ID、名称或数值相同都不能合并不同赛季的实体；无归属的记录保留一行并省略 `seasonId`。关联和反查在同季范围内进行。

| 数据 | 第 1 季 | 第 2 季 | 共用源 ID 数 |
|---|---:|---:|---:|
| 棋子 | 77 | 63 | 0 |
| 羁绊 | 33 | 34 | 0 |
| 装备及物品 | 166 | 174 | 71 |
| 配方 | 57 | 57 | 23 |
| 投资策略 | 334 | 298 | 221 |
| 投资环境 | 84 | 73 | 37 |
| 阵营 | 25 | 28 | 25 |

4.7 的棋子、羁绊已用独立原生 ID 区分赛季，例如瓦尔特为 `1004` 与 `100402`。装备、策略等仍共用源记录；上游更新共用配置后，所有收录该记录的赛季都会使用当前值，赛季筛选不等同于历史版本快照。

角色详情默认使用 `roles/<id>.json`。同 ID 多季时，最早赛季保留默认路径，后续记录输出独立文件并填写相对于玩法数据域的 `detailPath`。当前 140 个棋子 ID 全局唯一，无需额外分季详情文件。

## 3. 棋子、技能与后台星魂

`GridFightRoleBasicInfo.ID` 是棋子身份，`AvatarID` 回指常规角色。费用或形态变体各自保留，例如银狼 LV.999 的 `15061/15062/15063` 共用 `AvatarID=1506`。原表 `Rarity` 表示费用，输出为 `cost`；输出 `rarity` 仍是角色本体的星级。

身份映射复用 [avatarMap.ts](../../extract/avatar/avatarMap.ts)。常规、联动角色配置优先，活动角色表 `ActivityAvatarConfig` / `ActivityItemConfigAvatar` 补充缺失身份。S2 棋子 `604202` 通过 `AvatarID=6042`、`IsFakeAvatar=1` 获得「帕姆王」的名称、图片、元素和命途。

| 表或字段 | 关联与输出 |
|---|---|
| `RoleBasicInfo.FrontBackType` | 前台／后台；缺省按既有规则为 `Both` |
| `TraitList` / `BackendRankList` | 羁绊 ID／后台星魂 ID |
| `HealOrShieldDisplay` / `ChargeType` | 定位标签／充能类型；与展示分类标签独立 |
| `GridFightRoleStar (ID, Star)` | 棋子各星级，生成 `stars[]`；按源表保留全部星级 |
| `FrontShowSkillIDList` → `GridFightFrontSkill.SkillID` | `stars[].skills`；每个技能按 `Level` 聚合 `levels[]` |
| `BackShowSkillIDList` → `GridFightBackBESkillConfig.SkillID` | `stars[].backSkills`；单级技能 |
| `SkillOverrideSrc/SkillOverrideDest` | 原技能到玩法技能的对应；非零 Src 生成 `isModified/overrideSrc` |
| `GridFightBackSkillExtraDesc.SkillID` | 补后台技能 `conditionDesc` |
| `GridFightRoleSkillDisplay (RoleID, FrontBackType)` | 前后台 `displayTags` |
| `GridFightBackRoleRank.RankID` | `ranks[]`；描述参数、战斗参数、自身／全队属性、修改技能列表分别保留 |
| `GridFightRoleRecommendEquip (RoleID, FrontBackType)` | `recommendEquips[]`，前后台分别保存 |

前台技能的 `Level` 是技能等级，不是棋子星级。展示列表已经给出替换后的技能，不再按编号重建列表。`HsrGridFightSkill` 复用标准角色技能类型，补充替换标记及 `triggerKey`；`RelatedExRankIDList` 沿共享映射输出 `relatedExRankIds`。

星级还保留前后台强度、幸运一击、治疗／护盾基底、属性及一句话说明；`maxSp` 优先取前台终结技 `SPNeed`，否则使用后台 `BackMaxSP`。`SpecialAvatarID` 是战斗身份，`EquipmentID` 指向常规光锥，不能当成玩法装备。

## 4. 装备、配方与推荐

`GridFightSeasonItem` 提供 `(SeasonID, ItemID, ConfigID)`。输出 `id=ItemID`，通过 `ConfigID` 读取 `GridFightItems` 和 `GridFightEquipment`，并保留 `configId`；不把配置 ID 当成实体 ID。无赛季记录的配置沿用同 ID 定位。当前 340 条赛季记录恰好满足 `ConfigID=ItemID`，两者不同的分季配置由测试夹具覆盖。

`GridFightItems` 提供名称、图标和优先级，`GridFightEquipment` 提供描述、属性、分类、穿戴规则和功能参数。只有物品配置的箱子等记录仍输出，`category=""`。主要关联如下：

| 关系 | 最终处理 |
|---|---|
| `EquipCategory` → `GridFightEquipCategoryInfo` | 内联 `categoryName`、`slotCount` |
| `EquipmentTagList` → `GridFightEquipTag.TagID` | 同时保留源 `tagIds` 和内嵌 `tags` |
| `GridFightElationEquip.ID` | 独立 `elationDesc`；常规描述缺失时用于回退 |
| `GridFightCraftConfig.CraftEquipID` | 以产物 ID 找配方；`CostEquipList` 保留材料 ID |
| `GridFightSeasonCraft.CraftID` | 按季筛选 `crafts[]`；兼容字段 `craft` 为该季最后一条配方 |
| `GridFightEquipRecommendRole (Season, EquipID)` | 同季 `recommendRoleIds`，不借用其他赛季推荐 |

`tagIds` 保留原顺序、重复和未知 ID；导航 `tags` 沿用现有未命中对象过滤，两者不互相重建。真实装备的空标签列表输出 `[]`，没有装备配置时省略 `tagIds`。

星徽使用 `category=Emblem`，`equipFuncParams[0]` 指向加入的羁绊；羁绊专武使用 `category=TraitSpecial`，`dressRuleParams[0]` 指向穿戴所需羁绊。规则与参数保留原值，不从其中反向生成其他限制列表。双向装备推荐是两张独立表，角色推荐装备与装备推荐角色不能互相求逆。

## 5. 羁绊、职级、阵营和投资

| 数据域 | 关联与最终处理 |
|---|---|
| 羁绊 | `GridFightTraitBasicInfo` 按 `SeasonID` 输出，成员由同季棋子 `TraitList` 反查为 `roleIds`。类型含 `Origin/Class/Unique/Spotlight` |
| 羁绊层级 | `GridFightTraitLayer (TraitID, Layer)`；`Layer` 为人数阈值。`quality` 缺省按既有规则为 `Copper`，属性保留作用范围 |
| 羁绊机制说明 | `MazebuffID` → `GridFightTraitMazebuff.ID`；输出 `layers[].mazeBuffDesc/mazeBuffSimpleDesc/mazeBuffParams`，与层属性 `desc/params` 分离 |
| 羁绊效果 | `TraitEffectList` → `GridFightTraitEffect` → `GridFightTraitEffectLayerPa (ID, Layer)`；效果及分层参数内嵌 |
| 职级 | `GridFightDivisionInfo.ID` → `GridFightDivisionStage.DivisionID`，不再依赖阶段表的赛季字段；`SeasonID + DivisionLevel` 关联展示名与简称 |
| 难度 | `GridFightEnemyDifficultyLv (EnemyDifficultyLevel, ChapterID)` → `difficultyByChapter`；保留 `allDamageReduce`。节点加难度由 `GridFightBinaryDiffAddRule` 展开 |
| 职级阶段参数 | `LevelBaseCounterMultiRatio` → `counterMulti`；非空 `EffectParamList` → `params` |
| 词条 | `GridFightAffixConfig` 的 `EffectParamList` → `params`、`RuleParamList` → `mazeBuffIds`；污染词条 `1006–1009` 输出 `isInvasion` |
| 阵营 | `GridFightCamp.ID` → `GridFightCampSeason.CampID`；各季 `monsterIds` 来自该季 `MonsterList`，不使用全局怪物清单覆盖 |
| 投资环境 | `GridFightPortalBuff` 经 `GridFightSeasonPortal` 分季；保留描述、参数，可内嵌 NPC 和礼物展示数据 |
| 投资策略 | `GridFightAugment` 经 `GridFightSeasonAugment` 分季；保留品质、位面限制、羁绊引用及效果参数 |

职级 `DivisionLevel=1–9` 对应 `A0–A8`。贪饕展示取 GridFight 词条及增益描述，不使用常规 `StageInvasionConfig` 或挑战增益解析器代替。环境说明按原 TextMap 键查询；描述中的 `<property>`、`<gridfightinfo>` 保持原样交给消费端渲染。

属性由 `GridFightRolePropertyConfig.PropertyType` 和 `GridFightSpecialProperty.VariableName` 合并为 `id`，共 57 个普通属性与 1 个特殊属性。字典保留 `name/icon/miniIcon/panelName/visible/order/isPercent`；跨语言版本按 `id` 聚合 `nameCHS/nameEN`、`panelNameCHS` 等字段。原表无百分比标志，`isPercent` 在提取器中按属性键语义集中判定；重复属性键报错。属性数值输出 `{ type, value? }`，空 `Value` 行沿用现有过滤。
