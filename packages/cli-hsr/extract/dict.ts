import path from "path";
import fs from "fs/promises";
import JSONBig from "json-bigint";

import TextMap from "../text";
import { getUrl } from "../url";

import { DamageType } from "schema/DamageType";
import { AvatarBaseType } from "schema/AvatarBaseType";
import { AvatarPropertyConfig } from "schema/AvatarPropertyConfig";
import { HardLevelGroup } from "schema/HardLevelGroup";
import { EliteGroup } from "schema/EliteGroup";
import { HsrHardLevelGroupDict, HsrEliteGroupDict } from "@game/games/hsr/HsrBattleGroup";
export async function extractDictData(lang: string, rootPath: string) {

  const outpath = path.join(rootPath, `./${lang}/`);
  await fs.mkdir(outpath, { recursive: true });

  // 战斗分组字典挂在 monster 目录下（内容语言无关）
  const monsterOutPath = path.join(rootPath, `./${lang}/monster`);
  await fs.mkdir(monsterOutPath, { recursive: true });

  await TextMap.loadMap(lang);


  // 元素
  const json1 = await fs.readFile(`./data/ExcelOutput/DamageType.json`, "utf-8");
  const damageTypes: DamageType[] = JSONBig.parse(json1);
  const elements = damageTypes.map(item => {
    return {
      id: item.ID,
      name: TextMap.getText(lang, item.DamageTypeName.Hash),
      desc: TextMap.getText(lang, item.DamageTypeIntro.Hash),
      color: item.Color,
      lightColor: item.LightColor,
      icon: `https://cdn2.dicloud.work/static/mihoyo-tools/hsr/icon/element/${item.ID}.png`,
    }
  });
  await fs.writeFile(path.join(outpath, "elements.json"), JSONBig.stringify(elements, null, 2));

  // 命途
  const json2 = await fs.readFile(`./data/ExcelOutput/AvatarBaseType.json`, "utf-8");
  const avatarBaseTypes: AvatarBaseType[] = JSONBig.parse(json2);
  const paths = avatarBaseTypes.map(item => {
    return {
      id: item.ID,
      name: TextMap.getText(lang, item.BaseTypeText.Hash),
      desc: TextMap.getText(lang, item.BaseTypeDesc.Hash),
      icon: `https://cdn2.dicloud.work/static/mihoyo-tools/hsr/icon/path/${item.ID}.png`,
    }
  });
  await fs.writeFile(path.join(outpath, "paths.json"), JSONBig.stringify(paths, null, 2));


  // 属性
  const json3 = await fs.readFile(`./data/ExcelOutput/AvatarPropertyConfig.json`, "utf-8");
  const avatarPropertyConfigs: AvatarPropertyConfig[] = JSONBig.parse(json3);
  const properties = avatarPropertyConfigs.map(item => {
    const fileName = /\/([A-Za-z0-9_]+\.png)$/.exec(item.IconPath)?.[1];
    return {
      id: item.PropertyType,
      name: TextMap.getText(lang, item.PropertyName?.Hash),
      nameUp: TextMap.getText(lang, item.PropertyNameSkillTree?.Hash),
      icon: fileName ? `https://cdn2.dicloud.work/static/mihoyo-tools/hsr/icon/property/${fileName}` : "",
      visible: item.IsDisplay || false,
      order: item.Order || 0,
      group: item.PropertyClassify || 0,
      instructionId: item.PropertyInstructionID,
      isPercent: isPercent(item.PropertyType),
    }
  });
  await fs.writeFile(path.join(outpath, "properties.json"), JSONBig.stringify(properties, null, 2));


  // 敌人等级曲线（语言无关, 语义对齐 abyss-challenge-extractor-plan.md §5）
  const json4 = await fs.readFile(`./data/ExcelOutput/HardLevelGroup.json`, "utf-8");
  const hardLevelGroups: HardLevelGroup[] = JSONBig.parse(json4);
  const hardLevelGroupDict: HsrHardLevelGroupDict = {};
  for (const item of hardLevelGroups) {
    const group = hardLevelGroupDict[item.HardLevelGroup] ||= {
      minLevel: item.Level,
      maxLevel: item.Level,
      levels: {},
    };
    group.minLevel = Math.min(group.minLevel, item.Level);
    group.maxLevel = Math.max(group.maxLevel, item.Level);
    group.levels[item.Level] = {
      attackRatio: item.AttackRatio?.Value ?? 1,
      defenceRatio: item.DefenceRatio?.Value ?? 1,
      hpRatio: item.HPRatio?.Value ?? 1,
      speedRatio: item.SpeedRatio?.Value ?? 1,
      stanceRatio: item.StanceRatio?.Value ?? 1,
      statusProbability: item.StatusProbability?.Value,
      statusResistance: item.StatusResistance?.Value,
      combatPowerList: item.CombatPowerList?.map(v => v.Value ?? 0) ?? [],
    };
  }
  await fs.writeFile(path.join(monsterOutPath, "hardLevelGroup.json"), JSONBig.stringify(hardLevelGroupDict, null, 2));

  // 精英战斗组（语言无关）
  const json5 = await fs.readFile(`./data/ExcelOutput/EliteGroup.json`, "utf-8");
  const eliteGroups: EliteGroup[] = JSONBig.parse(json5);
  const eliteGroupDict: HsrEliteGroupDict = {};
  for (const item of eliteGroups) {
    eliteGroupDict[item.EliteGroup] = {
      attackRatio: item.AttackRatio?.Value ?? 1,
      defenceRatio: item.DefenceRatio?.Value ?? 1,
      hpRatio: item.HPRatio?.Value ?? 1,
      speedRatio: item.SpeedRatio?.Value ?? 1,
      stanceRatio: item.StanceRatio?.Value ?? 1,
    };
  }
  await fs.writeFile(path.join(monsterOutPath, "eliteGroup.json"), JSONBig.stringify(eliteGroupDict, null, 2));



  return {
    elements,
    paths,
    properties,
  }
}

function isPercent(key: string) {
  return key.includes("Ratio") || 
    key.includes("Resistance") || 
    key.includes("CriticalChance") || 
    key.includes("CriticalDamage") ||
    key.includes("StatusProbability");
}
