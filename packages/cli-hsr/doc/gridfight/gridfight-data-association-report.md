# 货币战争（GridFight）数据关联与提取

> 内部代号 **GridFight**。基线：`ExcelOutput/GridFight*` + DummyDll `RPG.GameCore.GridFight*ConfigRow`。Excel 字段名已解混淆，与 C# 一致。
>
> 提取器：`packages/cli-hsr/extract/quest/gridfight/`  
> 输出类型：`packages/gacha-game-types/src/games/hsr/quest/gridfight.ts`  
> 产物：`output/<lang>/gridfight/`
>
> 客户端 `Config/Level/GridFight/**` 未随仓库导出，效果以 Excel 描述 + `ParamList` 为准。`*_Index_*` 索引表、空表可跳过。

---

## 1. 实体与主表

| 玩法概念 | 主表 | DummyDll | 输出 |
|----------|------|----------|------|
| 棋子 Role | `GridFightRoleBasicInfo` + `GridFightRoleStar` | `GridFightRoleConfigRow` / `GridFightRoleStarConfigRow` | `HsrGridFightRole` |
| 装备 | `GridFightItems` ⋈ `GridFightEquipment` | `GridFightEquipItemConfig` | `HsrGridFightEquip` |
| 羁绊 Trait | `GridFightTraitBasicInfo` + `GridFightTraitLayer` | `GridFightTraitBaseConfigRow` / `GridFightTraitLayerConfigRow` | `HsrGridFightTrait` |
| 职级 | `GridFightDivisionInfo` ⋈ `GridFightDivisionStage` | `GridFightDivisionStageConfig` | `HsrGridFightDivision` |
| 词条 | `GridFightAffixConfig` | `GridFightAffixConfigRow` | `HsrGridFightAffix` |
| 阵营 | `GridFightCamp` | `GridFightCampConfigRow` | `HsrGridFightCamp` |
| 投资环境 | `GridFightPortalBuff` | `GridFightPortalBuffConfigRow` | `HsrGridFightPortal` |
| 投资策略 | `GridFightAugment` | `GridFightAugmentConfigRow` | `HsrGridFightAugment` |

赛季入口 `GridFightSeasonModule`（`SeasonID` / `SubSeasonID` / `ActivityModuleID`）。角色、装备、羁绊、Portal、Augment 均挂 `SeasonID` 或赛季池表。

`{ Value: number }` 为 `FixPoint`。文本为 `{ Hash }`（`TextID`）。环境文案键（`GridFight_EnvironmentDesc_*`）走 `getHashedText`。

---

## 2. 总关联图

```text
SeasonModule.SeasonID
  ├─ RoleBasicInfo.SeasonID ── AvatarConfig.AvatarID（姓名/立绘/元素/命途）
  │     ├─ TraitList[] ──────── TraitBasicInfo.ID
  │     ├─ BackendRankList[] ── BackRoleRank.RankID
  │     ├─ FrontBackType ────── GridFightPreset = Both|Front|Back（JSON 省略 = Both）
  │     └─ RoleStar (ID, Star) ─┬─ FrontShowSkillIDList[] ── FrontSkill.SkillID
  │                             ├─ BackShowSkillIDList[] ─── BackBESkillConfig.SkillID
  │                             ├─ SkillOverrideSrc/Dest ─── AvatarSkill → 玩法技能
  │                             └─ BEID ──────────────────── BackBEConfig.BattleEventID
  │
  ├─ Items.ID = Equipment.ID
  │     ├─ EquipCategory ────── EquipCategoryInfo
  │     ├─ EquipmentTagList[] ─ EquipTag.TagID
  │     ├─ CraftConfig.CraftEquipID / CostEquipList[]
  │     ├─ EquipRecommendRole.EquipID → RecommendRoleIDList[]
  │     ├─ RoleRecommendEquip.RoleID + FrontBackType → 推荐列表
  │     ├─ Emblem.EquipFuncParamList[0] = TraitID
  │     └─ TraitSpecial.DressRuleParamList[0] = TraitID
  │
  ├─ TraitBasicInfo
  │     ├─ TraitEffectList[] ── TraitEffect.ID + TraitEffectLayerPa (ID, Layer)
  │     ├─ TraitLayer (TraitID, Layer) → MazebuffID / 属性
  │     └─ RoleBasicInfo.TraitList 反查成员
  │
  ├─ DivisionInfo.ID = DivisionStage.DivisionID
  │     ├─ DivisionLevel ────── DivisionLevelShow
  │     ├─ EnemyDifficultyLevel ─ EnemyDifficultyLv (Level, ChapterID)
  │     ├─ AffixChooseNumList[] ─ 每位面抽词条数
  │     └─ AffixConfig.RuleParamList[] = AffixMazebuff.ID
  │
  ├─ Camp.MonsterList[] ────── GridFightMonster.MonsterID ── EliteGroup
  │
  ├─ PortalBuff ──── SeasonPortal (PortalID, SeasonID)
  └─ Augment ────── SeasonAugment (AugmentID, SeasonID)
```

