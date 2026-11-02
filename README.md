# dicloud-game-public

米哈游游戏数据提取器、剧情解析器、共享输出类型和 Unity 富文本库。

本仓库使用 pnpm workspace，不包含前端应用及其私有依赖。

## 安装与验证

以下命令均从仓库根目录运行。当前验证环境：Node.js 24（含 npm）、pnpm 12.15.0。

| 工具 | 使用范围 |
|------|----------|
| Git | 克隆、初始化 submodule；剧情 Rogue 案例还会读取数据仓库提交号 |
| Java、支持 `-v 4.13.2` 的 `antlr4` 命令 | `pnpm build` 通过富文本库的 `prebuild` 重新生成语法；当前验证使用 Java 11 |
| .NET 10 SDK、PowerShell 7 | 可选的剧情类型扫描及 Markdown 清单生成，不是日常提取依赖 |

如尚未安装对应工具，可安装固定版本 pnpm，以及提供 `antlr4` 命令的 Python 包（后者需要 Python 3 和 pip）：

```sh
npm install --global pnpm@12.15.0
python -m pip install antlr4-tools
antlr4 -v 4.13.2
```

ANTLR 命令和 PATH 设置见 [antlr4-tools 官方说明](https://github.com/antlr/antlr4-tools)。首次调用可能下载 ANTLR 工具及 Java；CI 应提前准备。npm 包 `antlr4` 是解析运行时，不能替代此命令行工具。JavaScript 依赖安装也不会安装 s5cmd、rclone 或 .NET。

对象存储相关功能需要额外安装命令行工具，并将其加入 PATH：

- **s5cmd**：提取时查询 bucket 中的编年史图标文件信息，Windows 使用 `s5cmd.exe`。
- **rclone**：上传提取结果，Windows 使用 `rclone.exe`。

Windows 在克隆前应开启开发者模式，或确保终端有创建符号链接的权限；`core.symlinks=true` 本身不会授予系统权限。先初始化两个源码子模块，再安装依赖：

```sh
git clone -c core.symlinks=true <repository-url> dicloud-game-public
cd dicloud-game-public
git submodule update --init packages/gacha-game-types packages/unity-richtext
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm --filter cli-hsr test:upload
```

两个源码子模块保持各自已有的提交历史。包之间的本地依赖通过 `workspace:*` 绑定。

`pnpm build` 只构建共享类型和富文本库，不提取游戏数据；安装和首次构建需要访问包源／ANTLR 下载源。大型原始数据子模块可在需要时单独初始化。

| 根目录命令 | 前置条件与验证范围 |
|------------|--------------------|
| `pnpm build` | 源码子模块、依赖和 ANTLR 环境；构建共享类型与富文本库 |
| `pnpm typecheck` | workspace 依赖；检查 HSR、GI 的 TypeScript 类型，不执行提取 |
| `pnpm test` | workspace 依赖；仅运行 unity-richtext 单元测试，不是全仓库测试总入口 |
| `pnpm --filter cli-hsr test:upload` | 模拟上传进程，不访问对象存储，不需要 rclone 或游戏数据 |
| `pnpm test:scenario` | HSR 数据及 CHS 输出；依次运行 Act、Rogue 案例并生成案例产物 |
| `pnpm --filter cli-hsr test:rogue-tourn-events` | HSR 数据；真实提取并验证差分事件，默认写入 HSR `output/` |

CLI 的输入与输出依赖包工作目录：从根目录使用 `pnpm --filter <包名> <命令>`，或进入对应包后执行 `pnpm <命令>`。不要从根目录直接调用依赖包工作目录的提取脚本。

## 游戏数据与提取

原始数据及提取输出不随普通源码复制，也不加入本仓库的普通文件提交。
`extern/TurnBasedGameData` 保留为可选初始化的数据子模块：

```sh
git submodule update --init extern/TurnBasedGameData
pnpm --filter cli-hsr start:simple
```

`packages/cli-hsr/data`、`packages/scenario-parser/data` 是指向该子模块的相对符号链接。
Windows 需要启用开发者模式或具有创建符号链接权限，并在检出前设置 `git config --global core.symlinks true`。

`start:simple` 同样执行全部提取，仅将语言限定为 **CHS、EN、JP**，需要这些语言的 TextMap；全语言使用 `pnpm --filter cli-hsr start`。结果写入本包 `output/` 和 `textmap_out/`，不会自动上传。完整输入和命令见 [HSR 使用说明](packages/cli-hsr/README.md)。

原神的数据独立准备到 `packages/cli-gi/data/`，可运行 `pnpm --filter cli-gi download` 下载，再运行 `pnpm --filter cli-gi start`。下载需要网络并覆盖对应数据目录。当前 GI 入口仅导出 TextMap、Readable、Subtitle 三种文本源，目录要求和输出位置见 [GI 使用说明](packages/cli-gi/README.md)。

剧情提取需要先构建富文本库并生成 HSR 的 CHS 输出：

```sh
pnpm --filter scenario-parser extract:dialogue:v2
pnpm test:scenario
```

v2 输出到 `packages/scenario-parser/output/v2/`。剧情案例的具体输入和输出要求见 [剧情解析说明](packages/scenario-parser/README.md)。案例测试会生成文件；`pnpm test:scenario` 默认会重写已保存的案例产物。

## 本地配置

`packages/cli-hsr/.env` 是可公开的 S3 兼容对象存储配置文件，提供默认值、空白占位项和变量说明。
同目录的 `.env.local` 可选且被 Git 忽略，可只填写需要覆盖的本机配置。上传与编年史图标查询都会加载两个文件，优先级为：**进程环境变量 > `.env.local` > `.env`**。

显式空值也会覆盖低优先级值。真实凭据只填入 `.env.local` 或进程环境变量，保留 `.env` 中的公开占位项。

上传和编年史图标查询共用以下变量：

- `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`：通用访问凭据；临时凭据可另外设置 `AWS_SESSION_TOKEN`。
- `AWS_REGION`：存储服务要求的区域。
- `AWS_ENDPOINT_URL`：通用 API endpoint；可用非空的 `AWS_ENDPOINT_URL_S3` 指定优先使用的 S3 endpoint。
- `S3_BUCKET`：bucket 名称，不含 `s3://` 或路径。
- `S3_PREFIX`：bucket 内的对象路径前缀，必须非空；代码会去掉首尾斜杠。
- `RCLONE_S3_PROVIDER`：rclone 的标准 provider 配置，默认 `Other`。

准备好 HSR `output/` 并完成配置后运行 `pnpm --filter cli-hsr upload`。上传入口为 `upload.ts`，统一通过 `tsx` 运行，支持 Windows、Linux 和 macOS，需要将 rclone 加入 PATH（Windows 使用 `rclone.exe`）。
使用 `pnpm --filter cli-hsr upload --dry-run` 可让 rclone 查询远端并预览上传，不写入远端对象；这仍需要有效的存储配置和网络连接。
无论从哪个目录调用，上传源均为 `packages/cli-hsr/output/`，目标为 `s3://<S3_BUCKET>/<S3_PREFIX>/`；使用 `copy` 和 checksum 比较，复制新增或有差异的对象，不删除远端独有对象。预览需要读取权限，正式上传还需要写入权限；配置不完整或输出目录不存在时上传会失败。
编年史图标查询依赖额外安装并加入 PATH 的 `s5cmd`（Windows 为 `s5cmd.exe`），路径为上述前缀下的 `spriteoutput/chronicle/`；未配置完整时跳过该查询，查询失败则报告错误并继续提取。

类型扫描工具需要 .NET 10 和自行准备的输入文件；DummyDll 可通过公开的 HSRGlobalMetadata fork 生成，具体步骤见 [工具说明](tool/scenario-type-scan/README.md)。本仓库不包含该外部仓库的内容、DummyDll、游戏二进制或扫描输出。

## 开发与维护

- [仓库结构、submodule 与 symlink 维护](AGENTS.md)
- [HSR Extractor 开发约定](packages/cli-hsr/AGENTS.md)
- [GI 数据与开发约定](packages/cli-gi/AGENTS.md)

数据子模块只记录提交指针；本地下载数据、普通提取结果、缓存、构建产物和真实环境配置不应加入 Git。剧情案例目录中已有的 JSON／Markdown 是保存的案例结果，重新运行案例可能更新它们。
