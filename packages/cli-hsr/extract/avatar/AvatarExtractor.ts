import fs from "fs/promises";
import JSONBig from "json-bigint";
import {
  HsrAvatarPromotion,
  HsrAvatarRank,
  HsrAvatarSkillTree,
  HsrGameAvatar,
  HsrGameAvatarEnhanceableInfo,
  HsrGameAvatarSkin,
} from "@game/games/hsr/HsrGameAvatar";
import TextMap from "../../text";
import { getUrl } from "../../url";
import _ from "lodash";
import { mutateGroupJoin, mutateGroupJoin2 } from "hoyo-cli-common";

import type { AvatarConfig } from "schema/AvatarConfig";
import type { AvatarSkillConfig, AvatarUltraSkillConfig, ElationSkill } from "schema/AvatarSkillConfig";
import type {
  AvatarConfigEnhanceableInfo,
  AvatarConfigEnhanced,
} from "schema/AvatarConfigEnhanced";
import type { AvatarRankConfig } from "schema/AvatarRankConfig";
import type { AvatarPromotionConfig } from "schema/AvatarPromotionConfig";
import type { AvatarServantConfig } from "schema/AvatarServantConfig";
import { ItemConfigAvatar } from "schema/AvatarConfig";
import { AvatarSkin, ItemConfigAvatarSkin } from "schema/AvatarSkin";
import { getRarity } from "extract/item";
import { AvatarSkillTreeConfig } from "schema/AvatarSkillTreeConfig";
import { mapAvatarSimple, mapAvatarSkillList } from "./avatarMap";

export class AvatarExtractor {
  private lang: string;
  private isCollaboration = false;
  constructor(lang: string, isCollaboration = false) {
    this.lang = lang;
    this.isCollaboration = isCollaboration;
  }

  avatarConfigs: AvatarConfig[] = [];
  avatarSkills: AvatarSkillConfig[] = [];
  avatarRanks: AvatarRankConfig[] = [];
  avatarPromotions: AvatarPromotionConfig[] = [];
  avatarSkillTrees: AvatarSkillTreeConfig[] = [];
  avatarUltraSkills: AvatarUltraSkillConfig[] = [];
  elationSkills: ElationSkill[] = [];
  avatarItems: ItemConfigAvatar[] = [];

  avatarSkins: AvatarSkin[] = [];
  avatarSkinsItems: ItemConfigAvatarSkin[] = [];

  avatarServants: AvatarServantConfig[] = [];

  avatarEnhanceds: AvatarConfigEnhanced[] = [];

  avatarMap: Record<number, HsrGameAvatar> = {};
  async init() {
    // 联动角色的表和普通的不放在一起
    const suffix = this.isCollaboration ? "LD" : "";


    // 角色主表
    const json = await fs.readFile(`./data/ExcelOutput/AvatarConfig${suffix}.json`, "utf-8");
    this.avatarConfigs = JSONBig.parse(json);

    // 角色物品基本信息
    const json1 = await fs.readFile(`./data/ExcelOutput/ItemConfigAvatar${suffix}.json`, "utf-8");
    this.avatarItems = JSONBig.parse(json1);

    // 技能子表
    const json2 = await fs.readFile(`./data/ExcelOutput/AvatarSkillConfig${suffix}.json`, "utf-8");
    this.avatarSkills = JSONBig.parse(json2);

    // 星魂子表
    const json3 = await fs.readFile(`./data/ExcelOutput/AvatarRankConfig${suffix}.json`, "utf-8");
    this.avatarRanks = JSONBig.parse(json3);

    // 数值加点子表
    const json4 = await fs.readFile(`./data/ExcelOutput/AvatarPromotionConfig${suffix}.json`, "utf-8");
    this.avatarPromotions = JSONBig.parse(json4);

    // 特殊能量终结技表
    const json5 = await fs.readFile(`./data/ExcelOutput/AvatarUltraSkillConfig.json`, "utf-8");
    this.avatarUltraSkills = JSONBig.parse(json5);

    // 行迹子表
    const json6 = await fs.readFile(`./data/ExcelOutput/AvatarSkillTreeConfig${suffix}.json`, "utf-8");
    this.avatarSkillTrees = JSONBig.parse(json6);

    // 角色皮肤表
    const json7 = await fs.readFile(`./data/ExcelOutput/AvatarSkin.json`, "utf-8");
    this.avatarSkins = JSONBig.parse(json7);
    // 角色皮肤物品表
    const json7_1 = await fs.readFile(`./data/ExcelOutput/ItemConfigAvatarSkin.json`, "utf-8");
    this.avatarSkinsItems = JSONBig.parse(json7_1);

    if (!this.isCollaboration) {
      // 记忆命途角色忆灵表
      const json10 = await fs.readFile(`./data/ExcelOutput/AvatarServantConfig.json`, "utf-8");
      this.avatarServants = JSONBig.parse(json10);

      // 欢愉命途欢愉技“参演编号”表
      const json11 = await fs.readFile(`./data/ExcelOutput/ElationSkill.json`, "utf-8");
      this.elationSkills = JSONBig.parse(json11);
    }


    // 角色加强关联表
    const json50 = await fs.readFile(`./data/ExcelOutput/AvatarConfigEnhanced.json`, "utf-8");
    this.avatarEnhanceds = JSONBig.parse(json50);



    await TextMap.loadMap(this.lang);
  }

