import fs from "fs/promises";
import JSONBig from "json-bigint";

import path from "path";

import _ from "lodash";
import { DiceCombatExtractor } from "./DiceCombatExtractor";
import { HsrDiceAvatar } from "@game/games/hsr/quest/dicecombat";

export async function extractDiceCombatData(lang: string, rootPath: string) {

  const outpath = path.join(rootPath, `./${lang}/dicecombat`);
  await fs.mkdir(outpath, { recursive: true });


  let diceavatars: HsrDiceAvatar[] = [];
  const extractor = new DiceCombatExtractor(lang);

  console.log("加载卡牌关联数据 ");
  await extractor.init();

  diceavatars = extractor.getDiceAvatarList();
  extractor.fillAllSkillData();


  console.log("写入完整卡牌列表数据...");
  diceavatars = _.sortBy(diceavatars, a => a.id);
  await fs.writeFile(path.join(outpath, "avatars.json"), JSONBig.stringify(diceavatars, null, 2));

  const cardPacks = extractor.getCardPacks();
  await fs.writeFile(path.join(outpath, "cardpacks.json"), JSONBig.stringify(cardPacks, null, 2));
  
}
