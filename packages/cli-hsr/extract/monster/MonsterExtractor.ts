import fs from "fs/promises";
import JSONBig from "json-bigint";
import { HsrMonster, HsrMonsterSkill, HsrMonsterTemplate } from "@game/games/hsr/HsrMonster";
import TextMap from "../../text";
import { getUrl } from "../../url";
import _ from "lodash";

import { MonsterTemplateConfig } from "schema/MonsterTemplateConfig";
import { MonsterConfig } from "schema/MonsterConfig";
import { MonsterSkillConfig } from "schema/MonsterSkillConfig";
import { mutateGroupJoin } from "hoyo-cli-common";

export class MonsterExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  monsters: MonsterConfig[] = [];
  monsterSkills: MonsterSkillConfig[] = [];
  monsterTemplateConfigs: MonsterTemplateConfig[] = [];
  monsterMap: Record<number, HsrMonster> = {};
  templateMap: Record<number, HsrMonsterTemplate> = {};

  async init() {
    // 敌人模板表
    const json = await fs.readFile(`./data/ExcelOutput/MonsterTemplateConfig.json`, "utf-8");
    this.monsterTemplateConfigs = JSONBig.parse(json);

    // 敌人表
    const json2 = await fs.readFile(`./data/ExcelOutput/MonsterConfig.json`, "utf-8");
    this.monsters = JSONBig.parse(json2);

    // 敌人技能表
    const json3 = await fs.readFile(`./data/ExcelOutput/MonsterSkillConfig.json`, "utf-8");
    this.monsterSkills = JSONBig.parse(json3);

    await TextMap.loadMap(this.lang);
  }

  getMonsterList(): HsrMonster[] {
    const data = this.monsters.map(d => {
      const monster: HsrMonster = {
        id: d.MonsterID,
        code: d.MonsterID + "",
        name: TextMap.getText(this.lang, d.MonsterName.Hash),
        desc: TextMap.getText(this.lang, d.MonsterIntroduction.Hash),
        monsterTemplateId: d.MonsterTemplateID,
        eliteGroup: d.EliteGroup,
        hardLevelGroup: d.HardLevelGroup,
        attackModifyRatio: d.AttackModifyRatio?.Value,
        defenceModifyRatio: d.DefenceModifyRatio?.Value,
        hpModifyRatio: d.HPModifyRatio?.Value,
        speedModifyRatio: d.SpeedModifyRatio?.Value,
        stanceModifyRatio: d.StanceModifyRatio?.Value,
        speedModifyValue: d.SpeedModifyValue?.Value,
        stanceModifyValue: d.StanceModifyValue?.Value,
        stanceWeakList: d.StanceWeakList,
        damageTypeResistance: d.DamageTypeResistance.map(r => ({
          damageType: r.DamageType,
          value: r.Value?.Value,
        })),
        debuffResist: d.DebuffResist.map(r => ({
          key: r.Key,
          value: r.Value?.Value,
        })),
        customValueTags: d.CustomValueTags,
        customValues: d.CustomValues,
        dynamicValues: d.DynamicValues,
        summonIdList: d.SummonIDList,
        overrideAiPath: d.OverrideAIPath,
        overrideAiSkillSequence: d.OverrideAISkillSequence,
        overrideSkillParams: d.OverrideSkillParams,
        abilityNameList: d.AbilityNameList,
        skillList: d.SkillList,
        monsterStrategy: d.MonsterStrategy,
      };

      TextMap.setTagInfo(this.lang, d.MonsterName.Hash, {
        category: {
          monster: d.MonsterID + "",
          type: "MonsterConfig",
        },
        tags: ["monster"],
      });
      TextMap.setTagInfo(this.lang, d.MonsterIntroduction.Hash, {
        category: {
          monster: d.MonsterID + "",
          type: "MonsterConfig",
        },
        tags: ["monster"],
      });

      return monster;
    });

    this.monsterMap = data.reduce<Record<number, HsrMonster>>((map, m) => {
      map[m.id] = m;
      return map;
    }, {});

    return _.sortBy(data, "id");
  }

  fillMonsterData() {
    const merged = mutateGroupJoin(this.monsters, {
      list: this.monsterSkills,
      key: "SkillID",
      bIdsKey: "SkillList",
      bListKey: "skills",
    });

    for (const monster of merged) {
      const m = this.monsterMap[monster.MonsterID];
      if (!m) continue;

      m.skills = monster.skills.map(s => {
        const skill: HsrMonsterSkill = {
          id: s.SkillID,
          name: TextMap.getText(this.lang, s.SkillName.Hash),
          desc: TextMap.getText(this.lang, s.SkillDesc.Hash),
          attackType: s.AttackType,
          typeText: TextMap.getText(this.lang, s.SkillTypeDesc.Hash),
          triggerKey: s.SkillTriggerKey,
          effectText: TextMap.getText(this.lang, s.SkillTag?.Hash),
          icon: getUrl(s.IconPath, "srtools") ?? undefined,
          params: s.ParamList.map(p => p.Value),
          phaseList: s.PhaseList,
        };

        TextMap.setTagInfo(this.lang, s.SkillName.Hash, {
          category: {
            monster: monster.MonsterID + "",
            type: "MonsterSkillConfig",
          },
          tags: ["skill", "monster"],
        });
        TextMap.setTagInfo(this.lang, s.SkillDesc.Hash, {
          category: {
            monster: monster.MonsterID + "",
            type: "MonsterSkillConfig",
          },
          tags: ["skill", "monster"],
        });

        return skill;
      });
    }
  }

  getTemplateList(): HsrMonsterTemplate[] {
    const grouped = _.groupBy(Object.values(this.monsterMap), m => m.monsterTemplateId);

    const data = this.monsterTemplateConfigs.map(d => {
      const templateId = d.MonsterTemplateID;
      const variants = grouped[templateId] || [];
      const template: HsrMonsterTemplate = {
        id: templateId,
        code: templateId + "",
        name: TextMap.getText(this.lang, d.MonsterName.Hash),
        // icon: getUrl(d.IconPath, "srtools"),
        icon: getUrl(d.ImagePath, "srtools"),
        roundIcon: getUrl(d.RoundIconPath, "dicloud"),
        // image: getUrl(d.ImagePath, "srtools"),
        // manikinImage: getUrl(d.ManikinImagePath, "srtools"),
        rank: d.Rank,
        attackBase: d.AttackBase?.Value,
        defenceBase: d.DefenceBase?.Value,
        hpBase: d.HPBase?.Value,
        speedBase: d.SpeedBase?.Value,
        stanceBase: d.StanceBase?.Value,
        criticalDamageBase: d.CriticalDamageBase?.Value,
        statusResistanceBase: d.StatusResistanceBase?.Value,
        initialDelayRatio: d.InitialDelayRatio?.Value,
        stanceCount: d.StanceCount!,
        stanceType: d.StanceType,
        stanceWeakList: variants[0]?.stanceWeakList ?? [],
        natureId: d.NatureID,
        minimumFatigueRatio: d.MinimumFatigueRatio?.Value,
        atlasSortId: d.AtlasSortID,
        monsterCampId: d.MonsterCampID,
        speedModifyValue: d.SpeedModifyValue?.Value,
        stanceModifyValue: d.StanceModifyValue?.Value,
        templateGroupId: d.TemplateGroupID,
        hardLevelGroup: variants.find(m => m.hardLevelGroup != null)?.hardLevelGroup,
        eliteGroup: variants.find(m => m.eliteGroup != null)?.eliteGroup,
        monsters: variants,
      };

      TextMap.setTagInfo(this.lang, d.MonsterName.Hash, {
        category: {
          monster_template: templateId + "",
          type: "MonsterTemplateConfig",
        },
        tags: ["monster_template","monster"],
      });

      this.templateMap[templateId] = template;
      return template;
    });

    return _.sortBy(data, "id");
  }
}
