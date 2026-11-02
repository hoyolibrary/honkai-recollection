import path from "path";
import fs from "fs/promises";
import JSONBig from "json-bigint";

import { RelicExtractor } from "./RelicExtractor";

export async function extractRelicData(lang: string, rootPath: string) {
  const outpath = path.join(rootPath, `./${lang}/relic`);
  await fs.mkdir(outpath, { recursive: true });

  const extractor = new RelicExtractor(lang);

  console.log("加载遗器关联数据");
  await extractor.init();

  const types = extractor.getRelicTypes();
  await fs.writeFile(path.join(outpath, "types.json"), JSONBig.stringify(types, null, 2));

  const sets = extractor.getRelicSets();
  await fs.writeFile(path.join(outpath, "sets.json"), JSONBig.stringify(sets, null, 2));

  const relics = extractor.getRelics();
  await fs.writeFile(path.join(outpath, "index.json"), JSONBig.stringify(relics, null, 2));

  return {
    relicTypes: types,
  };
}