玩法属性走 `AvatarPropertyType` 的 `Extra*` 槽，展示名在 `GridFightRolePropertyConfig`：

| PropertyType | 含义 |
|--------------|------|
| `ExtraFrontPowerBase` / `ExtraFrontPowerAddedRatio1` | 前台强度 |
| `ExtraBackPowerBase` / `ExtraBackPowerAddedRatio1` | 后台强度 |
| `ExtraSpeedAddedRatio1` | 速度增幅 |
| `StanceBreakAddedRatio` | 击破效率 |
| `ExtraLuckChance` / `ExtraLuckDamage` | 幸运一击率 / 幸运伤害 |
| `ExtraHealBase` / `ExtraShieldBase` | 治疗 / 护盾基底 |
| `ExtraInitSP` / `ExtraHPAddedRatio*` | 初始能量 / 生命 |

---

## 3. 源表关系

### 3.1 角色与技能

`GridFightRoleBasicInfo` 主键 `ID`。姓名、头像、元素、命途、角色稀有度走 `AvatarConfig` / `ItemConfigAvatar`（含 `AvatarConfigLD`），按 `AvatarID` 关联。

`ID` 可以不等于 `AvatarID`：同一角色的费用/形态变体各占一行，提取为独立棋子，用 `avatarId` 回指本体。没有把变体合成一条。

银狼 LV.999 没有 `ID=1506` 行，三条共用 `AvatarID=1506`：

| 棋子 ID | 费用 | 星级 |
|---------|------|------|
| `15061` | 3 | 1–3 |
| `15062` | 4 | 1–3 |
| `15063` | 5 | 1–3 |

`GridFight_InitialExceptRoleIdList` 排除 `15062`、`15063`（以及景元变体 `12041`、`12042`）的开局投放；升费通过独立强化选项换成对应棋子 ID。同类还有布洛妮娅 `11011`/`11012`、景元 `1204`/`12041`/`12042`。

| 字段 | 含义 |
|------|------|
| `FrontBackType` | `Front` / `Back` / 缺省 `Both` |
| `Rarity` | **费用**（1–5），不是角色星级 |
| `HealOrShieldDisplay` | `GridFightRoleSkillTag`：`DPS` / `Healer` / `Shield` / `Assist` |
| `ChargeType[]` | `Speed` / `EnergyBar` / `MaxSP` / `MaxHP` |
| `TraitList[]` | 羁绊 ID |
| `BackendRankList[]` | 后台命座 `BackRoleRank.RankID`，形如 `{RoleID}{01..06}` |
| `SpecialAvatarID` | 战斗用特殊角色（`370{AvatarID}`） |
| `EquipmentID` | 常规光锥 `EquipmentConfig`，不是玩法装备 |
| `IsInPool` / `IsInBook` / `IsExpert` | 商店池 / 图鉴 / 专家 |

