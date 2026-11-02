# AGENTS.md — cli-gi

原神（Genshin Impact）数据提取器。从原始 `ExcelBinOutput/*.json` + `TextMap` + `Readable` + `Subtitle` 生成多语言结构化输出。

## 项目结构

```
packages/cli-gi/
├── extract/
│   ├── index.ts       # 主入口：语言发现 → 文本源导出 →（后续）业务 Extractor
│   └── textmap.ts     # 三种文本源 → textmap_out/{kind}/{lang}.json
├── schema/            # 原始 ExcelBinOutput 类型（待补充）
├── data/              # 游戏源数据（gitignored）
│   ├── ExcelBinOutput/
│   ├── Readable/{lang}/*.txt
│   ├── Subtitle/{lang}/*.srt
│   └── TextMap/
│       ├── TextMap{lang}.json（RU/TH 可分片 _0/_1）
│       └── TextMap_Medium{lang}.json（需与主表合并加载；RU/TH 同样可分片）
├── output/            # 业务结构化输出（gitignored，待 Extractor）
├── textmap_out/       # 入库用文本（gitignored）
│   ├── textmap/{lang}.json
│   ├── readable/{lang}.json
│   └── subtitle/{lang}.json
├── text.ts            # TextMap 实例（GiTextHasher）
├── hash.ts            # uint32 / xxhash32 探针结论与实现
├── textmapFiles.ts    # TextMap 文件名 match 规则（主表 + Medium）
└── url.ts             # 资源 URL（映射明细待补充）
```

关联包：

- **共享逻辑**：`packages/hoyo-cli-common` — TextMap、download、`loadLocalizedTextFiles`、`finalizeDbTextRows`、dataset、url 框架
- **输出类型**：`packages/gacha-game-types/src/games/gi/GiTextMap.ts`（`GiTextMap` / `GiTextMapAll` / `GiSourceType`）
- **基础实体**：`packages/gacha-game-types/src/common/IEntity.ts`

---

## 与 cli-hsr 对应关系

| HSR (`cli-hsr`) | GI (`cli-gi`) |
|-----------------|---------------|
| `data/ExcelOutput` | `data/ExcelBinOutput`（**不重命名**） |
| `data/TextMap` | `data/TextMap` |
| （无） | `data/Readable`、`data/Subtitle` |
| xxhash**64** hasher | xxhash**32**（uint32，见下） |
| `textmap_out/{lang}.json` | `textmap_out/{kind}/{lang}.json`（三种源分开） |

---

## 探索结论（源数据）

### 1. TextMap 键与哈希

#### 两种查表路径（与 HSR 一致）

| 路径 | API | Excel 形态 | GI 出现频率 |
|------|-----|------------|-------------|
| **预计算键** | `TextMap.getText(lang, hash)` | `nameTextMapHash: number` 等 | **绝大多数**业务表 |
| **内部标识符再哈希** | `TextMap.getHashedText(lang, idStr)` / `setHashedTagInfo` | 字段是明文内部 id 字符串 | **很低**；常用表基本没有 |

**键类型泛型**（`hoyo-cli-common` 的 `TextMap<H>`）：

| 项目 | `H` | 装配 |
|------|-----|------|
| cli-hsr | `bigint` | `new TextMap<bigint>({ hasher: xxhash64, parseKey: BigInt })` |
| cli-gi | `number`（uint32，`GiHash`） | `new TextMap<number>({ hasher: xxhash32, parseKey: n => Number(n)>>>0 })` |

查表内部统一 `String(hash)`，GI **不必**再包 `BigInt()`。

HSR 对照（`AvatarRankConfig`）：

```text
Excel:  Name = "AvatarRankName_100101"   ← 本地化内部标识符（不是展示文案）
代码:   TextMap.getHashedText(lang, d.Name)
        → hash64("AvatarRankName_100101") → 查 TextMap
```

同类 HSR 调用点（写 Extractor 时可搜）：`AvatarRankConfig.Name/Desc`、`AvatarSkillTreeConfig.PointName/PointDesc`、`RelicDataInfo.RelicName/...`、`MissionChapterConfig.ChapterName/...`。

GI 侧：

```ts
// 常见：预计算 uint32，直接传 number
TextMap.getText(lang, row.nameTextMapHash);

// 罕见：内部标识符
TextMap.getHashedText(lang, row.someInternalId);
```

> 对 GitHub（genshin-optimizer 系 fork 等）按「可能含明文 loc key 的表」检索时，**常用表基本都是 `*TextMapHash` 数字字段**，与上述频率判断一致。遇到明文内部 id 再启用 `getHashedText`。

#### 键空间与算法探测

