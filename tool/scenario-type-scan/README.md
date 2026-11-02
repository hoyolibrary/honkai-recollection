# Scenario type scan

可追溯的构建期审查工具：交叉扫描 TurnBasedGameData 的 Config/Story JSON 与 DummyDll 类型元数据，不读取 `dump.cs`。

需要 .NET 10 SDK；Markdown 生成器另外需要 PowerShell 7。以下命令在仓库根目录执行；首次构建需要访问 NuGet 还原 `Mono.Cecil`。此工具不依赖 pnpm、Java、IDA 或 Python，也不参与普通 CLI 提取。

数据与程序集约定：

- JSON 固定来自根目录 Git 子模块 `extern/TurnBasedGameData`。
- `packages/cli-hsr/data` 和 `packages/scenario-parser/data` 都是指向该子模块的 Git symlink，让两个项目使用各自的 `./data` 路径。
- DummyDll 默认放在本目录 `DummyDll/`，也可通过参数指定；该目录被 Git 忽略。工具只读取显式提供的输入，不搜索其他本地仓库。
- 至少需要 `RPG.GameCore.Config.dll`；为了让 Mono.Cecil 能扫描同版本完整类型目录，建议复制同次生成的全部 DummyDll。

准备 DummyDll：

1. 使用公开 fork [SwingCosmic/HSRGlobalMetadata](https://github.com/SwingCosmic/HSRGlobalMetadata/tree/dummydll)，按其 [README](https://github.com/SwingCosmic/HSRGlobalMetadata/blob/dummydll/README.md) 在本项目之外独立准备该工具及对应版本的游戏输入。
2. 在该工具仓库中运行以下命令；占位项分别替换为自己的游戏输入目录、输出目录和该工具支持的版本配置名：

   ```text
   dotnet run -c Release -- <game-directory> --dummy-dll --no-dump --no-string-literals --output <output-directory> --version <profile-name>
   ```

3. 从自己生成的输出目录的 `DummyDll/` 中取得程序集，放入本工具被忽略的 `DummyDll/`，或将该 `DummyDll/` 目录作为第二个参数传入（不是它的父输出目录）。至少确认存在 `RPG.GameCore.Config.dll`，并尽量使用同批完整程序集。

版本支持与参数以该 fork 的说明为准。DummyDll 与 JSON 应尽量对应同一游戏版本；版本不齐时，未解析类型仍保留在清单中。DummyDll 只提供元数据和占位方法体，不能用于执行游戏逻辑。

本仓库只链接生成工具，不包含其源码、样本、游戏二进制或生成的 DummyDll，也不将其注册为 submodule；不要将这些内容加入本仓库提交。

`summary`、`carriers`、`structural`、`core-list` 和 `inventory-json` 需要完整原始数据中的 Config／Story；先初始化数据子模块：

```powershell
git submodule update --init extern/TurnBasedGameData
dotnet run --project tool/scenario-type-scan -- `
  extern/TurnBasedGameData `
  tool/scenario-type-scan/DummyDll `
  summary
```

第三个参数可取：

`fields` 和 `va` 只读取 DummyDll，但仍保留第一个数据目录参数的位置；它们不会扫描 JSON。

- `summary`：总量、核心类型族、文件桶统计
- `carriers`：直接或嵌套承载 TalkSentence/SentenceID 的类型
- `structural`：实际把对白藏在 task 回调/容器中的类型
- `core-list`：核心剧情图命中的完整 `$type` TSV 清单
- `inventory-json`：供模板脚本消费的结构化数据，包含当前输入中观测到的类型及其展开继承树
- `fields <名称正则> [输出文件]`：导出命中类型（含字段引用闭包）的字段名、字段类型、
  继承链与枚举底层类型，另附静态常量、属性类型、方法签名及前8条 IL 操作码，
  同时导出 `AddressAttribute` 中的原生 VA / RVA / Offset，供原始程序集定位；
  可用于对照 `packages/cli-hsr/schema` 与 Excel JSON 中的字段类型；
  传输出文件时写入文件（如 `output/all-types.json`），否则打印到 stdout
- `va <hex-va> [hex-va...]`：按原生 VA 反查 DummyDll 方法归属（含混淆名），
  供地址审查定位方法；无精确命中时给出最近的下方方法及偏移。

源码按职责拆分：

| 文件 | 职责 |
|------|------|
| `Program.cs` | 顶层入口：参数解析与模式分发 |
| `StoryJsonScanner.cs` | Config/Story JSON 扫描与 `$type` 出现统计（`TypeStats`） |
| `AssemblyIndex.cs` | DummyDll 程序集加载与全名 → 类型索引 |
| `TypeGraph.cs` | Cecil 共享助手：类型扁平化、名称规范化、继承链、字段串格式化 |
| `Classification.cs` | 家族/分类/关键基类判定与继承树展开（inventory 消费） |
| `InventoryJsonMode.cs` | `inventory-json` 输出 |
| `ReportModes.cs` | `summary` / `carriers` / `structural` / `core-list` 控制台输出 |
| `FieldsMode.cs` | `fields` 模式：字段元数据 JSON 导出（含引用闭包） |
| `VaLookupMode.cs` | `va` 模式：原生 VA → DummyDll 方法反查 |

生成独立 Markdown 清单：

```powershell
pwsh -File tool/scenario-type-scan/generate-inventory.ps1
```

默认输出：

- `tool/scenario-type-scan/output/core-types.json`
- `packages/scenario-parser/docs/scenario-type-inheritance-inventory.md`

生成器会先构建工具，再扫描输入并覆盖以上输出；Markdown 是已保存的文档，重新生成可能改变 Git 工作区。可使用 `-DataRoot`、`-DummyDllDirectory`、`-StructuredOutput` 和 `-MarkdownOutput` 指定输入输出，例如只写入被忽略的工具输出目录：

```powershell
pwsh -File tool/scenario-type-scan/generate-inventory.ps1 `
  -StructuredOutput tool/scenario-type-scan/output/core-types.json `
  -MarkdownOutput tool/scenario-type-scan/output/inventory.md
```

仅验证代码能否构建时，可运行 `dotnet build tool/scenario-type-scan`，不需要游戏数据或 DummyDll。类型数量来自当前输入，不要求某个固定的历史统计值。

`bin/`、`obj/`、`output/` 与 `DummyDll/` 都是可重建或本地输入，不提交到 Git；源码、PowerShell 生成器、项目文件与 `scenario-type-scan.slnx` 持久化提交。

核心剧情图口径固定为：Mission Act、Mission Talk、`Mission_*.json`、Story Mission、Story Discussion。全 Config/Story 只用于补任务外对白载荷。