星级在 `GridFightRoleStar`，复合主键 `(ID, Star)`。游戏内「仅 1 费可升 4 星」与表不完全一致，提取器按表全量输出：

| 费用 | 棋子数 | 4 星行 |
|------|--------|--------|
| 1 | 21 | 20 条有；景元变体 `12041` 只有 1–3 星 |
| 2 | 15 | 全部有 4 星（含强度和技能 Dest） |
| 3–5 | 41 | 最高 3 星，表内没有 4 星行 |

| 字段 | 含义 |
|------|------|
| `FrontPowerBase` / `BackPowerBase` | 前/后台强度基底 |
| `LuckChance` / `LuckDamage` | 幸运一击 |
| `ExtraHealBase` / `ExtraShieldBase` | 治疗/护盾基底 |
| `GeneralPropertyModifyList[]` | 星级属性；`ExtraInitSP` 为初始能量 |
| `BackMaxSP` / `BackInitialSP` / `BackEnergyBar` | 后台能量 |
| `FrontOneWordDesc` / `BackOneWordDesc` | 前/后台一句话 |
| `SkillOverrideSrc[]` / `SkillOverrideDest[]` | 原 `AvatarSkillConfig.SkillID` → 玩法技能；`Src=0` 为新增 |
| `FrontShowSkillIDList[]` | 前台展示，指向 `GridFightFrontSkill.SkillID` |
| `BackShowSkillIDList[]` | 后台展示，指向 `GridFightBackBESkillConfig.SkillID` |
| `BEID` | 后台 BattleEvent |

Dest 末两位是星级：`15020301` = 原技能 `150203` 的 1 星行。`FrontShowSkillIDList` 与 Dest 对齐，提取时直接取展示列表（已是替换结果），再用 Src/Dest 标 `isModified` / `overrideSrc`（`Src ≠ 0`）。

**前台** `GridFightFrontSkill`：结构镜像 `AvatarSkillConfig`，主键 `SkillID + Level`（Level 1–15 为技能等级，不是棋子星级）。`SPNeed` 为终结技能量。

**后台** `GridFightBackBESkillConfig`：无 Level，一条技能一行。`GridFightBackSkillExtraDesc` 按 `SkillID` 补行动条件句。

**展示** `GridFightRoleSkillDisplay`：`(RoleID, FrontBackType)` → `CategoryTagList`（与 `HealOrShieldDisplay` 独立）。

**命座** `GridFightBackRoleRank`：`DescParamList` 填描述 `#n`；`Param` 为战斗参数。`OwnerGeneralPropertyList` / `AllMemberGeneralPropertyList` 为自身/全队属性。`ModifySkillList[]` 指向被改写的玩法技能。

未纳入初版：`GridFightSkillDescMod`、`GridFightRankSkillModify`（命座改描述/改参数）、忆灵 `GridFightServant*`、`GridFightFrontSpecialSP`。

### 3.2 装备

`GridFightItems`（名、图标、优先级）与 `GridFightEquipment`（规则、属性、标签）等 ID 外连接。仅有 Items、没有 Equipment 行的是特殊道具（武器箱/角色箱/`350101–350108` 等），`category` 输出空字符串 `""`。星徽用 `category === "Emblem"` 判断，不另设字段。

| Equipment 字段 | 含义 |
|----------------|------|
| `EquipCategory` | 见分类表 |
| `EquipDesc` | 特殊效果文案 |
| `GeneralPropertyList[]` | 面板属性 |
| `ParamList` / `EffectParamList` | 描述 `#n` |
| `EquipmentTagList[]` | → `EquipTag.TagID` |
| `DressRule` / `DressRuleParamList[]` | 穿戴规则；`TraitOnly` 时参数为 TraitID |
| `EquipFunc` / `EquipFuncParamList[]` | 星徽时参数为 TraitID |

`GridFightEquipCategory`：

