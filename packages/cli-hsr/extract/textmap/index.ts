import path from "path";
import TextMap from "../../text";
import fs from "fs/promises";
import JSONBig from "json-bigint";
import { finalizeDbTextRows } from "hoyo-cli-common";
import { TextJoinExtractor } from "./TextJoinExtractor";

export async function generateDbTextmap(lang: string, textmapPath: string) {
  const data = finalizeDbTextRows(TextMap.getMapWithTagInfo(lang));
  await fs.writeFile(path.join(textmapPath, lang + ".json"), JSON.stringify(data));
}

export async function extractTextJoinData(lang: string, rootPath: string) {
  const outpath = path.join(rootPath, `./${lang}/`);
  await fs.mkdir(outpath, { recursive: true });

  const extractor = new TextJoinExtractor(lang);
  await extractor.init();

  const textJoins = extractor.extract();
  await fs.writeFile(
    path.join(outpath, "textjoin.json"),
    JSONBig.stringify(textJoins, null, 2),
  );
}
