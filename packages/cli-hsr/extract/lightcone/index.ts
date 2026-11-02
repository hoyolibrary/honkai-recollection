import fs from "fs/promises";
import JSONBig from "json-bigint";

import path from "path";

import _ from "lodash";
import { LightconeExtractor } from "./LightconeExtractor";
import { HsrLightcone } from "@game/games/hsr/HsrLightcone";

export async function extractLightconeData(lang: string, rootPath: string) {

  const outpath = path.join(rootPath, `./${lang}/lightcones`);
  await fs.mkdir(outpath, { recursive: true });


  let lightcones: HsrLightcone[] = [];
  const extractor = new LightconeExtractor(lang);

  console.log("加载光锥关联数据 ");
  await extractor.init();

  lightcones = extractor.getLightconeList() as any;
  extractor.fillAllLightconeData();


  console.log("写入完整光锥列表数据...");
  lightcones = _.sortBy(lightcones, a => a.id);
  await fs.writeFile(path.join(outpath, "index.json"), JSONBig.stringify(lightcones, null, 2));
  
}
