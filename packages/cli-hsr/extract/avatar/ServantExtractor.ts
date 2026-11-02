import fs from "fs/promises";
import JSONBig from "json-bigint";
import {
  HsrAvatarSkill,
  HsrGameAvatarEnhanceableInfo,
  HsrGameServant,
  HsrGameServantSimple,
} from "@game/games/hsr/HsrGameAvatar";
import TextMap from "../../text";
import { getUrl } from "../../url";
import _ from "lodash";
import { mutateGroupJoin } from "hoyo-cli-common";

import type { AvatarServantConfig } from "schema/AvatarServantConfig";
import type { AvatarServantSkillConfig, AvatarServantSkillLink } from "schema/AvatarServantSkillConfig";
import { mapAvatarSkillList } from "./avatarMap";

export class ServantExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

 
  avatarServants: AvatarServantConfig[] = [];

  servantSkills: AvatarServantSkillConfig[] = [];
  servantSkillLinks: AvatarServantSkillLink[] = [];

  servantMap: Record<number, HsrGameServant> = {};
  async init() {
   
    // 记忆命途角色忆灵表
    const json1 = await fs.readFile(`./data/ExcelOutput/AvatarServantConfig.json`, "utf-8");
    this.avatarServants = JSONBig.parse(json1);

    // 技能子表
    const json2 = await fs.readFile(`./data/ExcelOutput/AvatarServantSkillConfig.json`, "utf-8");
    this.servantSkills = JSONBig.parse(json2);

    // 技能关联子表（仅德谬歌的技能存在）
    const json3 = await fs.readFile(`./data/ExcelOutput/AvatarServantSkillLink.json`, "utf-8");
    this.servantSkillLinks =JSONBig.parse(json3);
   
    await TextMap.loadMap(this.lang);
  }


  getServantList() {
    const data = this.avatarServants.map(d => {
      const servant = {
        id: d.ServantID,
        code: d.ServantID + "",
        name: TextMap.getText(this.lang, d.ServantName.Hash),
        icon: getUrl(d.ServantSideIconPath, "dicloud"),
        roundIcon: getUrl(d.HeadIcon, "dicloud"),
      } as HsrGameServantSimple;

      TextMap.setTagInfo(this.lang, d.ServantName.Hash, {
        category: {
          servant: d.ServantID + "",
          type: "AvatarServantConfig",
        },
        tags: ["servant"]
      });

      return servant;
    });

    this.servantMap = data.reduce<Record<number, HsrGameServant>>((map, a) => {
      map[a.id] = a as HsrGameServant;
      return map;
    }, {});
    return data;
  }

  fillAllServantData() {
    const merged = mutateGroupJoin(this.avatarServants, {
      list: this.servantSkills,
      key: "SkillID",
      bIdsKey: "SkillIDList",
      bListKey: "skills",
      aggregate(skills, x) {
        return {
         
        };
      },
    });


    for (const item of merged) {
      const servant = this.servantMap[item.ServantID];
      if (!servant) continue;

      servant.aggro = item.Aggro.Value;

      servant.skills = this.getSkillInfo(item).skills;
      this.fillSkillLinks(servant.skills);
    }
  }


  getSkillInfo(
    item: AvatarServantConfig & {
      skills: AvatarServantSkillConfig[];
    },
  ): Pick<HsrGameAvatarEnhanceableInfo, "skills"> {
    return {
      skills: mapAvatarSkillList(this.lang, item.skills, item.SkillIDList, {
        ownerId: item.ServantID,
        configType: "AvatarServantSkillConfig",
        categoryKey: "servant",
        includeCode: false,
      }),
    };
  }

  fillSkillLinks(skills: HsrAvatarSkill[]) {
    const links = _.groupBy(this.servantSkillLinks, x => x.SkillID);
    for (const skill of skills) {
      const link = links[skill.id];
      if (link) {
        skill.picture = getUrl(link[0].TarotFigurePath, "dicloud")!;
      }
    }
  }


  
}
