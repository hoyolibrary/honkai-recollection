# Honkai Recollection

**崩坏忆庭** 游戏数据分析器与剧情解析器。

本仓库提供数据处理工具，不包含前端应用，也不限制应用场景：可以基于导出的数据自行实现前端或客户端。
数据均来自公开来源，无需参与解包，仓库不包含游戏二进制文件和资源文件。

## 能力一览

- **HSR 数据提取**：把星穹铁道的 Excel、TextMap 与剧情配置导出为多语言结构化数据，可选上传到 S3 兼容对象存储。
- **GI 文本提取**：导出原神的 TextMap、Readable、Subtitle 三种文本源。
- **剧情解析**：从 HSR 演出图还原主线速览，并回归差分宇宙等真实案例。
- **可选工具**：剧情类型扫描（.NET），用于生成类型继承清单文档。

## 仓库结构

| 路径 | 包名／类型 | 作用 |
|------|-----------|------|
| `packages/cli-hsr/` | `cli-hsr` | HSR 数据提取、对象存储上传、差分事件校验 |
| `packages/cli-gi/` | `cli-gi` | GI 文本源提取（TextMap／Readable／Subtitle） |
| `packages/scenario-parser/` | `scenario-parser` | HSR 剧情演出图解析与案例回归 |
| `packages/hoyo-cli-common/` | `hoyo-cli-common` | 两个 CLI 共用的提取逻辑 |
| `packages/gacha-game-types/` | submodule | 共享输出类型 |
| `packages/unity-richtext/` | submodule | Unity 富文本解析库 |
| `extern/TurnBasedGameData/` | submodule（按需） | 上游完整原始数据 |
| `tool/scenario-type-scan/` | 独立工具 | 可选的剧情类型扫描与清单生成 |

`packages/cli-hsr/data` 与 `packages/scenario-parser/data` 是指向 `../../extern/TurnBasedGameData` 的相对符号链接，原始数据只保留一份；`packages/cli-gi/data/` 则是独立且被忽略的本地目录。

## 环境要求

当前验证环境：Node.js 24（含 npm）、pnpm 12.15.0。

| 工具 | 使用范围 |
|------|----------|
| Git | 克隆、初始化 submodule；剧情 Rogue 案例还会读取数据仓库提交号 |
| Java、支持 `-v 4.13.2` 的 `antlr4` 命令 | 构建富文本库时由 `prebuild` 重新生成语法；当前验证使用 Java 11 |
| .NET 10 SDK、PowerShell 7 | 可选的剧情类型扫描及 Markdown 清单生成，不是日常提取依赖 |

如尚未安装，可安装固定版本 pnpm，以及提供 `antlr4` 命令的 Python 包（需要 Python 3 和 pip）：

```sh
npm install --global pnpm@12.15.0
python -m pip install antlr4-tools
antlr4 -v 4.13.2
```

