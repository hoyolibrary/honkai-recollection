import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import JSONBig from "json-bigint";
import TextMap from "../text";
import { discoverHsrTextMapLangs } from "../textmapFiles";
import { extractRogueTournData } from "../extract/rogue/tourn";
import { RogueTournExtractor } from "../extract/rogue/tourn/RogueTournExtractor";
import type { RogueTournHandBookEvent } from "../schema/RogueTournHandBookEvent";
import type { RogueTournNPC } from "../schema/RogueTournNPC";
import type { HsrRogueTournEvent } from "@game/games/hsr/rogue/tourn-event";

const discovered = discoverHsrTextMapLangs(await fs.readdir("./data/TextMap"));
Object.assign(TextMap.textmapPartMap, discovered.textmapPartMap);
const source: RogueTournHandBookEvent[] = JSONBig.parse(
  await fs.readFile("./data/ExcelOutput/RogueTournHandBookEvent.json", "utf8"),
);
const npcs: RogueTournNPC[] = JSONBig.parse(
  await fs.readFile("./data/ExcelOutput/RogueTournNPC.json", "utf8"),
);
const npcById = new Map(npcs.map(row => [row.RogueNPCID, row]));
const sorted = [...source].sort(
  (a, b) => a.Priority - b.Priority || a.EventHandbookID - b.EventHandbookID,
);
const output = path.resolve(process.argv[2] ?? "output");
let structure: string | undefined;
for (const lang of discovered.langs) {
  const events = await extractRogueTournData(lang, output);
  const saved: HsrRogueTournEvent[] = JSONBig.parse(
    await fs.readFile(path.join(output, lang, "rogue/tourn/events/index.json"), "utf8"),
  );
  assert.deepEqual(saved, JSONBig.parse(JSONBig.stringify(events)));
  assert.equal(events.length, source.length);
  assert.deepEqual(
    events.map(event => event.id),
    sorted.map(row => row.EventHandbookID),
  );
  for (const [i, event] of events.entries()) {
    const row = sorted[i];
    assert.ok(event.name, `${lang}/${event.id}: name`);
    assert.ok(event.typeName, `${lang}/${event.id}: type`);
    assert.ok(event.unlockDesc, `${lang}/${event.id}: unlock`);
    assert.match(event.icon ?? "", /^https:\/\//);
    assert.equal(event.isUsed, row.IsUsed);
    assert.deepEqual(
      event.npcEntries,
      row.UnlockNPCProgressIDList.map(progress => ({
        id: progress.FDOELDMEBPE,
        npcJsonPath: npcById.get(progress.FDOELDMEBPE)?.NPCJsonPath,
      })),
    );
    assert.ok(
      event.npcEntries.every(entry => entry.npcJsonPath),
      `${event.id}: missing NPC`,
    );
  }
  const common = JSON.stringify(events.map(({ name, typeName, unlockDesc, ...event }) => event));
  if (structure) assert.equal(common, structure, `${lang}: language-independent references differ`);
  else structure = common;
  const jem = events.find(event => event.id === 5)!;
  assert.deepEqual(
    jem.npcEntries.map(entry => entry.id),
    [410301, 610301, 710301],
  );
  if (lang === "CHS") {
    assert.equal(jem.name, "杰姆·哈克与杰姆·哈尔");
    assert.equal(jem.typeName, "事件");
    assert.equal(jem.unlockDesc, "尚未遭遇该事件…");
    assert.equal(
      jem.npcEntries[0].npcJsonPath,
      "Config/Level/Rogue/RogueNPC/RogueNPC_230/RogueNPC410301.json",
    );
    assert.equal(
      jem.npcEntries[2].npcJsonPath,
      "Config/Level/Rogue/RogueNPC/RogueNPC_410/RogueNPC710301.json",
    );
  }
  console.log(
    `${lang}: ${events.length} events, ${events.reduce((sum, event) => sum + event.npcEntries.length, 0)} NPC references`,
  );
}

// 退化数据不能让图鉴条目或关联 ID 静默丢失；不猜造 Config 路径。
const extractor = new RogueTournExtractor("CHS");
await extractor.init();
const row = extractor.tournHandbookEvents[0];
const originalUsed = row.IsUsed;
row.IsUsed = false;
row.UnlockNPCProgressIDList.push({ FDOELDMEBPE: -1 });
extractor.rogueImages = [];
extractor.tournContentDisplays = [];
const incomplete = extractor.getEventList().find(event => event.id === row.EventHandbookID)!;
assert.equal(incomplete.isUsed, false);
assert.equal(incomplete.icon, undefined);
assert.equal(incomplete.typeName, undefined);
assert.equal(incomplete.unlockDesc, undefined);
assert.equal(incomplete.npcEntries.at(-1)?.id, -1);
assert.equal(incomplete.npcEntries.at(-1)?.npcJsonPath, undefined);
row.IsUsed = originalUsed;
console.log(
  `Passed: ${discovered.langs.length} languages, exact entry joins, multi-version references and incomplete-data preservation.`,
);
