# 差分宇宙事件入口

差分宇宙事件图鉴由现有 `extract/rogue/tourn/RogueTournExtractor.ts` 与 `extract/rogue/tourn/index.ts` 一并提取，不再建立独立的事件 Extractor 或 Runner。`extractRogueTournData()` 已注册到 `extract/index.ts` 的全语言流程。

输出：`output/<lang>/rogue/tourn/events/index.json`。
共享类型：`gacha-game-types/src/games/hsr/rogue/tourn-event.ts` 中的 `HsrRogueTournEvent`。

## 入口与字段

以 `RogueTournHandBookEvent` 为列表主表，每个 `EventHandbookID` 输出一条记录，按 `Priority`、ID 排序。

| 输出 | 来源 |
|---|---|
| id / code / name | EventHandbookID / EventTitle |
| typeDisplayId / typeName | TypeDisplayID → RogueTournContentDisplay.DisplayContent |
| unlockDisplayId / unlockDesc | UnlockDisplayID → RogueTournContentDisplay.DisplayContent |
| imageId / icon | ImageID → RogueImage.ImagePath → getUrl |
| priority / isUsed | Priority / IsUsed |
| npcEntries[].id | UnlockNPCProgressIDList[].FDOELDMEBPE |
| npcEntries[].npcJsonPath | 对应 RogueTournNPC.RogueNPCID → NPCJsonPath |

保留全部图鉴行及 `isUsed`，由调用方决定是否只展示启用条目。所有名称、分类和提示文本均经 TextMap 本地化并打标；原始 Hash 通过 JSONBig 读取。

## 与下一步剧情解析的衔接

`npcEntries` 保留图鉴进度关联的全部 NPC 及原始顺序。这些关联不代表剧情播放顺序，也不能从 NPC 编号推导赛季或剧情内容。

例如事件 5“杰姆·哈克与杰姆·哈尔”关联 410301、610301、710301 三个版本。后续剧情解析器可从数据根目录读取每个 `npcJsonPath`，再遍历 `DialogueList`，使用同一项内的 `DialoguePath` 与 `OptionPath` 关联 Act/Opt。不同版本即使正文相同，也应保留各自选项配置。

本阶段只读 ExcelOutput 和 TextMap，不读取 Config/Story，不假定所有配置文件已经下载，也不输出虚假的“剧情已就绪”状态。关联 NPC 行缺失时保留 ID 并省略路径；展示或图片行缺失时保留引用 ID 并省略对应展示字段。

该列表只包含差分宇宙事件图鉴，不把 TitanTalent、Formula、PersonaTalent 等独立剧情入口混入事件列表。它们可在后续剧情功能中按各自入口另行接入。

## 验证

在 `packages/cli-hsr` 执行：

```bash
npm run test:rogue-tourn-events
npx tsc --noEmit
```

测试调用真实 Runner 并写入上述输出路径，逐语言核对所有图鉴行、排序、NPC 路径及跨语言一致性，另覆盖未启用条目、缺失 NPC/展示/图片关联不丢 ID。可用 `npm run test:rogue-tourn-events -- <目录>` 指定测试输出位置。

2026-09-26 快照中有 128 个图鉴事件、343 条 NPC 关联、259 个不同 NPC，全部可在 NPC Excel 表中找到；这些统计不证明其 Act/Opt 文件或完整剧情已经可用。