  getAvatarList() {
    const items = this.avatarItems.reduce<Record<number, ItemConfigAvatar>>((acc, cur) => {
      acc[cur.ID] = cur;
      return acc;
    }, {});
    const data = this.avatarConfigs.map(d => {
      const item = items[d.AvatarID];
      return mapAvatarSimple(this.lang, d, item, {
        id: d.AvatarID,
        isCollaboration: this.isCollaboration,
      });
    });

    this.avatarMap = data.reduce<Record<number, HsrGameAvatar>>((map, a) => {
      map[a.id] = a as HsrGameAvatar;
      return map;
    }, {});
    return data;
  }

  fillAllAvatarData() {
    //#region 初始化数据表连接

    const [merged, enhanceMerged] = [this.avatarConfigs, this.avatarEnhanceds]
      .map(d =>
        mutateGroupJoin(d as AvatarConfigEnhanceableInfo[], {
          list: this.avatarSkills,
          key: "SkillID",
          bIdsKey: "SkillList",
          bListKey: "skills",
          aggregate(skills, x) {
            let id = x.AvatarID;
            let isEnhanced = false;
            if ((x as any).EnhancedID) {
              id = (x as AvatarConfigEnhanced).EnhancedID;
              isEnhanced = true;
            }
            return {
              id,
              isEnhanced,
            };
          },
        }),
      )
      .map(d =>
        mutateGroupJoin(d, {
          list: this.avatarRanks,
          key: "RankID",
          bIdsKey: "RankIDList",
          bListKey: "ranks",
        }),
      )
      .map(d =>
        mutateGroupJoin2(d, {
          list: this.avatarSkillTrees,
          key: "AvatarID",
          aIdKey: "AvatarID",
          bListKey: "skillTrees",
        }),
      );




    const enhanceMergedMap = enhanceMerged.reduce<Record<number, typeof enhanceMerged>>(
      (map, a) => {
        map[a.AvatarID] ||= [];
        map[a.AvatarID].push(a);
        return map;
      },
      {},
    );

    this.fillAllPromotionMap();
    this.fillServantIds();
    this.fillAllUltraSkillMap();
    this.fillAllElationSkillMap();
    this.fillAllSkinMap();

    //#endregion




    for (const item of merged) {
      const avatar = this.avatarMap[item.AvatarID];
      if (!avatar) continue;

      //#region 加强无关的信息

      const a = item as any as AvatarConfig;
      avatar.promotions = this.getPromotionInfo(a);

      avatar.servantId = (a as any).ServantID || null;
      avatar.isSpecialSp = this.ultraSkillMap[item.AvatarID] != null;


      avatar.skins = this.getSkinInfo(avatar);
      //#endregion


      //#region 涉及加强的信息

      avatar.versions = [];

      // 将角色原版信息和加强信息拼到一起
      const versionInfos = [item, ...(enhanceMergedMap[avatar.id] || [])];

      for (const version of versionInfos) {
        const skillInfo = this.getSkillInfo(version);
        const rankInfo = this.getRankInfo(version);
        const skillTreeInfo = this.getSkillTreeInfo(version);
        avatar.versions.push({
          id: version.id,
          isEnhanced: version.isEnhanced,
          maxSp: item.SPNeed?.Value ?? null,
          ...skillInfo,
          ...rankInfo,
          ...skillTreeInfo,
        });
      }
      //#endregion
    }
  }

  //#region 技能&行迹&星魂

  getSkillInfo(
    item: AvatarConfigEnhanceableInfo & {
      skills: AvatarSkillConfig[];
    },
  ): Pick<HsrGameAvatarEnhanceableInfo, "skills"> {
    const skills = mapAvatarSkillList(this.lang, item.skills, item.SkillList, {
      ownerId: item.AvatarID,
      configType: "AvatarSkillConfig",
    });

    for (const skill of skills) {
      if (skill.type == "ElationDamage") {
        skill.elationPriority = this.elationSkillMap[skill.id]?.PriorityValue;
      }
    }

    return { skills };
  }

