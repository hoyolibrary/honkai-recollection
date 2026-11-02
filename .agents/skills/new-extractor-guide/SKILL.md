---
name: new-extractor-guide
description: HSR Extractor 新增流程说明，覆盖 schema、输出类型、Extractor、Runner 与主入口注册规则。
---

# 新增 HSR Extractor 完整流程

## 前置知识

- **输出类型定义**：`packages/gacha-game-types/src/games/hsr/` — 每个数据域一个文件
- **基础实体类型**：`packages/gacha-game-types/src/common/IEntity.ts`
  - `IEntity<T>` — `{ id: T }`
  - `IMetadataEntity<T>` — `extends IEntity<T>`，提供 `{ id, code?, name, icon? }`
- **Schema 与类型映射文档**：`packages/cli-hsr/doc/schema-and-types.md`

---

## Extractor 目录约定

新增 Extractor 前，先根据数据域确定目录位置：

- 同时存在 Runner 与 Extractor 时，以数据域建立目录，Runner 固定命名为 `index.ts`。
- 一个 Runner 引用的多个 Extractor 必须放在同一个数据域目录；关系紧密的数据可共享重点域目录，例如角色与忆灵共置于 `extract/avatar/`。
- 玩法相关提取逻辑统一放在 `extract/quest/<玩法>/` 下。
- 任务、对话及剧情文本相关逻辑统一归入 `extract/mission/`，复杂子域可继续建立多级目录。
- `extract/manual/` 专用于手工修正数据，不随业务 Extractor 迁移。
- 不涉及 Extractor 类的极简单表 Runner 可继续使用 `extract/xxx.ts` 单文件形式。

典型目录结构：

```text
extract/
├── index.ts
├── avatar/
│   ├── index.ts
│   ├── AvatarExtractor.ts
│   └── ServantExtractor.ts
├── mission/
│   ├── index.ts
│   └── tarotwiki/
│       ├── index.ts
│       └── TarotWikiExtractor.ts
├── quest/
│   └── dicecombat/
│       ├── index.ts
│       └── DiceCombatExtractor.ts
├── manual/
└── item.ts
```

---

## 第 1 步：创建 Schema 类型文件

**文件**：`schema/XxxConfig.ts`

从 `data/ExcelOutput/XxxConfig.json` 复制一条数据，一字不动地定义为 TypeScript interface。字段名、嵌套结构、可选性完全镜像原始 JSON，包括混淆字段名（如 `GOJHJGEFGGN`）。

**要点**：
- 使用 `interface`
- 保留原始大小写和 `{ Value: number }` 包裹结构
- 各条目字段数量存在差异时取并集，差异字段加 `?`
- 接口头 JSDoc 标注游戏内实际 C# 类型名（如 `/** 对齐 DummyDll 中的 RPG.GameCore.AvatarRow。 */`）

**固定包装类型约定**（简单包装结构不加字段注释）：

| JSON 形态 | 含义 |
|-----------|------|
| `{ Hash: bigint }` | 文本哈希（C# `RPG.Client.TextID`，XXHash64） |
| `{ Hash: number }` | 32 位字符串哈希（C# `RPG.GameCore.StringHash`） |
| `{ Value: number }` | 定点数（C# `RPG.GameCore.FixPoint`，序列化为 double） |

**枚举字段约定**：

- 枚举取值以 TS 字符串联合类型维护在 `schema/enum/<C#枚举名>.ts`，一个枚举一个文件，类型头 JSDoc 标注完整 C# 枚举名（如 `RPG.GameCore.AttackDamageType`）。
- schema 中枚举字段直接引用联合类型（如 `DamageType: AttackDamageType`），数组同理（`AttackDamageType[]`）。
- 文件内接口名与枚举名冲突时，导入用 `<Enum名>Enum` 别名（见 `schema/AvatarBaseType.ts`）。

**参考**：`WorldDataConfig.ts`（简单单表）、`RoguePersonaStyle.ts`（含混淆字段名）、`MonsterConfig.ts`（嵌套类型与枚举引用）

---

## 第 2 步：创建输出类型文件

**文件**：`packages/gacha-game-types/src/games/hsr/HsrXxx.ts`

定义前端使用的类型，camelCase 命名，`{Value}` 扁平化为 `number?`。

**继承规则**：

| 条件 | 继承 |
|------|------|
| 有主 ID + 多语言 name + icon | `extends IMetadataEntity<number>` |
| 仅有 ID，无文本名称 | `extends IEntity<number>` |
| 是物品子类型 | 走物品继承链（`HsrItem` → `HsrItemConfig`），不直接继承 IMetadataEntity |


**参考**：`HsrMonster.ts`（IMetadataEntity + 子类型 HsrMonsterSkill）、`HsrBook.ts`（物品继承链）、`HsrGameAvatar.ts`（复杂多子类型）