| 枚举 | 含义 | EquipCount |
|------|------|------------|
| `Basic` | 简易 | 1 |
| `Craftable` | 进阶 | 2 |
| `Radiant` | 特权 | 2 |
| `Emblem` | **星徽** | 2 |
| `TraitSpecial` | 羁绊专武 | 2 |
| `Crown` / `Artifacts` / `Support` | 宝钻 / 神器 / 辅助 | 2 |
| `Hack` / `FateEquip` | 骇客 / 命运 | |
| `Material` / `Trash` / `GoldTrash` / `Other` | 材料 / 垃圾 | |

ID 段：`3502xx` 简易，`3503xxxx` 进阶，`3504xxxx` 特权，`3505xxxx` 星徽，`3510xxxx` 羁绊专武。

合成 `GridFightCraftConfig`：`CraftEquipID` = 产物，`CostEquipList` 长度 2。`GridFightForge` 是 4 件同级炉，不是 2 件配方。

星徽：`EquipCategory=Emblem`，`EquipFunc=OriginEmblem|ClassEmblem`，`EquipFuncParamList[0]=TraitID`，`DressRule=DressRuleUniqueAndExclusiveTrait`，把装备者加入指定羁绊。

羁绊专武：`EquipCategory=TraitSpecial`，`DressRule=DressRuleTraitOnly`，`DressRuleParamList[0]=TraitID`。

`GridFightElationEquip` 为阿哈侧文案；Hash 空时回退 `EquipDesc`。推荐双向：`EquipRecommendRole`、`RoleRecommendEquip`（分前/后台）。

### 3.3 羁绊

`GridFightTraitBasicInfo`：`TraitType` 为 `Origin`（JSON 常省略）/ `Class` / `Unique`。`TraitEffectList[]` → `TraitEffect`。成员由 `RoleBasicInfo.TraitList` 反查。

`GridFightTraitLayer` 复合主键 `(TraitID, Layer)`。`Layer` 是激活人数阈值。`Quality` 省略视为 `Copper`。`PropertyBindType`：`SpecificScope` 成员 / `AllCharacter` 全队。`MazebuffID` 不在主 `MazeBuff` 表，展示用层属性。

分级机制说明由 `MazebuffID` 关联 `GridFightTraitMazebuff.ID`，原样输出为 `layers[].mazeBuffDesc/mazeBuffSimpleDesc/mazeBuffParams`；层属性说明仍独立保存在 `desc/params`，不拼接原文或调整占位符索引。文本中的 `<property>` 标签保留原样，由消费端按属性语义渲染。

`GridFightTraitEffect` + `TraitEffectLayerPa (ID, Layer)`：层效果参数。`TempEquip` 的 `EffectParamList` 可为装备池占位 ID（如 `35100000`），真实物品在 `35100001` 一段。

其它：`TraitBonus`、`TraitMazebuff`/`Plus`、`SubTraitBasicInfo`、`TraitEquipRelation`（行很少，专武主要靠 DressRule）。

### 3.4 职级、难度、词条、贪饕

`GridFightDivisionLevelShow` 按 `DivisionLevel + SeasonID`：

| DivisionLevel | DivisionAbbr |
|---------------|--------------|
| （空） | 新手关 |
| 1–9 | A0–**A8** |

A8 对应 `DivisionLevel=9`。`DivisionInfo.ID` 编码 `1{Season}{Level:02}{Progress:02}`。

`DivisionStage` 与 Info 等键：`EnemyDifficultyLevel`、`AffixChooseNumList`（各位面抽条数）、`LevelBaseHPMultiRatio` / `Attack`、`BinaryNodeDiffAddRule`。`EnvironmentDescList` / `UniqueEnvironmentDescList` 是 TextMap 键名。

`GridFightEnemyDifficultyLv` 复合主键 `(EnemyDifficultyLevel, ChapterID)`，Chapter 1/2/3 为三位面倍率。`GridFightBinaryDiffAddRule`：`(ID, Quality)` → 节点品质加难度。

