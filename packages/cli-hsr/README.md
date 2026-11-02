# HSR 数据提取器

从星穹铁道原始表和剧情配置生成多语言结构化数据。环境安装见[根说明](../../README.md)；以下命令均在仓库根目录运行。

## 输入与准备

先完成 workspace 安装。`data` 是指向 `extern/TurnBasedGameData` 的 Git symlink，推荐初始化完整数据子模块：

```sh
git submodule update --init extern/TurnBasedGameData
```

完整提取需要 `ExcelOutput/`、`TextMap/` 以及提取器使用的 `Config/`、`Story/` 等数据；仅有 Excel 和 TextMap 不足以替代完整数据。

## 命令

| 命令 | 行为与输出 |
|------|------------|
| `pnpm --filter cli-hsr start` | 按 TextMap 发现的语言运行全部提取 |
| `pnpm --filter cli-hsr start:simple` | 同样运行全部提取，但语言固定为 CHS、EN、JP，需要这些语言的 TextMap |
| `pnpm --filter cli-hsr upload --help` | 显示上传参数，不访问远端 |
| `pnpm --filter cli-hsr upload --dry-run` | 调用 rclone 查询并预览上传，不写入远端 |
| `pnpm --filter cli-hsr upload` | 将 `output/` 复制到配置的对象存储前缀 |
| `pnpm --filter cli-hsr test:upload` | 模拟进程测试，无需真实存储、游戏数据或 rclone |
| `pnpm --filter cli-hsr test:rogue-tourn-events` | 根据实际数据提取并验证各语言差分事件，默认写入 `output/` |

结构化结果写入本包 `output/<lang>/`，另有根层聚合字典；打标后的文本写入 `textmap_out/<lang>.json`。提取会写入／覆盖对应产物，不会自动上传。

差分事件测试可把结果写入忽略的临时目录，避免覆盖普通提取结果：

```sh
pnpm --filter cli-hsr test:rogue-tourn-events dist/checks/rogue-tourn-events
```

## 对象存储

配置和变量定义见[根说明](../../README.md#本地配置)及本包 [.env](.env)。`.env.local` 可选，优先级为进程环境变量 > `.env.local` > `.env`。只在本机文件中填写真实凭据。

配置完整时，提取会通过 PATH 中的 `s5cmd` 查询编年史图标；上传另外依赖 PATH 中的 `rclone`。Windows 对应 `s5cmd.exe`、`rclone.exe`。未配置完整时跳过图标查询；上传则要求完整配置和已存在的 `output/`。

## 备用下载脚本

`download.ts` 只供不拉取完整数据子模块时手动下载 ExcelOutput 和 TextMap，不是 package.json 命令，也不提供 Config／Story。使用限制见[脚本开头](download.ts)；它会覆盖目标目录，不用于更新已初始化的数据子模块。日常使用优先采用上述 submodule 方式。

开发约定见 [AGENTS.md](AGENTS.md)。
