# GI 文本提取器

当前从原神数据导出 TextMap、Readable 和 Subtitle 三种文本源；角色、武器等业务提取尚未实现。环境安装见[根说明](../../README.md)；以下命令均在仓库根目录运行。

## 准备数据

使用现有下载命令：

```sh
pnpm --filter cli-gi download
```

脚本从 `DimbreathBot/AnimeGameData` 下载以下目录到本包 `data/`，需要网络，并会覆盖相应目录。也可从自行准备的数据副本复制，保持原名：

```text
data/
├── ExcelBinOutput/
├── TextMap/
├── Readable/<lang>/*.txt
└── Subtitle/<lang>/*.srt
```

这里的 `data/` 是独立且被忽略的本地目录，不是 HSR 数据子模块的链接。TextMap 主表与 Medium 表及分片文件应一并保留。

## 提取与输出

```sh
pnpm --filter cli-gi start
```

入口按 TextMap 文件发现语言，将三种文本源分别写入本包：

- `textmap_out/textmap/<lang>.json`
- `textmap_out/readable/<lang>.json`
- `textmap_out/subtitle/<lang>.json`

Subtitle 保留原始 SRT 正文与时间轴。运行会覆盖同名输出文件；当前入口虽会创建 `output/`，主要结果位于 `textmap_out/`。GI 没有上传命令，也不读取 HSR 的对象存储配置。

本包的 `download` 和 `start` 均依赖包工作目录；也可进入 `packages/cli-gi` 后执行 `pnpm download`、`pnpm start`。

字段、哈希与数据约定见 [AGENTS.md](AGENTS.md)。
