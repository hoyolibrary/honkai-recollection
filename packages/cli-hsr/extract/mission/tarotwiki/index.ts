import fs from "fs/promises";
import JSONBig from "json-bigint";
import path from "path";
import { TarotWikiExtractor } from "./TarotWikiExtractor";

export async function extractTarotWikiData(lang: string, rootPath: string) {
  const outpath = path.join(rootPath, `./${lang}/tarotwiki`);
  await fs.mkdir(outpath, { recursive: true });

  const extractor = new TarotWikiExtractor(lang);

  console.log("加载如我所书数据...");
  await extractor.init();

  // 1. 输出 index.json: Timeline → Data → Subdata 三层树
  console.log("写入实验进程时间轴数据...");
  const timelines = extractor.getTimelineList();
  await fs.writeFile(
    path.join(outpath, "index.json"),
    JSONBig.stringify(timelines, null, 2),
  );

  // 2. 输出 changes.json: UnlockCondition → Changeinfo
  console.log("写入实验记录解锁与变动数据...");
  const unlockConditions = extractor.getUnlockConditionList();
  await fs.writeFile(
    path.join(outpath, "changes.json"),
    JSONBig.stringify(unlockConditions, null, 2),
  );
}
