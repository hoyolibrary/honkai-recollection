import fs from "fs/promises";
import JSONBig from "json-bigint";

import path from "path";


import _ from "lodash";
import { RogueTournExtractor } from "./RogueTournExtractor";
import { HsrRogueMiracle } from "@game/games/hsr/rogue/tourn";
import { HsrRoguePersona, HsrRoguePersonaGift } from "@game/games/hsr/rogue/tourn3";
import type { HsrRogueTournEvent } from "@game/games/hsr/rogue/tourn-event";

export async function extractRogueTournData(lang: string, rootPath: string) {
  const outpath = path.join(rootPath, `./${lang}/rogue/tourn`);
  await fs.mkdir(outpath, { recursive: true });

  const extractor = new RogueTournExtractor(lang);

  console.log("加载差分宇宙关联数据");
  await extractor.init();

  const seasons = await extractor.getRogueTournSeasons();
  await fs.writeFile(path.join(outpath, "index.json"), JSONBig.stringify(seasons, null, 2));

  console.log("写入差分宇宙泰坦...");
  let titans = extractor.getTitanList();
  await fs.writeFile(path.join(outpath, "titans.json"), JSONBig.stringify(titans, null, 2));

  console.log("写入差分宇宙房间类型...");
  let roomcomptypes = extractor.getPersonaRoomCompTypes();
  await fs.writeFile(path.join(outpath, "roomcomptypes.json"), JSONBig.stringify(roomcomptypes, null, 2));

  console.log("写入差分宇宙信标...");
  let roomattributes = extractor.getPersonaRoomAttributes();
  await fs.writeFile(path.join(outpath, "roomattributes.json"), JSONBig.stringify(roomattributes, null, 2));

  console.log("写入差分宇宙面具...");
  let personas: HsrRoguePersona[] = extractor.getRoguePersonaList();
  await fs.writeFile(path.join(outpath, "personas.json"), JSONBig.stringify(personas, null, 2));

  console.log("写入差分宇宙面具奇迹...");
  let personaGifts: HsrRoguePersonaGift[] = extractor.getRoguePersonaGiftList();
  await fs.writeFile(path.join(outpath, "personagifts.json"), JSONBig.stringify(personaGifts, null, 2));

  console.log("写入差分宇宙奇物...");
  let miracles: HsrRogueMiracle[] = extractor.getMiracleList();
  await fs.writeFile(path.join(outpath, "miracles.json"), JSONBig.stringify(miracles, null, 2));

  console.log("写入差分宇宙事件入口...");
  const events: HsrRogueTournEvent[] = extractor.getEventList();
  const eventOutpath = path.join(outpath, "events");
  await fs.mkdir(eventOutpath, { recursive: true });
  await fs.writeFile(path.join(eventOutpath, "index.json"), JSONBig.stringify(events, null, 2));

  return events;
}
