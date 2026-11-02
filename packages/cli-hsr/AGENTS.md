# AGENTS.md — cli-hsr

崩坏：星穹铁道（HSR）数据提取器。从原始 `ExcelOutput/*.json` + `TextMap/*.json` 生成多语言结构化输出，并上传至 CDN。

## 项目结构（仅与 Extractor 开发相关的文件）

```
packages/cli-hsr/
├── extract/           # 按数据域组织的提取器与 Runner
│   └── index.ts       # 主入口：检测语言 → 循环调用所有 Runner
├── schema/            # 原始 ExcelOutput JSON 类型，一字不动镜像（含混淆字段名），每个表一个文件
├── data/              # Git symlink → ../../extern/TurnBasedGameData
│   ├── ExcelOutput/   # 原始 JSON 表
│   └── TextMap/       # 多语言文本映射（支持分片文件如 TextMapCHS_1.json）
├── output/            # 多语言输出（gitignored）
│   └── <lang>/        # 每种语言一个目录，内部按数据类型分子目录
├── text.ts            # TextMap 实例（xxhash64 hasher + HSR fixText）
├── textmapFiles.ts    # TextMap 文件名 match 规则（排除 Main）
└── url.ts             # 资源 URL 转换（HSR CDN 映射）
```

关联包：

- **共享逻辑**：`packages/hoyo-cli-common` — TextMap、download、dataset、promise、url 框架
- **输出类型定义**：`packages/gacha-game-types/src/games/hsr/` — 每个数据域一个文件
- **基础实体类型**：`packages/gacha-game-types/src/common/IEntity.ts`
  - `IEntity<T>` — `{ id: T }`
  - `IMetadataEntity<T>` — `extends IEntity<T>`，提供 `{ id, code?, name, icon? }`

---

## 新增 Extractor 流程

> 完整的分步指南见 **[新增 Extractor 指南](../../.agents/skills/new-extractor-guide/SKILL.md)**
>
> 包含：Schema 创建 → 输出类型定义 → Extractor 类编写 → 表关联处理 → Runner 包装 → 主入口注册
> 以及目录组织、{Value}判空、字段命名、JSONBig、TextMap API、路径规则、混淆字段处理等关键约定速查。

---

## 运行命令

下表命令在本包目录执行；从仓库根目录运行时使用 `pnpm --filter cli-hsr <命令>`。环境准备、输入输出和完整用法见 [README.md](README.md)。

| 命令 | 说明 |
|------|------|
| `pnpm start` | 全量提取所有语言 |
| `pnpm start:simple` | 执行全部提取，语言限定 CHS、EN、JP |
| `pnpm upload` | 通过 tsx 运行 TypeScript 入口并调用 rclone 上传 `output/`；支持 Windows、Linux、macOS |
| `pnpm upload --dry-run` | 查询远端并预览上传，不写入对象；仍需要网络与存储权限 |
| `pnpm test:upload` | 使用模拟进程验证上传参数、前置检查和退出状态，不访问对象存储 |
| `pnpm test:rogue-tourn-events` | 从真实数据提取并验证差分事件；默认写入 `output/` |

完整原始数据通过根目录的 `extern/TurnBasedGameData` 子仓库准备；`download.ts` 仅作为不拉取完整子仓库时的手动备用脚本，使用限制见文件开头。

`.env` 提供可公开的 S3 兼容对象存储默认配置和空白占位项，`.env.local` 是被忽略的可选覆盖文件。上传与编年史图标查询均按“进程环境变量 > `.env.local` > `.env`”加载。凭据、region 和 endpoint 沿用通用 AWS 变量；bucket 和对象前缀使用 `S3_BUCKET`、`S3_PREFIX`。

编年史图标查询需要额外安装 `s5cmd`，上传需要额外安装 `rclone`；两者都必须加入 PATH。Windows 对应可执行文件为 `s5cmd.exe`、`rclone.exe`。

---

## 常见问题

**Q: 输出类型要不要继承 IMetadataEntity？**

有主 ID + name + icon → `IMetadataEntity<number>`。仅有 ID → `IEntity<number>`。作为物品子类型 → 走 `HsrItem → HsrItemConfig` 继承链。
