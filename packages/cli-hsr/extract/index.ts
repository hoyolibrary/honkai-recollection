import path from "path";
import { extractAvatarData } from "./avatar";
import fs from "fs";
import { extractLightconeData } from "./lightcone";
import { extractDiceCombatData } from "./quest/dicecombat";
import { extractGridFightData } from "./quest/gridfight";
import { extractDictData } from "./dict";
import { extractStatusData } from "./status";
import { extractItemsData } from "./item";
import { generateDbTextmap, extractTextJoinData } from "./textmap";
import { extractNouns, extractBookData } from "./databank";
import { extractMissionData } from "./mission";
import { extractRogueData } from "./rogue";
import { extractRogueTournData } from "./rogue/tourn";
import { extractMonsterData } from "./monster";
import { extractChallengeData } from "./challenge";
import TextMap from "../text";
import { extractRelicData } from "./relic";
import { extractTarotWikiData } from "./mission/tarotwiki";
import { extractScenarioData } from "./scenario";
import { IMetadataEntity } from "@game/common/IEntity";
import { HsrDictItem } from "@game/games/hsr/HsrItem";
import { discoverHsrTextMapLangs } from "../textmapFiles";

const allLangs = !process.argv.includes("--simple");
// cwd不随当前文件的位置影响
const cwd = process.cwd();

const dataDir = path.join(cwd, "./data");
if (!fs.existsSync(dataDir)) {
  console.error("data directory not found");
  process.exit(1);
}

const excelOutputDir = path.join(dataDir, "ExcelOutput");
const textMapDir = path.join(dataDir, "TextMap");

const outputRootDir = path.join(cwd, "output");
const textMapOutDir = path.join(cwd, "textmap_out");
fs.mkdirSync(textMapOutDir, { recursive: true });

const textmaps = fs
  .readdirSync(textMapDir, { withFileTypes: true })
  .filter(dirent => dirent.isFile());

const langs: string[] = [];

if (allLangs) {
  const discovered = discoverHsrTextMapLangs(textmaps.map(f => f.name));
  langs.push(...discovered.langs);
  Object.assign(TextMap.textmapPartMap, discovered.textmapPartMap);
} else {
  // 只处理常用的几个
  const commonLangs = ["CHS", "EN", "JP"];
  langs.push(...commonLangs);
  for (const lang of commonLangs) {
    TextMap.textmapPartMap[lang] = [lang];
  }
}

console.log("读取到的语言列表：", TextMap.textmapPartMap);

const allDict = {
  elements: [],
  paths: [],
  properties: [],
  relicTypes: [],
  statuses: [],
} as Record<string, HsrDictItem<IMetadataEntity>[]>;

for (const lang of langs) {
  console.log(`—— ${lang} ——`);

  const dicts: Record<keyof typeof allDict, IMetadataEntity[]> = {} as any;

  console.log("开始提取基础字典...");
  const baseDicts = await extractDictData(lang, outputRootDir);
  Object.assign(dicts, baseDicts);

  console.log("开始提取异常抗性字典...");
  const statusDicts = await extractStatusData(lang, outputRootDir);
  Object.assign(dicts, statusDicts);

  console.log("开始提取物品数据...");
  await extractItemsData(lang, outputRootDir);

  console.log("开始提取角色和忆灵数据...");
  await extractAvatarData(lang, outputRootDir);

  console.log("开始提取光锥数据...");
  await extractLightconeData(lang, outputRootDir);

  console.log("开始提取遗器数据...");
  const relicData = await extractRelicData(lang, outputRootDir);
  Object.assign(dicts, relicData);

  console.log("开始提取智库数据...");
  await extractNouns(lang, outputRootDir);

  console.log("开始提取阅读物数据...");
  await extractBookData(lang, outputRootDir);

  console.log("开始提取银河战力党数据...");
  await extractDiceCombatData(lang, outputRootDir);

  console.log("开始提取货币战争数据...");
  await extractGridFightData(lang, outputRootDir);

  console.log("开始提取主线任务数据...");
  await extractMissionData(lang, outputRootDir);

  console.log("开始提取剧情索引数据...");
  await extractScenarioData(lang, outputRootDir);

  console.log("开始提取模拟宇宙数据...");
  await extractRogueData(lang, outputRootDir);

  console.log("开始提取差分宇宙数据...");
  await extractRogueTournData(lang, outputRootDir);

  console.log("开始提取敌人数据...");
  await extractMonsterData(lang, outputRootDir);

  console.log("开始提取逐光捡金数据...");
  await extractChallengeData(lang, outputRootDir);

  console.log("开始提取如我所书数据...");
  await extractTarotWikiData(lang, outputRootDir);

  console.log("开始提取动态文本数据...");
  await extractTextJoinData(lang, outputRootDir);

  console.log("=====\n处理字典合并");
  for (const type of Object.keys(allDict) as (keyof typeof allDict)[]) {
    const dict = dicts[type];
    for (let i = 0; i < dict.length; i++) {
      const d = dict[i];
      allDict[type][i] ||= d as any;
      allDict[type][i] = Object.assign(allDict[type][i], {
        [`name${lang}`]: d.name,
      });
    }
  }

  console.log("写入打标后的本地化文本...");
  await generateDbTextmap(lang, textMapOutDir);
}

console.log("=====\n写入多语言聚合字典...");
fs.writeFileSync(path.join(outputRootDir, "elements.json"), JSON.stringify(allDict.elements, null, 2));
fs.writeFileSync(
  path.join(outputRootDir, "paths.json"),
  JSON.stringify(
    allDict.paths.filter(p => !!p.id),
    null,
    2,
  ),
);
fs.writeFileSync(path.join(outputRootDir, "properties.json"), JSON.stringify(allDict.properties, null, 2));
fs.writeFileSync(path.join(outputRootDir, "relictypes.json"), JSON.stringify(allDict.relicTypes, null, 2));
fs.writeFileSync(path.join(outputRootDir, "statuses.json"), JSON.stringify(allDict.statuses, null, 2));