---

## 第 3 步：创建 Extractor 类

**文件**：`extract/<数据域>/XxxExtractor.ts`

标准结构：

```typescript
import fs from "fs/promises";
import JSONBig from "json-bigint";       // 必须用 JSONBig，不是 JSON
import TextMap from "../../text";
import type { XxxConfig } from "schema/XxxConfig";
import type { HsrXxx } from "@game/games/hsr/HsrXxx";

export class XxxExtractor {
  private lang: string;
  constructor(lang: string) { this.lang = lang; }

  // 原始数据数组（所有相关表）
  xxxConfigs: XxxConfig[] = [];
  xxxMap: Record<number, HsrXxx> = {};

  async init() {
    // 1. 加载所有相关 ExcelOutput JSON（用 JSONBig.parse）
    const json = await fs.readFile("./data/ExcelOutput/XxxConfig.json", "utf-8");
    this.xxxConfigs = JSONBig.parse(json);
    // ... 有子表则继续加载

    // 2. 必须在所有 TextMap 操作之前调用
    await TextMap.loadMap(this.lang);
  }
}
```

### 3a. `getXxxList()` — 主表映射

遍历原始数据，逐字段映射到输出类型：

```typescript
getXxxList(): HsrXxx[] {
  const data = this.xxxConfigs.map(d => {
    const xxx: HsrXxx = {
      id: d.XxxID,
      code: d.XxxID + "",
      name: TextMap.getText(this.lang, d.XxxName.Hash),
      desc: TextMap.getText(this.lang, d.XxxDesc?.Hash),
      icon: getUrl(d.xxxIconPath, "dicloud"),
      someValue: d.SomeValue?.Value,
    };

    // 为所有名称/描述字段打标
    TextMap.setTagInfo(this.lang, d.XxxName.Hash, {
      category: { xxx: d.XxxID + "", type: "XxxConfig" },
      tags: ["xxx"],
    });

    this.xxxMap[xxx.id] = xxx;
    return xxx;
  });

  return _.sortBy(data, "id");
}
```

**映射要点**：
- 文本字段通过 `TextMap.getText()` 获取（Hash 值）或 `TextMap.getHashedText()`（明文字符串）
- `{Value}` 包裹结构统一用 `?.Value`（缺省即 undefined，输出 JSON 省略该字段）
- `code` 通常为 `d.XxxID + ""`
- 图标/图片通过 `getUrl(path, site)` 转换（站点：`"dicloud"`、`"srtools"`）
- 最后 `_.sortBy(data, "id")`

### 3b. `setTagInfo` 打标

所有名称、描述类文本字段都要打标(snake_case)：

```typescript
TextMap.setTagInfo(this.lang, hash, {
  category: { "<类型标签>": d.XxxID + "", type: "<原始配置表名>" },
  tags: ["<类型标签>", "其它标签"],
});
```

- `type`：固定为原始 Excel 配置表名（如 `"MonsterConfig"`）
- `<类型标签>`：类型名称缩写如`avatar`，放主键，如果有父表也放置父表主键，值转字符串；
**category和tags中的类型标签名称必须一致**
- Hash 可能为 null 时用 `?.Hash`
- 明文字符串打标用 `TextMap.setHashedTagInfo(lang, text, info)`
- 物品类必须增加`item`标签，技能描述增加`skill`标签

---

## 第 4 步：处理表关联 （如果有）

### 模式 A：`mutateGroupJoin` — 父表存子表 ID 数组

父表通过一个字段（如 `SkillList: number[]`）存放子表 ID 列表，子表每条记录有唯一 ID。使用 `mutateGroupJoin` 将子表记录按父表的 ID 数组原地挂载到父对象上：

```typescript
fillXxxData() {
  const merged = mutateGroupJoin(this.parentConfigs, {
    list: this.subTable,      // 子表数组
    key: "SubID",             // 子表主键（用于建立 Map 索引）
    bIdsKey: "SubIdList",     // 父表存放子表 ID 数组的字段
    bListKey: "subs",         // 挂载到父表的导航属性名
  });

  for (const item of merged) {
    const xxx = this.xxxMap[item.XxxID];
    if (!xxx) continue;
    xxx.subs = item.subs.map(s => ({ /* ... 转换为输出类型 */ }));
  }
}
```
**适用场景**：
- `MonsterExtractor`（`MonsterConfig.SkillList` → `MonsterSkillConfig.SkillID`）
- `LightconeExtractor`（`EquipmentConfig` → `EquipmentSkillConfig`，需要按 Level 分组）
- `AvatarExtractor` — 技能/命座（`AvatarSkillConfig` / `AvatarRankConfig`）

### 模式 B：`mutateGroupJoin2` — 子表存父表 ID（反向关联）