阵营 `GridFightCamp.MonsterList[]` → `GridFightMonster` → `GridFightEliteGroup`（怪物个体初版未展开）。

**贪饕不走 `StageInvasionConfig`。** 输出词条用 `isInvasion` 标记。挂载点：

1. 词条 `1006–1009`（侵蚀·\*）。`RuleParamList[0]` → `GridFightAffixMazebuff`。1007–1009 与非侵蚀 1003–1005 共用 Mazebuff 与参数；1006 文案对齐 1002，Buff ID 与 1001 相同（导出如此）。
2. `GridFightConstCommon`：`GridFight_TanTao_Level=3`；`GridFight_TanTao_AffixList` 的 Map 键在 JSON 中被压扁，按 1001–1005 → 1006–1009 理解；另有 `ProgressValueList` / `HPProgressValueList`。
3. 未导出的 Affix JSON 负责「有概率」与贪饕能力注入。

展示用 Affix 文案，不要用 `parseChallengeBuff` / `MazeBuff 3034001–3`。

### 3.5 投资环境与投资策略

| 概念 | 表 | 文本字段 |
|------|----|----------|
| 投资环境 | `GridFightPortalBuff` | `PortalBuffTitle` / `PortalBuffDesc` |
| 投资策略 | `GridFightAugment` | `HexName` / `HexDesc`（可含 `<gridfightinfo type=item\|role id=n>`） |

Portal 可改写本局 Augment 品质（`Quality=Prismatic`）。赛季池：`SeasonPortal`、`SeasonAugment`。

Portal：`ShowNpcIDList` → `GridFightNpcConfig`；`ShowBonusID*` / `DelayedShowBonus` 走 Bonus 池；命运礼物类关联 `GridFightPresentConfig`（`ShortenType=Perfect|Lose`）。

Augment：`Quality` 为 `Silver` / `Gold` / `Prismatic`；`ChapterLimitList` 限制位面；`AugmentGameRefTrait[]` 引用羁绊。节点掉落在 `BonusPoolV2` 等，不是开局三选。

---

## 4. 提取器

### 4.1 产物

```text
output/<lang>/gridfight/
  roles/index.json     # HsrGridFightRoleSimple（stars 不含 skills/backSkills，无 ranks）
  roles/<id>.json      # HsrGridFightRole 全量
  equips.json
  traits.json
  divisions.json
  affixes.json
  camps.json
  portals.json
  augments.json
```

Runner：`extract/quest/gridfight/index.ts`，主入口 `extractGridFightData`。

### 4.2 角色：对齐标准角色，完成技能替换

身份与技能行映射复用 `extract/avatar/avatarMap.ts`（`mapAvatarSimple` / `mapAvatarSkill`），与标准角色、忆灵同一套组装。棋子在此之上补费用、前后台、星级技能替换。

`HsrGridFightRoleSimple` **extends `HsrGameAvatarSimple`**，只增补玩法字段，溢出 `promotions` / `skins` / `skillTrees` / `versions`。

| 标准字段 | 来源 |
|----------|------|
| `id` / `code` / `name` / `icon` / `roundIcon` / `portrait` | `AvatarConfig` + `ItemConfigAvatar`，映射与标准角色相同 |
| `rarity` | `AvatarConfig.Rarity`（4/5 星） |
| `element` / `path` / `desc` | 标准角色 |
| `isCollaboration` | 是否在 `AvatarConfigLD` |

| 增补 | 来源 |
|------|------|
| `avatarId` | `RoleBasicInfo.AvatarID` |
| `cost` | `RoleBasicInfo.Rarity` |
| `frontBackType` | 缺省 `Both` |
| `traitIds` / `chargeTypes` / `skillTag` / `displayTags` | BasicInfo + SkillDisplay |
| `stars[]` | `RoleStar`；明细含已替换技能 |
| `ranks[]` | `BackRoleRank`（后台命座，结构对齐 `HsrAvatarRank`） |
| `recommendEquips[]` | 分 Front/Back 两套 |