  getRankInfo(
    item: AvatarConfigEnhanceableInfo & {
      ranks: AvatarRankConfig[];
    },
  ): Pick<HsrGameAvatarEnhanceableInfo, "ranks"> {
    const ranks = [];
    for (const d of item.ranks) {
      const rank = {
        id: d.RankID,
        name: TextMap.getHashedText(this.lang, d.Name),
        icon: getUrl(d.IconPath, "srtools"), // hakushin对星魂图标的处理有Bug，会缺失xxx_RankN.webp的文件
        // picture: `https://api.hakush.in/hsr/UI/rank/_dependencies/textures/${item.AvatarID}/${item.AvatarID}_Rank_${d.Rank}.webp`,
        picture: `https://cdn.neonteam.dev/neonteam/assets/ui/ui3d/rank/_dependencies/textures/${item.AvatarID}/${item.AvatarID}_Rank_${d.Rank}.webp`,
        desc: TextMap.getHashedText(this.lang, d.Desc),
        rank: d.Rank,
        params: d.Param.map(p => p.Value),
        code: undefined!,
      } as HsrAvatarRank;

      ranks.push(rank);

      TextMap.setHashedTagInfo(this.lang, d.Name, {
        category: {
          avatar: item.AvatarID + "",
          type: "AvatarRankConfig",
        },
        tags: ["rank"]
      });
    }

    return {
      ranks: _.sortBy(ranks, x => item.RankIDList.indexOf(x.id)),
    };
  }

  getSkillTreeInfo(
    item: AvatarConfigEnhanceableInfo & {
      skillTrees: AvatarSkillTreeConfig[];
    },
  ): Pick<HsrGameAvatarEnhanceableInfo, "skillTrees"> {
    const levelGroups = _.groupBy(item.skillTrees, x => x.PointID);
    const skillTrees = [];
    for (const levels of Object.values(levelGroups)) {
      const d = levels[0];

      const levelList = _.sortBy(levels, x => x.Level).map(x => {
        return {
          level: x.Level,
          params: x.ParamList.map(p => p.Value),
        };
      });

      const skillTree = {
        id: d.PointID,
        code: `${d.PointID}_${d.Level}`,
        name: TextMap.getHashedText(this.lang, d.PointName),
        desc: TextMap.getHashedText(this.lang, d.PointDesc),
        icon: getUrl(d.IconPath, d.StatusAddList.length > 0 ? "main" : "srtools"),
        pointType: d.PointType,
        anchorType: d.AnchorType,
        maxLevel: d.MaxLevel,
        prePoints: d.PrePoint,
        defaultUnlock: d.DefaultUnlock,
        cost: d.MaterialList.map(x => ({
          itemId: x.ItemID,
          num: x.ItemNum,
        })),
        skillIds: d.LevelUpSkillID,
        trigger: d.PointTriggerKey,
        priority: d.RecommendPriority,
        promotionLimit: d.AvatarPromotionLimit,
        levelLimit: d.AvatarLevelLimit,
        levels: levelList,
        statusAdds: d.StatusAddList.reduce<Record<string, number>>((s, x) => {
          s[x.PropertyType] = x.Value.Value;
          return s;
        }, {}),
      } as HsrAvatarSkillTree;

      TextMap.setHashedTagInfo(this.lang, d.PointName, {
        category: {
          avatar: item.AvatarID + "",
          type: "AvatarSkillTreeConfig",
        },
        tags: ["skilltree"]
      });
      TextMap.setHashedTagInfo(this.lang, d.PointDesc, {
        category: {
          avatar: item.AvatarID + "",
          type: "AvatarSkillTreeConfig",
        },
        tags: ["skilltree"]
      });

      skillTrees.push(skillTree);
    }

    return {
      skillTrees: _.sortBy(skillTrees, x => x.id),
    };
  }
  //#endregion


  //#region 升级加点
  promotionMap: Record<number, AvatarPromotionConfig[]> = {};
  private fillAllPromotionMap() {
    const map = _.groupBy(this.avatarPromotions, x => x.AvatarID);
    for (const a of this.avatarConfigs) {
      map[a.AvatarID] ||= [];
      map[a.AvatarID] = _.sortBy(map[a.AvatarID], x => x.Promotion || 0);
    }
    this.promotionMap = map;
  }