ANTLR 命令与 PATH 设置见 [antlr4-tools 官方说明](https://github.com/antlr/antlr4-tools)。首次调用可能下载 ANTLR 工具及 Java，CI 应提前准备。
npm 包 `antlr4` 只是解析运行时，不能替代该命令行工具；JavaScript 依赖安装也不会安装 s5cmd、rclone 或 .NET。

对象存储相关功能需要额外安装并加入 PATH 的命令行工具：

- **s5cmd**：提取时查询 bucket 中的剧情任务图标文件信息（Windows 为 `s5cmd.exe`）。
- **rclone**：上传提取结果（Windows 为 `rclone.exe`）。

## 快速开始

### 1. 克隆并初始化源码子模块

```sh
git clone -c core.symlinks=true <repository-url> dicloud-game-public
cd dicloud-game-public
git submodule update --init packages/gacha-game-types packages/unity-richtext
```

Windows 必须在克隆前开启“开发者模式”，或确保终端具有创建符号链接的权限；`core.symlinks=true` 本身不会授予系统权限。
若仓库已在 `core.symlinks=false` 时检出，可在确认工作区没有未提交变更后重新检出链接：

```powershell
git config core.symlinks true
git restore packages/cli-hsr/data packages/scenario-parser/data
git submodule update --init --recursive
```

### 2. 安装依赖并构建（仓库根目录）

以下命令在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
```

| 根目录命令 | 前置条件 | 说明 |
|------------|----------|------|
| `pnpm build` | 两个源码子模块、依赖、Java 与 ANTLR | 构建共享类型与富文本库，不提取游戏数据 |
| `pnpm typecheck` | workspace 依赖 | 检查 `cli-hsr`、`cli-gi` 的 TypeScript 类型，不执行提取 |
| `pnpm test` | workspace 依赖 | 仅运行 `unity-richtext` 单元测试，不是全仓库测试总入口 |
| `pnpm test:scenario` | HSR 数据与 CHS 输出 | 依次运行两个剧情案例并生成产物，会重写已保存的案例结果 |

`pnpm test:scenario` 等价于在 `packages/scenario-parser` 依次执行 `pnpm test:act100010162` 与 `pnpm test:rogue-dialogue`。
安装与首次构建需要访问包源／ANTLR 下载源。

### 3. 初始化原始数据

```sh
git submodule update --init extern/TurnBasedGameData
```

大型原始数据子模块体积较大，按需初始化即可；两个源码子模块照常保持各自已有的提交历史。

### 4. 跑一次提取

```sh
cd packages/cli-hsr
pnpm start:simple
```

结果写入该包的 `output/` 与 `textmap_out/`，不会自动上传。更多命令见下方[命令速查与工作目录](#命令速查与工作目录)。

## 命令速查与工作目录

除仓库根目录的汇总脚本（`pnpm install`、`pnpm build`、`pnpm typecheck`、`pnpm test`）外，**所有包命令都以包目录为工作目录**。
CLI 的输入与输出依赖工作目录，请先 `cd` 进入对应包再执行 `pnpm <命令>`，不要从根目录调用依赖包工作目录的脚本。

| 工作目录 | 命令 | 作用 |
|----------|------|------|
| `packages/cli-hsr` | `pnpm start` | 按 TextMap 发现的语言执行全部提取 |
| `packages/cli-hsr` | `pnpm start:simple` | 同样执行全部提取，但语言固定为 CHS、EN、JP |
| `packages/cli-hsr` | `pnpm upload` | 将 `output/` 复制到配置的对象存储前缀 |
| `packages/cli-hsr` | `pnpm upload --dry-run` | 调用 rclone 查询并预览上传，不写入远端 |
| `packages/cli-hsr` | `pnpm upload --help` | 显示上传参数，不访问远端 |
| `packages/cli-hsr` | `pnpm test:upload` | 模拟上传进程，不需要存储配置、游戏数据或 rclone |
| `packages/cli-hsr` | `pnpm test:rogue-tourn-events` | 用真实数据提取并校验各语言差分事件，默认写入 `output/` |
| `packages/cli-gi` | `pnpm download` | 下载 GI 数据到本包 `data/` |
| `packages/cli-gi` | `pnpm start` | 导出 TextMap、Readable、Subtitle |
| `packages/scenario-parser` | `pnpm extract:dialogue` | 生成主线速览 v1，写入 `output/dialogue/` |
| `packages/scenario-parser` | `pnpm extract:dialogue:v2` | 生成主线速览 v2，写入 `output/v2/` |
| `packages/scenario-parser` | `pnpm test:act100010162` | 运行 Act 案例，默认重写该案例的 `output.chs.json` |
| `packages/scenario-parser` | `pnpm test:rogue-dialogue` | 运行 Rogue 案例，默认重写该案例的 JSON 与 Markdown |
| `packages/unity-richtext` | `pnpm build` / `pnpm test` | 构建（含语法生成）／运行单元测试 |

## 游戏数据与提取

### HSR

`packages/cli-hsr/data` 通过 symlink 指向数据子模块。完整提取需要 `ExcelOutput/`、`TextMap/`，以及提取器使用的 `Config/`、`Story/` 等数据；只有 Excel 和 TextMap 不足以替代完整数据。

```sh
cd packages/cli-hsr
pnpm start:simple   # 仅 CHS、EN、JP，需要这些语言的 TextMap
pnpm start          # 按 TextMap 中出现的语言执行全部语言
```

结构化结果写入本包 `output/<lang>/`（含根层聚合字典），打标后的文本写入 `textmap_out/<lang>.json`。提取会写入／覆盖对应产物，不会自动上传。

差分事件测试可把结果写入被忽略的临时目录，避免覆盖普通提取结果：

```sh
pnpm test:rogue-tourn-events dist/checks/rogue-tourn-events
```

完整输入与命令说明见 [HSR 使用说明](packages/cli-hsr/README.md)。`download.ts` 仅用于不初始化完整数据子模块时手动下载 ExcelOutput 与 TextMap，不是 package.json 命令，也不提供 Config／Story。

### GI

GI 数据独立准备到 `packages/cli-gi/data/`，该目录被 Git 忽略，不是 HSR 数据子模块的链接：

```sh
cd packages/cli-gi
pnpm download
pnpm start
```

`download` 需要网络并会覆盖对应数据目录，下载后目录结构应为：

```text
data/
├── ExcelBinOutput/
├── TextMap/
├── Readable/<lang>/*.txt
└── Subtitle/<lang>/*.srt
```

入口按 TextMap 文件发现语言，分别写入本包：

- `textmap_out/textmap/<lang>.json`
- `textmap_out/readable/<lang>.json`
- `textmap_out/subtitle/<lang>.json`

Subtitle 保留原始 SRT 正文与时间轴。运行会覆盖同名输出文件；GI 没有上传命令，也不读取 HSR 的对象存储配置。
目录要求与输出位置见 [GI 使用说明](packages/cli-gi/README.md)。

### 剧情解析

剧情提取需要先构建富文本库，并生成 HSR 的 CHS 输出（含任务图、世界、台词字典、动态文本等前置产物）：

```sh
cd packages/cli-hsr
pnpm start:simple

cd ../scenario-parser
pnpm extract:dialogue:v2
```

v2 输出到 `packages/scenario-parser/output/v2/`；v1 写入 `output/dialogue/`。
富文本渲染读取 `packages/unity-richtext/dist/`，运行时会在本包 `.cache/` 下生成本地兼容缓存，不需要前端仓库或 DummyDll。

两个案例是带断言的生成脚本，默认重写已保存的案例产物。使用自定义输出位置可避免改动案例结果（相对路径以本包工作目录为准）：

```sh
pnpm test:act100010162 .cache/act100010162/output.chs.json
pnpm test:rogue-dialogue .cache/rogue-dialogue
```

主线 v1、v2 默认读取 `packages/cli-hsr/output/CHS`，可用环境变量 `CLI_HSR_OUTPUT` 指向另一份 **CHS 目录**（相对值按当前工作目录解析）。该覆盖项只适用于两个主线入口，不适用于 Act 案例；本包也不会自动加载 HSR 的 `.env`／`.env.local`。

```sh
# Bash：仅对本次命令生效
CLI_HSR_OUTPUT=/path/to/CHS pnpm extract:dialogue:v2
```

```powershell
# PowerShell：设置后需手动清理
$env:CLI_HSR_OUTPUT = '/path/to/CHS'
pnpm extract:dialogue:v2
Remove-Item Env:CLI_HSR_OUTPUT
```

案例输入、输出要求与已知限制见 [剧情解析说明](packages/scenario-parser/README.md)。

## 本地配置与上传

`packages/cli-hsr/.env` 是可公开的 S3 兼容对象存储配置文件，提供默认值、空白占位项和变量说明。
同目录的 `.env.local` 可选且被 Git 忽略，只填写需要覆盖的本机配置。上传与剧情任务图标查询都会加载这两个文件，优先级为：**进程环境变量 > `.env.local` > `.env`**。
显式空值同样会覆盖低优先级值；真实凭据只填入 `.env.local` 或进程环境变量，保留 `.env` 中的公开占位项。

上传和图标查询共用的变量：

- `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`：访问凭据；临时凭据可另设 `AWS_SESSION_TOKEN`。
- `AWS_REGION`：存储服务要求的区域。
- `AWS_ENDPOINT_URL`：通用 API endpoint；非空的 `AWS_ENDPOINT_URL_S3` 可指定优先使用的 S3 endpoint。
- `S3_BUCKET`：bucket 名称，不含 `s3://` 或路径。
- `S3_PREFIX`：bucket 内的对象路径前缀，必须非空；代码会去掉首尾斜杠。
- `RCLONE_S3_PROVIDER`：rclone 的标准 provider 配置，默认 `Other`。

准备好 HSR `output/` 并完成配置后，在本包内上传：

```sh
cd packages/cli-hsr
pnpm upload --dry-run   # 查询远端并预览，不写入对象
pnpm upload
```

上传源固定为 `packages/cli-hsr/output/`，目标为 `s3://<S3_BUCKET>/<S3_PREFIX>/`；使用 `copy` 与 checksum 比较，只复制新增或有差异的对象，不删除远端独有对象。预览需要读取权限，正式上传还需要写入权限；配置不完整或输出目录不存在时上传会失败。

提取时的剧情任务图标查询依赖 PATH 中的 `s5cmd`，路径为上述前缀下的 `spriteoutput/chronicle/`；未配置完整时跳过查询，查询失败则报告错误并继续提取。

## 可选：剧情类型扫描

类型扫描工具需要 .NET 10 与自行准备的输入文件；DummyDll 可通过公开的 HSRGlobalMetadata fork 生成，步骤见[工具说明](tool/scenario-type-scan/README.md)。
本仓库不包含该外部仓库的内容、DummyDll、游戏二进制或扫描输出。

## 开发与维护

- [仓库结构、submodule 与 symlink 维护](AGENTS.md)
- [HSR Extractor 开发约定](packages/cli-hsr/AGENTS.md)
- [GI 数据与开发约定](packages/cli-gi/AGENTS.md)
- [剧情解析设计与生成报告](packages/scenario-parser/docs/)
- [富文本库说明](packages/unity-richtext/README.md)

数据子模块只记录提交指针；本地下载数据、普通提取结果、缓存、构建产物和真实环境配置都不应加入 Git。
剧情案例目录中已有的 JSON／Markdown 是保存的案例结果，重新运行案例可能更新它们。
新增子项目应放在 `packages/<name>/` 并提供独立 `package.json`；业务代码通过各自的 `./data` 访问原始数据，不要在源码中写 `../../extern/TurnBasedGameData`。