子表通过一个字段（如 `AvatarID`）存放父表主键，父表不感知子表。使用 `mutateGroupJoin2` 将子表记录按父表 ID 分组后原地挂载：

```typescript
const merged = mutateGroupJoin2(this.parentConfigs, {
  list: this.subTable,       // 子表数组
  key: "ParentId",           // 父表主键（用于匹配）
  aIdKey: "ParentId",        // 子表存放父表 ID 的外键字段
  bListKey: "children",      // 挂载到父表的导航属性名
});
```

**适用场景**：
- `AvatarExtractor` — 行迹（`AvatarSkillTreeConfig.AvatarID` → `AvatarConfig.AvatarID`，行迹表通过 AvatarID 字段指向所属角色）

---

## 第 5 步：创建 Runner 包装函数

**文件**：`extract/<数据域>/index.ts`

**签名约定**：`async (lang: string, rootPath: string)`，`rootPath` 即 `output/` 目录。
**输出格式**：必须用 `JSONBig.stringify`。
**参考**：`extract/lightcone/index.ts`（中等，mutateGroupJoin）、`extract/avatar/index.ts`（复杂，多子表嵌套 join 含 mutateGroupJoin2）

### 输出模式：明细数据拆分（用户明确要求时）

当主实体包含大型子表数据时，采用 **明细拆分** 模式：

- **`index.json`** — 实体列表快照，**不含**明细子表数据（如 `monsters`），用于前端列表展示
- **`<id>.json`** — 单个实体的完整数据，**包含**明细子表，每条记录一个独立文件

**参考实现**：`extract/monster/index.ts`（MonsterTemplate 含 monsters）、`extract/avatar/index.ts`（复杂，HsrGameAvatar 含 promotions/skins/versions）

---

## 第 6 步：注册到主入口

**文件**：`extract/index.ts`

1. 顶部添加 `import { extractXxxData } from "./<数据域>";`
2. 在 `for (const lang of langs)` 循环中添加：

```typescript
console.log("开始提取Xxx数据...");
await extractXxxData(lang, outputRootDir);
```

---

## 特殊：极简场景优化 （用户明确要求时）

如果不涉及多表关联，逻辑简单，可以不建 Extractor 类，直接将加载处理逻辑放入 Runner 包装函数。

**参考**：`extract/databank/index.ts`（多个简单列表）

---

## 关键约定速查

### `{ Value: number }` 判空

```typescript
d.Field?.Value            // 正确，undefined 表示"无此数据"，JSON 输出省略该字段
d.Field?.Value ?? 0       // 错误，丢失了"无数据"和"值为0"的区别
```

输出类型对应字段标为可选（`field?: number`），不要用 `T | null`（会强制使用方显式赋
null）。嵌套 `{Value}` 同理。

### 字段命名约定

Schema（PascalCase，保持原始语义）→ 输出类型（camelCase）：
- 除继承的字段外，不改含义。
- 可按需移除类型前缀，例如`SkillTriggerKey` → `triggerKey`
- 描述字段统一命名为 `desc`
- 技能描述的参数数组字段（通常为`ParamList`）命名为`params`
- 列表字段用 `[]` 类型

### JSONBig

Hash 值为 XXHash64 超过 JS 安全整数范围，所有读写必须用 `JSONBig`（`import JSONBig from "json-bigint"`）。默认 runtime 为 BigNumber；`TextMap.getText` / `setTagInfo` 在入口转为内部 `bigint` Map 键，调用侧无需 `useNativeBigInt`。

### TextMap API

| 场景 | 方法 |
|------|------|
| 加载语言包（必须最先调用） | `await TextMap.loadMap(lang)` |
| 原始 JSON 有 Hash 值 | `TextMap.getText(lang, d.Field.Hash)` |
| 原始 JSON 有明文字符串 | `TextMap.getHashedText(lang, d.Field)` |
| Hash 值打标 | `TextMap.setTagInfo(lang, d.Field.Hash, info)` |
| 字符串打标 | `TextMap.setHashedTagInfo(lang, d.Field, info)` |

### 路径

- cwd 固定为 `packages/cli-hsr/`
- Extractor 内读文件：`./data/ExcelOutput/XxxConfig.json`
- Runner 内写文件：`path.join(rootPath, lang, "subdir")`
- 输出文件名：列表用 `index.json`
- tsconfig paths：`@game/*` → `gacha-game-types/src/*`

### 混淆字段名

较新版本的原始 JSON 字段名为混淆随机字符串（如 `GOJHJGEFGGN`），schema 中一字不动镜像，Extractor 中映射到输出类型的语义化字段名。

- 混淆字段版本变化：当前版本 schema 无后缀，旧版本加后缀如 `RoguePersonaStyle_V4_1`
- 属性值内部有嵌套混淆字段，单独抽新类型避免影响主体
