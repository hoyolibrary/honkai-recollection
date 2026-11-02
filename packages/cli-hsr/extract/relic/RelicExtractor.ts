import fs from "fs/promises";
import JSONBig from "json-bigint";
import _ from "lodash";

import TextMap from "../../text";
import { getUrl } from "../../url";
import {
  HsrRelic,
  HsrRelicInfo,
  HsrRelicSet,
  HsrRelicSetBonus,
  HsrRelicType,
} from "@game/games/hsr/HsrRelic";
import { RelicBaseType } from "schema/RelicBaseType";
import { RelicConfig } from "schema/RelicConfig";
import { RelicDataInfo } from "schema/RelicDataInfo";
import { RelicSetConfig } from "schema/RelicSetConfig";
import { RelicSetSkillConfig } from "schema/RelicSetSkillConfig";

export class RelicExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  relicBaseTypes: RelicBaseType[] = [];
  relicSetConfigs: RelicSetConfig[] = [];
  relicDataInfos: RelicDataInfo[] = [];
  relicConfigs: RelicConfig[] = [];
  relicSetSkillConfigs: RelicSetSkillConfig[] = [];

  async init() {
    // 遗器部位表（字典）
    const json1 = await fs.readFile(`./data/ExcelOutput/RelicBaseType.json`, "utf-8");
    this.relicBaseTypes = JSONBig.parse(json1);

    // 遗器套装表
    const json2 = await fs.readFile(`./data/ExcelOutput/RelicSetConfig.json`, "utf-8");
    this.relicSetConfigs = JSONBig.parse(json2);

    // 遗器基本信息表
    const json3 = await fs.readFile(`./data/ExcelOutput/RelicDataInfo.json`, "utf-8");
    this.relicDataInfos = JSONBig.parse(json3);

    // 遗器表
    const json4 = await fs.readFile(`./data/ExcelOutput/RelicConfig.json`, "utf-8");
    this.relicConfigs = JSONBig.parse(json4);

    // 遗器套装技能表
    const json5 = await fs.readFile(`./data/ExcelOutput/RelicSetSkillConfig.json`, "utf-8");
    this.relicSetSkillConfigs = JSONBig.parse(json5);

    await TextMap.loadMap(this.lang);
  }

  getRelicTypes(): HsrRelicType[] {
    const data = this.relicBaseTypes
      .filter(item => !!item.Type)
      .map(item => {
        const type: HsrRelicType = {
          id: item.Type!,
          code: item.Type!,
          name: TextMap.getText(this.lang, item.BaseTypeText?.Hash ?? null),
          icon: getUrl(item.BaseTypeIconPath, "dicloud") || "",
          validPropertyList: item.ValidPropertyList,
        };
        return type;
      });

    return _.sortBy(data, item => item.id);
  }

  getRelicInfoMap() {
    return this.relicDataInfos.reduce<Record<string, HsrRelicInfo>>((map, item) => {
      const id = `${item.SetID}_${item.Type}`;
      const relicInfo: HsrRelicInfo = {
        id,
        code: id,
        name: TextMap.getHashedText(this.lang, item.RelicName),
        icon: getUrl(item.ItemFigureIconPath, "srtools") || "",
        type: item.Type,
        desc: TextMap.getHashedText(this.lang, item.ItemBGDesc),
        storyTitle: TextMap.getHashedText(this.lang, item.BGStoryTitle),
        storyContent: TextMap.getHashedText(this.lang, item.BGStoryContent),
      };

      TextMap.setHashedTagInfo(this.lang, item.RelicName, {
        category: {
          relic: id,
          type: "RelicDataInfo",
        },
        tags: ["relic", "item"],
      });
      TextMap.setHashedTagInfo(this.lang, item.ItemBGDesc, {
        category: {
          relic: id,
          type: "RelicDataInfo",
        },
        tags: ["relic", "item"],
      });
      TextMap.setHashedTagInfo(this.lang, item.BGStoryTitle, {
        category: {
          relic: id,
          type: "RelicDataInfo",
        },
        tags: ["relic", "item"],
      });
      TextMap.setHashedTagInfo(this.lang, item.BGStoryContent, {
        category: {
          relic: id,
          type: "RelicDataInfo",
        },
        tags: ["relic", "item"],
      });

      map[id] = relicInfo;
      return map;
    }, {});
  }

  getRelicSetBonusMap() {
    const grouped = _.groupBy(this.relicSetSkillConfigs, item => item.SetID);
    return Object.entries(grouped).reduce<Record<number, HsrRelicSetBonus[]>>((map, [setId, list]) => {
      map[Number(setId)] = _.sortBy(list, item => item.RequireNum).map(item => ({
        requireNum: item.RequireNum,
        desc: TextMap.getHashedText(this.lang, item.SkillDesc),
        properties: item.PropertyList.map(prop => ({
          type: prop.FODBMMCKAEN,
          value: prop.MNDFOPKBHKP?.Value ?? null,
        })),
        abilityName: item.AbilityName,
        params: item.AbilityParamList.map(param => param.Value),
      }));
      return map;
    }, {});
  }

  getRelicSets() {
    const relicInfoMap = this.getRelicInfoMap();
    const relicSetBonusMap = this.getRelicSetBonusMap();
    const relicIdsBySet = _.groupBy(Object.keys(relicInfoMap), id => Number(id.split("_")[0]));

    const data = this.relicSetConfigs.map(item => {
      const relicIds = _.sortBy(relicIdsBySet[item.SetID] || []);
      const relics = relicIds.map(id => relicInfoMap[id]).filter(Boolean);
      const skillDescMap = _.keyBy(
        this.relicSetSkillConfigs.filter(x => x.SetID === item.SetID),
        x => x.RequireNum,
      );

      const set: HsrRelicSet = {
        id: item.SetID,
        code: item.SetID + "",
        name: TextMap.getText(this.lang, item.SetName?.Hash),
        icon: getUrl(item.SetIconFigurePath, "srtools") || "",
        rarity: 5,
        isPlanarSuit: item.IsPlanarSuit || false,
        setSkillList: item.SetSkillList,
        displayItemId: item.DisplayItemID,
        displayItemIdRarity4: item.DisplayItemIDRarity4,
        release: item.Release,
        releaseVersion: item.ReleaseVersion,
        relics,
        bonuses: relicSetBonusMap[item.SetID] || [],
      };

      TextMap.setTagInfo(this.lang, item.SetName?.Hash, {
        category: {
          relicSet: item.SetID + "",
          type: "RelicSetConfig",
        },
        tags: ["relic_set", "relic", "item"],
      });

      for (const bonus of set.bonuses || []) {
        const raw = skillDescMap[bonus.requireNum];
        if (!raw) continue;
        TextMap.setHashedTagInfo(this.lang, raw.SkillDesc, {
          category: {
            relicSet: item.SetID + "",
            type: "RelicSetSkillConfig",
          },
          tags: ["relic_set", "relic", "skill"],
        });
      }

      return set;
    });

    return _.sortBy(data, item => item.id);
  }

  getRelics(): HsrRelic[] {
    const relicInfoMap = this.getRelicInfoMap();

    const data = this.relicConfigs.map(item => {
      const code = `${item.SetID}_${item.Type}`;
      const info = relicInfoMap[code];

      const relic: HsrRelic = {
        id: item.ID,
        code,
        name: info?.name,
        icon: info?.icon || "",
        rarity: Number(item.Rarity?.replace('CombatPowerRelicRarity', '') || '0'),
        setId: item.SetID,
        type: item.Type,
        mainAffixGroup: item.MainAffixGroup,
        subAffixGroup: item.SubAffixGroup,
        maxLevel: item.MaxLevel,
        expType: item.ExpType,
        expProvide: item.ExpProvide,
        coinCost: item.CoinCost,
        mode: item.Mode,
        desc: info?.desc,
        text: info?.desc,
        storyTitle: info?.storyTitle,
        storyContent: info?.storyContent,
      };

      return relic;
    });

    return _.sortBy(data, item => item.id);
  }
}
