import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { afterEach, mock, test } from "node:test";
import TextMap from "../text";
import { getGridFightPropertyDictionary, mergeGridFightPropertyTranslations, isGridFightPercentProperty, type GridFightPropertyTranslations } from "../extract/quest/gridfight/properties";

afterEach(() => mock.restoreAll());

test("property tables merge by key while preserving normal and text icons", async () => {
  let specialKey = "Special";
  mock.method(fs, "readFile", async (file: string) => JSON.stringify(file.includes("SpecialProperty")
    ? [{ VariableName: specialKey, Name: { Hash: 2 }, IconPath: "SpriteOutput/GridFight/Normal.png", MiniIconPath: "SpriteOutput/GridFight/Text.png" }]
    : [{ PropertyType: "Normal", PropertyName: { Hash: 1 }, PanelPropertyName: { Hash: 3 }, IsDisplay: true, Order: 5 }]));
  mock.method(TextMap, "loadMap", async () => {});
  mock.method(TextMap, "getText", (_lang: string, hash: unknown) => hash ? `name${hash}` : "");
  const rows = await getGridFightPropertyDictionary("CHS");
  assert.deepEqual(rows.map(row => row.id), ["Normal", "Special"]);
  assert.equal(rows[0].panelName, "name3");
  assert.equal(rows[0].visible, true);
  assert.equal(rows[1].name, "name2");
  assert.ok(rows[1].icon?.endsWith("/Normal.png"));
  assert.ok(rows[1].miniIcon?.endsWith("/Text.png"));
  specialKey = "Normal";
  await assert.rejects(getGridFightPropertyDictionary("CHS"), /重复属性键/);
});

test("multilingual aggregation aligns shuffled and partial dictionaries by id", () => {
  const target = new Map<string, GridFightPropertyTranslations>();
  const first = [{ id: "A", name: "甲", visible: true, order: 1, isPercent: false }, { id: "B", name: "乙", visible: false, order: 2, isPercent: false }];
  mergeGridFightPropertyTranslations(target, first, "CHS");
  mergeGridFightPropertyTranslations(target, [{ ...first[1], name: "Bee" }, { ...first[0], name: "Ay" }], "EN");
  mergeGridFightPropertyTranslations(target, [{ ...first[1], name: "ベー" }], "JP");
  assert.equal(target.size, 2);
  assert.equal(target.get("A")?.nameEN, "Ay");
  assert.equal(target.get("B")?.nameCHS, "乙");
  assert.equal(target.get("B")?.nameJP, "ベー");
  assert.equal(target.get("A")?.nameJP, undefined);
});

test("exported format covers ratios, luck and combo while keeping base power and counts numeric", () => {
  for (const key of ["ExtraFrontPowerAddedRatio1", "ExtraHealAddedRatio", "ExtraLuckChance", "ExtraLuckChanceBase", "ExtraLuckDamage", "ExtraTotalLuckDamage", "ExtraComboRate", "ExtraAllDamageReduce", "ExtraTotalAllDamageReduce"]) assert.equal(isGridFightPercentProperty(key), true, key);
  for (const key of ["ExtraFrontPowerBase", "ExtraBackPowerBase", "ExtraHealBase", "ExtraShieldBase", "ExtraHeight", "ExtraSummonPower", "ExtraEnergyBar", "ExtraInitSP", "ExtraQuantumResonance"]) assert.equal(isGridFightPercentProperty(key), false, key);
});
