import fs from "fs/promises";
import JSONBig from "json-bigint";
import { HsrLightcone, HsrLightconeSimple, HsrLightconeSkill } from "@game/games/hsr/HsrLightcone";
import TextMap from "../../text";
import { getUrl } from "../../url";
import _ from "lodash";

import { EquipmentConfig } from "schema/EquipmentConfig";
import { EquipmentSkillConfig } from "schema/EquipmentSkillConfig";
import { mutateGroupJoin } from "hoyo-cli-common";
import { ItemConfigEquipment } from "schema/EquipmentConfig";
import { EquipmentPromotionConfig } from "schema/EquipmentPromotionConfig";
import { HsrAvatarPromotion } from "@game/games/hsr/HsrGameAvatar";

export class LightconeExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

 
  lightcones: EquipmentConfig[] = [];
  lightconeItems: ItemConfigEquipment[] = [];
  lightconePromotions: EquipmentPromotionConfig[] = [];

  lightconeSkills: EquipmentSkillConfig[] = [];
  // servantSkillLinks: AvatarServantSkillLink[] = [];

  lightconeMap: Record<number, HsrLightcone> = {};
  async init() {
   
    // 光锥表
    const json = await fs.readFile(`./data/ExcelOutput/EquipmentConfig.json`, "utf-8");
    this.lightcones = JSONBig.parse(json);

    // 光锥物品基本信息
    const json1 = await fs.readFile(`./data/ExcelOutput/ItemConfigEquipment.json`, "utf-8");
    this.lightconeItems = JSONBig.parse(json1);

    // 技能子表
    const json2 = await fs.readFile(`./data/ExcelOutput/EquipmentSkillConfig.json`, "utf-8");
    this.lightconeSkills = JSONBig.parse(json2);

    // 数值加点子表
    const json3 = await fs.readFile(`./data/ExcelOutput/EquipmentPromotionConfig.json`, "utf-8");
    this.lightconePromotions = JSONBig.parse(json3);

   
    await TextMap.loadMap(this.lang);
  }


  getLightconeList() {
    const items = this.lightconeItems.reduce<Record<number, ItemConfigEquipment>>((acc, cur) => {
      acc[cur.ID] = cur;
      return acc;
    }, {});

    const data = this.lightcones.map(d => {
      const item = items[d.EquipmentID] || {};

      const lightcone = {
        id: d.EquipmentID,
        code: d.EquipmentID + "",
        name: TextMap.getText(this.lang, d.EquipmentName.Hash),
        icon: getUrl(d.ThumbnailPath, "srtools"),
        portrait: getUrl(d.ImagePath, "srtools"),
        rarity: Number(d.Rarity.replace("CombatPowerLightconeRarity", "")),
        path: d.AvatarBaseType,
        desc: TextMap.getText(this.lang, item.ItemBGDesc?.Hash),
      } as HsrLightconeSimple;

      TextMap.setTagInfo(this.lang, d.EquipmentName?.Hash, {
        category: {
          lightcone: d.EquipmentID + "",
          type: "EquipmentConfig",
        },
        tags: ["lightcone", "item"]
      });
      TextMap.setTagInfo(this.lang, item.ItemBGDesc?.Hash, {
        category: {
          lightcone: d.EquipmentID + "",
          type: "ItemConfigEquipment",
        },
        tags: ["lightcone", "item"]
      });

      return lightcone;
    });

    this.lightconeMap = data.reduce<Record<number, HsrLightcone>>((map, a) => {
      map[a.id] = a as HsrLightcone;
      return map;
    }, {});
    return data;
  }

  fillAllLightconeData() { 
    this.fillAllPromotionMap();

    const skillMap = _.groupBy(this.lightconeSkills, "SkillID");

    for (const item of this.lightcones) {
      const lightcone = this.lightconeMap[item.EquipmentID];
      if (!lightcone) continue;

      const skills = skillMap[item.SkillID] || [];

      lightcone.skill = this.getSkillInfo(skills, item.EquipmentID);
      lightcone.promotions = this.getPromotionInfo(item);
    }
  }


  getSkillInfo(data: EquipmentSkillConfig[], equipmentId: number) {
    const levels = _.sortBy(data, x => x.Level).map(x => {
      return {
        level: x.Level,
        params: x.ParamList.map(p => p.Value),
      };
    });

    const d = data[0];
    const skill = {
      id: d.SkillID,
      name: TextMap.getText(this.lang, d.SkillName?.Hash),
      desc: TextMap.getText(this.lang, d.SkillDesc?.Hash),
      maxLevel: _.max(levels.map(x => x.level)),
      levels: levels,
    } as HsrLightconeSkill;

    TextMap.setTagInfo(this.lang, d.SkillName?.Hash, {
      category: {
        lightcone: equipmentId + "",
        type: "EquipmentSkillConfig",
      },
      tags: ["skill"]
    });
    TextMap.setTagInfo(this.lang, d.SkillDesc?.Hash, {
      category: {
        lightcone: equipmentId + "",
        type: "EquipmentSkillConfig",
      },
      tags: ["skill"]
    });
    return skill;
  }

  promotionMap: Record<number, EquipmentPromotionConfig[]> = {};
  private fillAllPromotionMap() {
    const map = _.groupBy(this.lightconePromotions, x => x.EquipmentID);
    for (const a of this.lightcones) {
      map[a.EquipmentID] ||= [];
      map[a.EquipmentID] = _.sortBy(map[a.EquipmentID], x => x.Promotion || 0);
    }
    this.promotionMap = map;
  }

  getPromotionInfo(item: EquipmentConfig) {
    const promotions = this.promotionMap[item.EquipmentID];
    return promotions.map(p => ({
      promotion: p.Promotion || 0,
      maxLevel: p.MaxLevel,
      properties: {
        BaseAttack: {
          base: p.BaseAttack.Value,
          step: p.BaseAttackAdd.Value,
        },
        BaseDefence: {
          base: p.BaseDefence.Value,
          step: p.BaseDefenceAdd.Value,
        },
        BaseHP: {
          base: p.BaseHP.Value,
          step: p.BaseHPAdd.Value,
        },
      },
      cost: p.PromotionCostList.map(x => ({
        itemId: x.ItemID,
        num: x.ItemNum,
      }))
    }) as HsrAvatarPromotion)
  }
  
}
