import fs from "fs/promises";
import path from "path";
import JSONBig from "json-bigint";
import { PerformanceExtractor } from "./PerformanceExtractor";
import { extractTalkSentenceData } from "./talksentence";

const PERFORMANCE_FILE_MAP = {
  A: { fileName: "a.json", label: "演出A" },
  C: { fileName: "c.json", label: "演出C" },
  D: { fileName: "d.json", label: "演出D" },
  DS: { fileName: "ds.json", label: "演出DS" },
  E: { fileName: "e.json", label: "演出E" },
  Video: { fileName: "video.json", label: "演出Video" },
} as const;

export async function extractScenarioData(lang: string, rootPath: string) {
  const performanceOutPath = path.join(rootPath, lang, "scenario", "performance");
  await fs.mkdir(performanceOutPath, { recursive: true });

  console.log("开始提取演出数据...");
  const extractor = new PerformanceExtractor(lang);
  await extractor.init();
  const data = extractor.getExtractedData();

  for (const [type, { fileName, label }] of Object.entries(PERFORMANCE_FILE_MAP)) {
    const items = data[type as keyof typeof PERFORMANCE_FILE_MAP];
    console.log(`写入${label}数据...`);
    await fs.writeFile(
      path.join(performanceOutPath, fileName),
      JSONBig.stringify(items, null, 2),
    );
  }

  console.log("写入演出索引数据...");
  await fs.writeFile(
    path.join(performanceOutPath, "index.json"),
    JSONBig.stringify(data.index, null, 2),
  );

  console.log("写入官方回顾/跳过文案数据...");
  await fs.writeFile(
    path.join(performanceOutPath, "skip-override.json"),
    JSONBig.stringify(data.skipOverride, null, 2),
  );

  console.log("写入官方回放文案数据...");
  await fs.writeFile(
    path.join(performanceOutPath, "replay-override.json"),
    JSONBig.stringify(data.replayOverride, null, 2),
  );

  console.log("写入演出跳过标记数据...");
  await fs.writeFile(
    path.join(performanceOutPath, "skip-flag.json"),
    JSONBig.stringify(data.skipFlag, null, 2),
  );

  console.log("开始提取对话台词数据...");
  await extractTalkSentenceData(lang, rootPath);
}