`HsrGridFightSkill` **extends `HsrAvatarSkill`**：

- 前台：`FrontShowSkillIDList` → `FrontSkill`，按 `Level` 组成 `levels[]`（与标准技能相同）
- 后台：`BackShowSkillIDList` → `BackBESkill`，`maxLevel=1`，并挂 `conditionDesc`
- `isModified` / `overrideSrc`：对应 `SkillOverrideSrc ≠ 0`
- 增补 `triggerKey`

`HsrGridFightRoleStar` 挂强度、幸运、一句话、`properties`、`skills`、`backSkills`。`maxSp` 取前台终结技 `SPNeed`，否则后台 `BackMaxSP`。

### 4.3 其它输出类型

**`HsrGridFightEquip`**（`IMetadataEntity`）：`category` / `dressRule` / `equipFunc` + 参数、`properties`、`tags`、`craft.costIds`、`recommendRoleIds`。无分类时 `category=""`。星徽为 `category === "Emblem"`，加入的羁绊在 `equipFuncParams[0]`。

**`HsrGridFightTrait`**：`traitType`（省略补 `Origin`）、`layers[]`（`quality` 省略补 `Copper`）、`effects[]`（含分层 `params`）、`roleIds` 反查。

**`HsrGridFightDivision`**：Info ⋈ Stage ⋈ LevelShow；`abbr` 来自 LevelShow；`difficultyByChapter` 按 `EnemyDifficultyLevel` 展开三位面；`binaryDiffAdds` 按规则 ID 展开。词条、阵营分文件，不嵌进职级。

**`HsrGridFightAffix`**：`params` ← `EffectParamList`，`mazeBuffIds` ← `RuleParamList`，`isInvasion` 标记贪饕污染词条 1006–1009。

**`HsrGridFightPortal` / `HsrGridFightAugment`**：赛季 ID 列表、效果参数、羁绊引用；Portal 可嵌 `npcs`、`presents`。

属性统一为 `{ type, value? }`（`HsrGridFightProperty`），空 `Value` 的占位行丢弃。

### 4.4 Schema 与枚举

Schema 按表一字镜像，目录 `packages/cli-hsr/schema/GridFight*.ts`。枚举单文件：

`GridFightPreset`、`GridFightRoleSkillTag`、`GridFightChargeType`、`GridFightEquipCategory`、`GridFightEquipDressType`、`GridFightEquipFuncType`、`GridFightTraitType`、`GridFightTraitEffectType`、`GridFightTrailLayerQuality`、`GridFightAugmentQuality`、`GridFightTraitActivationType`、`GridFightPropertyBindType`、`GridFightSkillModifyOp`。

TextMap 标签：`gridfight_role` / `gridfight_equip` / `gridfight_trait` / `gridfight_division` / `gridfight_affix` / `gridfight_camp` / `gridfight_portal` / `gridfight_augment`；技能加 `skill`，装备加 `item`。

图标：角色头像/立绘与标准角色相同；`SkillIcons/Avatar/**` 技能/命座走 `srtools`；路径落在 `GridFight/**` 的技能图标必须走 `cdn2.dicloud.work` 的 png（`getSkillIconUrl`），不能走 srtools，否则会变成 neonteam webp 下载不到。其它玩法资源 `GridFight/**.png` → `cdn2.../gridfight/`。

---

## 5. 初版未纳入

地图与节点：`GridFightNodeTemplate`、`GridFightStageRoute`、`GridFightStage`。  
养成树：`GridFightSeasonTalent`、`GridFightTalent`。  
商店/掉落：`BonusPoolV2`、`ShopPrice`、`Orb`、`Consumables`。  
命座改写回填：`SkillDescMod`、`RankSkillModify`。  
忆灵：`GridFightServantStar` / `ServantSkill` / `BackServant`。  
怪物个体：`GridFightMonster` / `EliteGroup`。  
教程与联动：`GridFightTutorial*`、`FateEquip`、`GridFightProjection`。
