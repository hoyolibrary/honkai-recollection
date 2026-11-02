# Scenario Parser

星穹铁道剧情演出图解析子项目。

原始数据通过项目内的 `data` symlink 共用根目录 `extern/TurnBasedGameData` 子模块。设计与扫描报告放在 `docs/`，实地案例放在 `case-tests/`。

## 环境与准备

使用根仓库约定的 Node.js 24、pnpm 12.15.0；完整安装流程及 Java／ANTLR 环境见[根说明](../../README.md)。本包直接声明 jsdom、antlr4 等运行依赖，不依赖根目录的依赖提升。

以下命令均在仓库根目录执行：

```sh
git submodule update --init packages/gacha-game-types packages/unity-richtext
pnpm install --frozen-lockfile
pnpm build
git submodule update --init extern/TurnBasedGameData
pnpm --filter cli-hsr start:simple
pnpm --filter scenario-parser extract:dialogue:v2
```

主线速览需要完整原始数据及 HSR 的 CHS 输出，包括任务图、世界、台词字典、动态文本等。`start:simple` 会生成这些前置产物，同时也执行其他 HSR 提取流程。

富文本渲染读取同仓库 `packages/unity-richtext/dist/`，因此需先构建该库；运行时自动生成本包 `.cache/` 下的兼容缓存。无需前端仓库或 DummyDll。

## 脚本、输入与输出

| 根目录命令 | 输入与结果 |
|------------|------------|
| `pnpm --filter scenario-parser extract:dialogue` | 原始数据 + HSR CHS 输出；v1 速览写入 `output/dialogue/` |
| `pnpm --filter scenario-parser extract:dialogue:v2` | 原始数据 + HSR CHS 输出；v2 速览写入 `output/v2/` |
| `pnpm --filter scenario-parser test:act100010162` | 原始数据 + 默认位置的 HSR CHS 台词、角色、属性与命途输出；默认重写该案例的 `output.chs.json` |
| `pnpm --filter scenario-parser test:rogue-dialogue` | 直接读取原始数据，不需要 HSR 输出或富文本构建；默认重写该案例的 JSON 和 Markdown 产物 |

`pnpm test:scenario` 在根目录依次运行上面两个案例。它们是带断言的案例生成脚本，会写文件；使用自定义输出位置可避免改动已保存的案例结果：

```sh
pnpm --filter scenario-parser test:act100010162 .cache/act100010162/output.chs.json
pnpm --filter scenario-parser test:rogue-dialogue .cache/rogue-dialogue
```

这些相对输出路径以本包工作目录为准。案例断言针对指定样本和数据快照；升级原始数据后，应核对样本变化。

主线 v1、v2 的 HSR 输出默认读取 `packages/cli-hsr/output/CHS`；环境变量 `CLI_HSR_OUTPUT` 可以改为另一份 **CHS 目录**，相对值按当前工作目录解析。此覆盖项只适用于两个主线入口，不适用于 Act 案例；本包不会自动加载 HSR 的 `.env`／`.env.local`。

例如在仓库根目录使用 PowerShell：

```powershell
$env:CLI_HSR_OUTPUT = '/path/to/CHS'
pnpm --filter scenario-parser extract:dialogue:v2
Remove-Item Env:CLI_HSR_OUTPUT
```

在 Bash 中可仅对本次命令设置：

```sh
CLI_HSR_OUTPUT=/path/to/CHS pnpm --filter scenario-parser extract:dialogue:v2
```

## Tier 1 快速浏览提取器

```bash
pnpm --filter scenario-parser extract:dialogue
```

为全部主线任务（`type=Main`）与开拓续闻（`type=Gap`）生成速览 markdown，输出到 `output/dialogue/`（构建产物，不入库）：

- 目录按世界 `worldId_名称` 分层，文档按章节 `chapterId_任务类型_章节名` 命名（Main/Gap 取章节内主导任务类型）；
- 章节内任务顺序取自 cli-hsr 任务图的剧情拓扑排序；任务之间以分隔线隔开，每个任务以 blockquote 附图内任务描述与编年史图标（动态性别图标默认男性版）；
- 台词按句 ID 顺序整理：有说话人的台词输出为无序列表项，说话人为空即旁白段落；
- 文本预渲染：台词、说话人与任务描述经 unity-richtext（Node 运行时，见 `src/lib/unity-richtext-node.mjs`）渲染为 HTML——`{NICKNAME}`、`{F#}{M#}` 性别（默认男性）、`<color>`/`<unbreak>`/ruby 注音、`{TEXTJOIN#n}` 等自动处理；
- 句子归属：演出图内引用（`Config/Level/Mission/<id>/Act`、`Story/Mission/<id>`、`Story/Discussion/Mission/<id>` 三处）按句子级多数票决定，块内按区间插值补齐 DS 时代正文；1054500-1054506（4.5.1 面板内容，图未随快照发布）按 chapter105007 案例验证过的「155+任务末两位」规则回退认领。

已知限制（与 chapter105007 案例实测结论一致）：不含分支结构、玩家选项摊平为顺序行、部分旁白/全屏文本顺序有偏差；纯 Timeline 无锚点演出与图缺失任务的台词无法归属，任务节内以注记说明。

类型扫描及继承树文档生成是独立的可选流程，环境与 DummyDll 准备见[工具说明](../../tool/scenario-type-scan/README.md)，不参与本包运行时解析。

## 模拟宇宙 / 差分宇宙案例

```bash
pnpm --filter scenario-parser test:rogue-dialogue
```

第三个案例从 Rogue Excel 入口追踪剧情与关卡事件，覆盖两个指定句子、Act/Opt 选项、新版 Excel Option 关联、星神对白及运行时事件回调，共 8 个真实样本，并巡检入口可达的演出图。直接读取 `./data`，不依赖 cli-hsr 输出。

结论与数据缺口见 [案例报告](./case-tests/rogue-dialogue/report.md)，可读文本见 [案例对白](./case-tests/rogue-dialogue/dialogue.chs.md)。这是独立的格式探索与回归测试，尚未接入主线快速提取命令。
