import fs from "fs/promises";
import JSONBig from "json-bigint";

import path from "path";
import _ from "lodash";
import { MonsterExtractor } from "./MonsterExtractor";
import { HsrMonsterTemplate } from "@game/games/hsr/HsrMonster";
import { forEachAsync } from "hoyo-cli-common";

export async function extractMonsterData(lang: string, rootPath: string) {
  const outpath = path.join(rootPath, `./${lang}/monster`);
  await fs.mkdir(outpath, { recursive: true });

  const extractor = new MonsterExtractor(lang);

  console.log("加载敌人数据");
  await extractor.init();

  console.log("写入敌人列表数据...");
  extractor.getMonsterList();
  extractor.fillMonsterData();

  console.log("生成敌人模板数据...");
  const templates: HsrMonsterTemplate[] = extractor.getTemplateList();

  const result = await forEachAsync(
    templates,
    async (template, _, signal) => {
      await fs.writeFile(
        path.join(outpath, template.id + ".json"),
        JSONBig.stringify(template, null, 2),
        { signal },
      );
    },
    {
      concurrency: 32,
      stopOnError: false,
    },
  );

  if (result.errors.length > 0) {
    console.warn("存在敌人模板数据写入失败:", result.errors);
  }

  console.log("写入敌人模板索引数据...");
  const simpleTemplates = templates.map(t => _.omit(t, ["monsters"]));
  await fs.writeFile(path.join(outpath, "index.json"), JSONBig.stringify(simpleTemplates, null, 2));
}
