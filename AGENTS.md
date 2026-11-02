# AGENTS.md — dicloud-game-public

本仓库是一个以 pnpm workspace（`packages/*`）组织的 monorepo，包含米哈游游戏数据提取器、剧情解析器、共享类型、共享工具。修改某个包前，应继续读取该包目录内更具体的 `AGENTS.md`（若存在）；子目录规则优先于本文件。

## 仓库结构

```text
dicloud-game-public/
├── packages/                     # pnpm workspace 子项目
│   ├── cli-hsr/                  # 星穹铁道 Excel/TextMap 数据提取器
│   │   └── data -> ../../extern/TurnBasedGameData
│   ├── scenario-parser/          # 星穹铁道剧情演出图解析子项目
│   │   ├── data -> ../../extern/TurnBasedGameData
│   │   └── docs/                 # 剧情解析设计与生成报告
│   ├── cli-gi/                   # 原神数据提取器
│   ├── hoyo-cli-common/          # CLI 共用逻辑
│   ├── gacha-game-types/         # 共享输出类型（Git submodule）
│   └── unity-richtext/           # Unity 富文本库（Git submodule）
├── extern/
│   └── TurnBasedGameData/        # 上游完整原始数据（Git submodule）
└── tool/
    └── scenario-type-scan/       # DummyDll 与剧情 JSON 类型扫描工具
```

根 `pnpm-workspace.yaml` 使用 `packages/*` 作为 workspace 通配目录。新增子项目原则上放在 `packages/<name>/`，并提供独立的 `package.json`；不要把应用源码直接放到仓库根目录。

## Git submodule

本仓库当前包含以下 submodule，权威配置见 `.gitmodules`：

| 路径 | 用途 |
|------|------|
| `packages/unity-richtext` | Unity 富文本解析库 |
| `packages/gacha-game-types` | 游戏数据输出类型 |
| `extern/TurnBasedGameData` | CLI 与剧情解析器共用的上游原始数据 |

推荐首次拉取：

```bash
git clone <repository-url>
cd dicloud-game-public
git submodule update --init packages/gacha-game-types packages/unity-richtext
```

已经克隆主仓库时：

```bash
git submodule sync --recursive
git submodule update --init packages/gacha-game-types packages/unity-richtext
```

需要原始数据时再运行 `git submodule update --init extern/TurnBasedGameData`；默认只初始化两个源码子模块。更新所有 submodule 到主仓库记录的精确提交仍使用 `git submodule update --init --recursive`。不要在普通功能变更中随意把 submodule checkout 到其他提交；需要升级时，应单独审查并提交主仓库中的 gitlink 变化。

`extern/TurnBasedGameData` 体积较大。若本机已有该仓库，可以先把完整工作树放到 `extern/TurnBasedGameData`，确认其 `origin` 指向 `.gitmodules` 中的 URL，再执行：

```bash
git submodule absorbgitdirs extern/TurnBasedGameData
git submodule update --init extern/TurnBasedGameData
```

## 数据 symlink

原始数据只检出一份，位于 `extern/TurnBasedGameData`。以下 Git symlink 同时指向该目录：

- `packages/cli-hsr/data`
- `packages/scenario-parser/data`

两个项目应通过各自的 `./data` 访问数据，不要在业务代码中写 `../../extern/TurnBasedGameData`，也不要复制第二份原始数据。新增需要同一数据源的子项目时，可以再提交一个指向 `../../extern/TurnBasedGameData` 的相对 symlink。

### Windows 拉取要求

Git 中的 symlink 是模式 `120000` 的条目。Windows 必须允许 Git 创建真实符号链接，否则 `data` 可能被检出成内容为 `../../extern/TurnBasedGameData` 的普通文本文件。

推荐在克隆前完成以下设置：

1. 开启 Windows“开发者模式”，或以具有“创建符号链接”权限的终端运行 Git。
2. 设置 Git：

```powershell
git config --global core.symlinks true
```

3. 克隆并初始化两个源码子模块（大型原始数据按需初始化）：

```powershell
git clone -c core.symlinks=true <repository-url> dicloud-game-public
cd dicloud-game-public
git submodule update --init packages/gacha-game-types packages/unity-richtext
```

若仓库已经在 `core.symlinks=false` 时检出，可在确认工作区没有未提交变更后重新检出链接：

```powershell
git config core.symlinks true
git restore packages/cli-hsr/data packages/scenario-parser/data
git submodule update --init --recursive
```

可用以下命令验证；正确结果中两个 `data` 条目的模式应为 `120000`，数据仓库应为 `160000`：

```bash
git ls-files --stage -- packages/cli-hsr/data packages/scenario-parser/data extern/TurnBasedGameData
```

CI runner 同样必须启用 symlink，并在安装依赖前初始化两个源码 submodule；运行依赖原始数据的工具前再初始化数据 submodule。环境与命令入口见 [README.md](README.md)。

## 剧情类型扫描工具

`tool/scenario-type-scan` 是可追溯的构建期工具。它默认读取：

- `extern/TurnBasedGameData` 中的 Config/Story JSON；
- 本地 `tool/scenario-type-scan/DummyDll/` 中的程序集。

`DummyDll/`、`bin/`、`obj/` 和结构化中间输出均被忽略，不应提交。生成器默认写入 `packages/scenario-parser/docs/scenario-type-inheritance-inventory.md`，可通过参数覆盖。该工具需要 .NET 10 SDK，Markdown 生成器需要 PowerShell 7；DummyDll 准备与参数见[工具说明](tool/scenario-type-scan/README.md)。

## 修改边界

- 不要直接修改 `extern/TurnBasedGameData` 的上游内容；主仓库只记录其提交指针。
- 不要把被忽略的 DummyDll、下载数据、构建产物或提取输出强制加入 Git。
- 修改 submodule 内源码前，先确认该改动确实属于子仓库，并在对应子仓库提交；主仓库随后只提交新的 gitlink。
- 保持项目内路径面向本项目，例如 `./data`；跨包依赖应通过 workspace 包或明确的共享目录表达。