| 项 | 结论 |
|----|------|
| 键类型 | **uint32** 十进制字符串（CHS 约 57.8 万条） |
| 数值范围 | 全部 `≤ 0xFFFFFFFF`；约半数 `> 0x7FFFFFFF`（不能当有符号 int32） |
| 哈希对象 | **内部标识符字符串**，不是展示文案 value |
| 内容自哈希 | value 的 xxhash32 **≠** key（0 命中，符合预期） |
| ManualTextMap | `textMapId` → `textMapContentTextMapHash` 是**另一条展示文案**的预计算键，**不是** `hash(textMapId)`；不能当验证样本 |
| 算法状态 | 缺权威 `(内部id → TextMap键)` 样本，**未最终确认**；`hash.ts` 暂用 **xxhash32**（h32 seed=0）provisional |

**Extractor 约定：** 默认走 `getText` + `*TextMapHash`；仅当 schema 字段是字符串内部 id 时用 `getHashedText` / `setHashedTagInfo`。
### 2. Readable / Subtitle（结构一致）

两者都是 **按语言分子目录的纯文本文件树**，处理逻辑相同，仅扩展名不同：

```
data/Readable/{lang}/*.txt
data/Subtitle/{lang}/*.srt
```

| 规则 | Readable | Subtitle |
|------|----------|----------|
| 扩展名 | `.txt` | `.srt` |
| CHS 文件名 | **无**语言后缀：`Book1.txt` | **有**后缀：`Ambor_Readings_CHS.srt` |
| 其它语言 | 几乎都有 `_{lang}`：`Book1_EN.txt` | 都有：`Ambor_Readings_EN.srt` |
| 稳定 id | 去扩展名 + 去掉末尾 `_{lang}` → 如 `Book1`、`Ambor_Readings` | 同左 |
| 跨语言 | Readable base id 全语言对齐（1837）；Subtitle 基本对齐，CHS 可能多 1～2 个文件 | |

公共实现：`hoyo-cli-common` 的 `fileBaseId` / `loadLocalizedTextFiles`。

正文：文件 **全文** 写入 `text`（Subtitle 保留完整 SRT 时间轴）。

### 3. 语言发现（match 规则在游戏包，不在 common）

对齐 `url.ts` 的 `MatchItem` 模式：

- **common**：`discoverTextMapLangs(fileNames, matches)` + `TextMapFileMatch { pattern, fn }`
- **本包**：`textmapFiles.ts` 定义 `giTextMapFileMatches`（命名变更只改这里）

当前 GI 规则：

| pattern 目标 | part 示例 | 说明 |
|--------------|-----------|------|
| `TextMap{Lang}.json` / `_{n}` | `CHS` / `RU_0` | 主表；`(?!Main)` 排除 Main |
| `TextMap_Medium{Lang}*.json` | `_MediumCHS` / `_MediumRU_0` | **并入同一 lang** |

- matches **数组顺序** = 加载顺序（先主表后 Medium）
- HSR 规则见 `cli-hsr/textmapFiles.ts`（只主表，排除 Main）
- GI 额外语言：**IT**、**TR**

---

## 文本入库输出（第一步）

类型对齐 `GiTextMapAll`（单语文件内仍带 `lang` / `kind`，便于导入）：

```ts
{
  id: string;       // textmap: hash；readable/subtitle: 文件稳定 id
  text: string;
  kind: "textmap" | "readable" | "subtitle";
  lang: string;
  tags?: string[];
  category?: Record<string, string>;
  weight?: number;  // 预留，当前未填
}
```

输出路径（**三种来源分目录**）：

```
textmap_out/textmap/{lang}.json
textmap_out/readable/{lang}.json
textmap_out/subtitle/{lang}.json
```

- 首行保证有 `tags`/`category`（`finalizeDbTextRows`），方便 Navicat 等工具
- 业务 Extractor 打标后可再次导出；当前 textmap 源的 tags 初始为空（与 HSR 首轮一致，打标发生在各 Extractor）

---

## 共享层（hoyo-cli-common）本阶段新增

| API | 用途 |
|-----|------|
| `fileBaseId` / `loadLocalizedTextFiles` | Readable/Subtitle 类文件树 |
| `finalizeDbTextRows` | 入库 JSON 首行字段补全 |
| `TextMap` + `TextHasher` | 查表/打标/明文哈希（算法游戏侧注入） |
| `discoverTextMapLangs(files, matches)` | 通用扫描；matches 由 `textmapFiles.ts` 提供 |
| `pullGameData` | 下载（目录不改名） |

游戏特异仍留在 `cli-gi`：`hash.ts`、`url` 映射、`extract/*` 业务。

---

## 运行命令

下表命令在本包目录执行；从仓库根目录使用 `pnpm --filter cli-gi <命令>`。环境和输入输出入口见 [README.md](README.md)。

| 命令 | 说明 |
|------|------|
| `pnpm start` | 扫描语言 + 导出三种 textmap_out |
| `pnpm download` | 从 `DimbreathBot/AnimeGameData` 下载至 `data/`，覆盖对应目录；需要网络 |

## 数据准备

将 AnimeGameData 中目录复制到 `packages/cli-gi/data/`（保持原名）：

- `ExcelBinOutput`、`Readable`、`Subtitle`、`TextMap`
