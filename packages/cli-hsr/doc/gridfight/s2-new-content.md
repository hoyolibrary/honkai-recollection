# 货币战争 S2 新增内容

本文说明 4.7 第二赛季新增的奇遇伙伴、主角光环及相关表的最终提取结构。公共数据域、赛季身份和既有表的更新适配见 [货币战争数据规范](gridfight-data-association-report.md)。这里只记录静态表关联，不推断抽签概率、节点时序或战斗执行逻辑。

实现：[伙伴提取器](../../extract/quest/gridfight/GridFightPetPalExtractor.ts)、[主角光环提取器](../../extract/quest/gridfight/GridFightSpotLightExtractor.ts)，均通过既有 [GridFight Runner](../../extract/quest/gridfight/index.ts) 输出；共享类型见 [gridfight.ts](../../../gacha-game-types/src/games/hsr/quest/gridfight.ts)。

## 1. 输出入口

以下文件位于各语言的 `gridfight/` 数据域，文件名表示发布数据契约。

| 文件 | 当前条数 | 内容与来源 |
|---|---:|---|
| `petpals.json` | 12 | 伙伴 → 图鉴组 → 效果 |
| `spotlights.json` | 82 | 主角光环、标签、备注、棋子与羁绊引用 |
| `spotlight-tags.json` | 51 | 完整光环标签字典，与内嵌标签同时保留 |
| `spotlight-recommendations.json` | 126 | 棋子前／后台的两组光环推荐，独立保留 |
| `spotlight-mazebuffs.json` | 31 | 独立光环增益配置，不猜测归属 |

`petpal`、`mazebuff`、`gridfight` 均按一个词命名。

## 2. 奇遇伙伴

奇遇伙伴来自 `GridFightPetPal*`，与主角光环表族独立。

| 原始表 | 行数 | 身份与关系 |
|---|---:|---|
| `GridFightPetPal` | 12 | `ID`；`EffIDList` 指向效果池 |
| `GridFightPetPalEff` | 70 | `ID`；效果描述、参数和附加字段 |
| `GridFightPetPalEffHandBook` | 50 | `GroupID`；`PetPalID` 指向伙伴，`PetPalEffList` 指向组内效果，`CategoryID` 共 20 种 |

当前每个效果恰好属于一个图鉴组和一个伙伴，没有跨组复用或未分组效果。完整效果直接嵌入 `handbookGroups[].effects`，组 ID 使用 `GroupID`，不使用分类 ID 代替。

```text
partner
  effectIds                      # 源 EffIDList，保留效果池顺序
  handbookGroups[]               # 按图鉴表顺序
    id / petpalId / categoryId    # 源 GroupID / PetPalID / CategoryID
    categoryDesc / desc
    effectIds                    # 源 PetPalEffList，保留组内顺序
    effects[]                    # 完整描述、参数和附加字段
```

伙伴保留 `icon/headImage/smallIcon/figureUp/figureDown` 和 `sort`。效果保留 `desc/addDesc?/switchDesc/simpleDesc?`、完整 `params`、`jsonPath`、`isOCEffective?`；可选字段不补造默认值。参数可能包含标识符，不能仅按描述占位符裁剪或统一解释为倍率。

小浣熊 `ID=1` 无描述、效果或图鉴组，仍保留身份和图片，不据此生成默认玩法。泡泡狼有 7 个效果、6 个图鉴组，说明效果池数量与图鉴组数量不能混用。现有跨伙伴、重复归组和未分组检查会报错，不属于静默清洗。

伙伴主表及效果、图鉴表均无赛季字段或完整赛季映射，不硬编码 `seasonId=2`。这些表描述候选效果结构，不能单独证明开局触发时点、抽签权重或排除条件。

## 3. 主角光环与独立增益

| 原始表 | 行数 | 身份与关系 |
|---|---:|---|
| `GridFightSpotLight` | 82 | `ID`；主描述、参数、标签、适用棋子、可选羁绊 |
| `GridFightSpotLightTag` | 51 | `ID`；名称和颜色 |
| `GridFightSpotLightRemark` | 6 | `SpotLightID`；额外说明及独立参数 |
| `GridFightRoleRecomSpotLight` | 126 | `(RoleID, FrontBackType)`；两组有序推荐 |
| `GridFightSpotLightMazebuff` | 31 | `(ID, Lv)`；独立增益配置，当前全部 `Lv=1` |

光环源 ID 与导航属性并存：

- `Tag` → `tagIds` 和内嵌 `tags`。完整 `spotlight-tags.json` 同时保留，包括 4 个当前未引用的标签。
- `SuitableAvatarList` 实际指向 **`GridFightRoleBasicInfo.ID`**，不是普通 `AvatarID`；输出 `suitableRoleIds` 及 `suitableRoles: { id, seasonId }[]`。当前 375 次引用均属于 S2；25 条空列表保持为空，不推导成“全部适用”或“不可用”。
- 可选 `TraitID` → `traitId` 和带赛季的 `traits`。仅 5 条光环引入 S2 `TraitType=Spotlight` 羁绊，详细层级仍由 `traits.json` 提供；这 5 条羁绊不能代替完整光环目录。
- 备注按 `SpotLightID` 内嵌为 `remark`；`remark.params` 与主描述 `params` 分开保存。

光环主表没有赛季字段，不人为添加 `seasonId`；关联棋子与羁绊使用各自真实赛季身份。`isOCEffective/isCarry/enemyDiffLvAdd/jsonPath` 等既有字段保持源值，空路径或缺省标量不作为删除记录的依据。

光环推荐是多对多且体积较大的关联，继续独立输出 `spotlight-recommendations.json`。每项以 `(seasonId, roleId, frontBackType)` 区分，赛季来自棋子；保留 `firstRecommendSpotLightIds`、`secondRecommendSpotLightIds` 的完整顺序。63 名棋子各有前后台两行，其中 11 名的两行推荐不同。两组推荐不能解释为两次 boss 选择，也不能替代适用棋子列表。

独立增益表没有 `SpotLightID`，光环主表也没有指向它的 `MazeBuffID`，因此 `spotlight-mazebuffs.json` 不内嵌到光环。保留等级、系列、稀有度、参数、Modifier、绑定类型／键等原字段，不凭相似编号建立关系。

**当前 31 条增益的名称和说明均缺源文本。** 62 个不同哈希在当前全部 29 个 TextMap 文件（含 13 个 Main 文件）中均无命中；这不是哈希精度或语言分片加载问题。输出 `name/desc` 为空字符串，并以十进制字符串保留 `nameHash/descHash`，不经过 JavaScript number，也不借用光环文案补值。该缺口不影响 82 条主角光环目录自身的名称和描述。
