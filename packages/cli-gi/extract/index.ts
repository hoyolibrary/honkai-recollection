import path from "path";
import fs from "fs";
import TextMap from "../text";
import { discoverGiTextMapLangs } from "../textmapFiles";
import { generateAllGiTextSources } from "./textmap";

const allLangs = true;
// cwd 不随当前文件的位置影响
const cwd = process.cwd();

const dataDir = path.join(cwd, "./data");
if (!fs.existsSync(dataDir)) {
  console.error("data directory not found");
  console.error(
    "请将 AnimeGameData 的 ExcelBinOutput / Readable / Subtitle / TextMap 复制到 packages/cli-gi/data/",
  );
  process.exit(1);
}

const excelOutputDir = path.join(dataDir, "ExcelBinOutput");
const textMapDir = path.join(dataDir, "TextMap");

if (!fs.existsSync(excelOutputDir)) {
  console.error("data/ExcelBinOutput not found");
  process.exit(1);
}
if (!fs.existsSync(textMapDir)) {
  console.error("data/TextMap not found");
  process.exit(1);
}

const outputRootDir = path.join(cwd, "output");
const textMapOutDir = path.join(cwd, "textmap_out");
fs.mkdirSync(outputRootDir, { recursive: true });
fs.mkdirSync(textMapOutDir, { recursive: true });

const textmaps = fs
  .readdirSync(textMapDir, { withFileTypes: true })
  .filter(dirent => dirent.isFile());

const langs: string[] = [];

if (allLangs) {
  const discovered = discoverGiTextMapLangs(textmaps.map(f => f.name));
  langs.push(...discovered.langs);
  Object.assign(TextMap.textmapPartMap, discovered.textmapPartMap);
} else {
  const commonLangs = ["CHS", "EN", "JP"];
  langs.push(...commonLangs);
  for (const lang of commonLangs) {
    TextMap.textmapPartMap[lang] = [lang];
  }
}

console.log("读取到的语言列表：", TextMap.textmapPartMap);
console.log("语言数：", langs.length);

for (const lang of langs) {
  console.log(`—— ${lang} ——`);
  console.log("导出三种文本源到 textmap_out/{textmap|readable|subtitle}/ ...");
  await generateAllGiTextSources(lang, textMapOutDir, dataDir);
}

console.log("完成。输出目录：", textMapOutDir);