  getPromotionInfo(item: AvatarConfig) {
    const promotions = this.promotionMap[item.AvatarID];
    return promotions.map(p => ({
      promotion: p.Promotion || 0,
      maxLevel: p.MaxLevel,
      worldLevel: p.WorldLevelRequire,
      properties: {
        BaseAttack: {
          base: p.AttackBase.Value,
          step: p.AttackAdd.Value,
        },
        BaseDefence: {
          base: p.DefenceBase.Value,
          step: p.DefenceAdd.Value,
        },
        BaseHP: {
          base: p.HPBase.Value,
          step: p.HPAdd.Value,
        },
        BaseSpeed: {
          base: p.SpeedBase.Value,
          step: 0,
        },
        Aggro: {
          base: p.BaseAggro.Value,
          step: 0,
        },
        CriticalChance: {
          base: p.CriticalChance.Value,
          step: 0,
        },
        CriticalDamage: {
          base: p.CriticalDamage.Value,
          step: 0,
        }
      },
      cost: p.PromotionCostList.map(x => ({
        itemId: x.ItemID,
        num: x.ItemNum,
      })),
    }) as HsrAvatarPromotion)
  }
  //#endregion


  private fillServantIds() {
    const map = this.avatarServants.reduce<Record<number, AvatarServantConfig>>((map, x) => {
      map[x.ServantID] = x;
      return map;
    }, {});
    for (const a of this.avatarConfigs) {
      let servantID = "1" + a.AvatarID;
      // 女记忆主的忆灵和男主是一个id
      if (a.AvatarVOTag == "playergirl4") {
        // 18007
        servantID = "1" + (this.avatarConfigs.find(x => x.AvatarVOTag === "playerboy4")!.AvatarID);
      }

      (a as any).ServantID = map[Number(servantID)]?.ServantID || null;
    }

   
  }


  //#region 各种特殊技能
  ultraSkillMap: Record<number, AvatarUltraSkillConfig> = {};
  private fillAllUltraSkillMap() {
    this.ultraSkillMap = this.avatarUltraSkills.reduce<Record<number, AvatarUltraSkillConfig>>((a, v) => {
      a[v.AvatarID] = v;
      return a;
    }, {});
  }
  elationSkillMap: Record<number, ElationSkill> = {};
  private fillAllElationSkillMap() {
    this.elationSkillMap = this.elationSkills.reduce<Record<number, ElationSkill>>((a, v) => {
      a[v.ElationSkillID] = v;
      return a;
    }, {});
  }
  //#endregion


  //#region 皮肤
  skinMap: Record<number, (AvatarSkin & {ItemConfig?:ItemConfigAvatarSkin})[]> = {};
  private fillAllSkinMap() {
    const map = _.groupBy(this.avatarSkins, x => x.AvatarID);
    const itemMap = this.avatarSkinsItems.reduce<Record<number, ItemConfigAvatarSkin>>((a, v) => {
      a[v.ID] = v;
      return a;
    }, {});
    for (const a of this.avatarConfigs) {
      map[a.AvatarID] ||= [];
      map[a.AvatarID] = _.sortBy(map[a.AvatarID], x => x.ID);
      for (const skin of map[a.AvatarID]) {
        const item = itemMap[skin.ID];
        if (item) {
          (skin as any).ItemConfig = item;
        }
      }
    }
    this.skinMap = map;
  }
  getSkinInfo(item: HsrGameAvatar) {
    const skins = this.skinMap[item.id];
    const ret = skins.map(x => {
      let portrait = "";
      if (x.DressIconPath) {
        portrait = getUrl(x.DressIconPath, "dicloud")!;
      } else {
        portrait = getUrl(x.AvatarCutinFrontImgPath, "dicloud")!;
      }
      return {
        id: x.ID,
        name: TextMap.getText(this.lang, x.ItemConfig?.ItemName?.Hash!),
        icon: getUrl(x.ItemConfig?.ItemAvatarIconPath ?? "", "dicloud"),
        roundIcon: getUrl(x.AvatarSideIconPath, "dicloud"),
        portrait,
        type: x.Type,
        rarity: getRarity(x.ItemConfig?.Rarity ?? "Normal"),
      } as HsrGameAvatarSkin;
    });
    // 根据角色信息本身生成一个默认皮肤（没有名字）
    ret.unshift({
      ..._.pick(item, ["id", "name", "icon", "roundIcon", "portrait"]),
      rarity: 0,
      type: "Normal",
    } as HsrGameAvatarSkin);
    return ret;
  }
  //#endregion



}
