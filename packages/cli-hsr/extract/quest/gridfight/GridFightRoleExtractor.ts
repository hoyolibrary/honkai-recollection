import _ from "lodash";
import type { AvatarConfig, ItemConfigAvatar } from "schema/AvatarConfig";
import type { GridFightBackBESkillConfig } from "schema/GridFightBackBESkillConfig";
import type { GridFightBackRoleRank } from "schema/GridFightBackRoleRank";
import type { GridFightBackSkillExtraDesc } from "schema/GridFightBackSkillExtraDesc";
import type { GridFightFrontSkill } from "schema/GridFightFrontSkill";
import type { GridFightRoleBasicInfo } from "schema/GridFightRoleBasicInfo";
import type { GridFightRoleRecommendEquip } from "schema/GridFightRoleRecommendEquip";
import type { GridFightRoleSkillDisplay } from "schema/GridFightRoleSkillDisplay";
import type { GridFightRoleStar } from "schema/GridFightRoleStar";
import type {
  HsrGridFightRank,
  HsrGridFightRecommendEquip,
  HsrGridFightRole,
  HsrGridFightRoleSimple,
  HsrGridFightRoleStar,
  HsrGridFightSkill,
} from "@game/games/hsr/quest/gridfight";
import TextMap from "../../../text";
import { loadAvatarIdentity, mapAvatarSimple, mapAvatarSkill } from "../../avatar/avatarMap";
import {
  mapProperties,
  readExcel,
  skillIconUrl,
  tag,
  values,
} from "./common";

export class GridFightRoleExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  roleBasics: GridFightRoleBasicInfo[] = [];
  roleStars: GridFightRoleStar[] = [];
  frontSkills: GridFightFrontSkill[] = [];
  backSkills: GridFightBackBESkillConfig[] = [];
  backExtraDescs: GridFightBackSkillExtraDesc[] = [];
  skillDisplays: GridFightRoleSkillDisplay[] = [];
  backRanks: GridFightBackRoleRank[] = [];
  recommendEquips: GridFightRoleRecommendEquip[] = [];
  avatarConfigs: AvatarConfig[] = [];
  avatarItems: ItemConfigAvatar[] = [];

  roleMap: Record<number, HsrGridFightRole> = {};

  private avatarById: Record<number, AvatarConfig> = {};
  private avatarItemById: Record<number, ItemConfigAvatar> = {};
  private frontById: Record<number, GridFightFrontSkill[]> = {};
  private backById: Record<number, GridFightBackBESkillConfig> = {};
  private extraDescById: Record<number, GridFightBackSkillExtraDesc> = {};
  private rankById: Record<number, GridFightBackRoleRank> = {};
  private starsByRole: Record<number, GridFightRoleStar[]> = {};
  private displayByRole: Record<number, GridFightRoleSkillDisplay[]> = {};
  private recommendByRole: Record<number, GridFightRoleRecommendEquip[]> = {};
  private collabIds = new Set<number>();

  async init() {
    this.roleBasics = await readExcel("GridFightRoleBasicInfo");
    this.roleStars = await readExcel("GridFightRoleStar");
    this.frontSkills = await readExcel("GridFightFrontSkill");
    this.backSkills = await readExcel("GridFightBackBESkillConfig");
    this.backExtraDescs = await readExcel("GridFightBackSkillExtraDesc");
    this.skillDisplays = await readExcel("GridFightRoleSkillDisplay");
    this.backRanks = await readExcel("GridFightBackRoleRank");
    this.recommendEquips = await readExcel("GridFightRoleRecommendEquip");

    const identity = await loadAvatarIdentity(true);
    this.avatarConfigs = identity.avatars;
    this.avatarItems = identity.items;
    this.collabIds = identity.collabIds;

    this.avatarById = Object.fromEntries(this.avatarConfigs.map(a => [a.AvatarID, a]));
    this.avatarItemById = Object.fromEntries(this.avatarItems.map(a => [a.ID, a]));
    this.frontById = _.groupBy(this.frontSkills, s => s.SkillID);
    this.backById = Object.fromEntries(this.backSkills.map(s => [s.SkillID, s]));
    this.extraDescById = Object.fromEntries(this.backExtraDescs.map(s => [s.SkillID, s]));
    this.rankById = Object.fromEntries(this.backRanks.map(r => [r.RankID, r]));
    this.starsByRole = _.groupBy(this.roleStars, s => s.ID);
    this.displayByRole = _.groupBy(this.skillDisplays, d => d.RoleID);
    this.recommendByRole = _.groupBy(this.recommendEquips, d => d.RoleID);

    await TextMap.loadMap(this.lang);
  }

  getRoleList(): HsrGridFightRole[] {
    const data = this.roleBasics.map(d => this.mapRole(d));
    this.roleMap = Object.fromEntries(data.map(r => [r.id, r]));
    return data;
  }

  private mapRole(d: GridFightRoleBasicInfo): HsrGridFightRole {
    const avatar = this.avatarById[d.AvatarID];
    const item = this.avatarItemById[d.AvatarID];
    const displays = this.displayByRole[d.ID] || [];
    const displayTags = _.uniq(displays.flatMap(x => x.CategoryTagList || []));

    const role = {
      ...mapAvatarSimple(this.lang, avatar, item, {
        id: d.ID,
        isCollaboration: this.collabIds.has(d.AvatarID),
        categoryKey: "gridfight_role",
        nameType: "GridFightRoleBasicInfo",
        descType: "ItemConfigAvatar",
        tags: ["gridfight_role", "avatar"],
      }),
      avatarId: d.AvatarID,
      isSpecialSp: false,
      cost: d.Rarity,
      frontBackType: d.FrontBackType || "Both",
      traitIds: d.TraitList || [],
      chargeTypes: d.ChargeType || [],
      skillTag: d.HealOrShieldDisplay,
      displayTags,
      specialAvatarId: d.SpecialAvatarID,
      isInPool: d.IsInPool,
      isInBook: d.IsInBook,
      isExpert: d.IsExpert === 1 || undefined,
      seasonId: d.SeasonID,
    } as HsrGridFightRoleSimple;

    const starRows = _.sortBy(this.starsByRole[d.ID] || [], s => s.Star);
    const stars = starRows.map(star => this.mapStar(d, star));
    const ranks = (d.BackendRankList || [])
      .map(id => this.mapRank(d.ID, id))
      .filter((r): r is HsrGridFightRank => !!r);
    const recommendEquips = this.mapRecommend(d.ID);

    return {
      ...role,
      maxStar: stars.length ? _.max(stars.map(s => s.star)) : undefined,
      ranks,
      stars,
      recommendEquips,
    };
  }

  private mapStar(role: GridFightRoleBasicInfo, star: GridFightRoleStar): HsrGridFightRoleStar {
    const overrideSrcByDest = new Map<number, number>();
    const dests = star.SkillOverrideDest || [];
    const srcs = star.SkillOverrideSrc || [];
    for (let i = 0; i < dests.length; i++) {
      overrideSrcByDest.set(dests[i], srcs[i] ?? 0);
    }

    const skills = (star.FrontShowSkillIDList || [])
      .map(id => this.mapFrontSkill(role.ID, id, overrideSrcByDest.get(id)))
      .filter((s): s is HsrGridFightSkill => !!s);

    const backSkills = (star.BackShowSkillIDList || [])
      .map(id => this.mapBackSkill(role.ID, id, overrideSrcByDest.get(id)))
      .filter((s): s is HsrGridFightSkill => !!s);

    const ultra = skills.find(s => s.type === "Ultra");
    const extraInitSP = star.GeneralPropertyModifyList?.find(p => p.PropertyType === "ExtraInitSP")
      ?.Value?.Value;

    tag(this.lang, star.FrontOneWordDesc?.Hash, "GridFightRoleStar", "gridfight_role", role.ID);
    tag(this.lang, star.BackOneWordDesc?.Hash, "GridFightRoleStar", "gridfight_role", role.ID);

    return {
      star: star.Star,
      maxSp: ultra?.spCost ?? star.BackMaxSP?.Value,
      extraInitSP,
      frontPower: star.FrontPowerBase?.Value,
      backPower: star.BackPowerBase?.Value,
      luckChance: star.LuckChance?.Value,
      luckDamage: star.LuckDamage?.Value,
      extraHealBase: star.ExtraHealBase?.Value,
      extraShieldBase: star.ExtraShieldBase?.Value,
      backMaxSP: star.BackMaxSP?.Value,
      backInitialSP: star.BackInitialSP?.Value,
      backEnergyBar: star.BackEnergyBar?.Value,
      frontOneWordDesc: TextMap.getText(this.lang, star.FrontOneWordDesc?.Hash),
      backOneWordDesc: TextMap.getText(this.lang, star.BackOneWordDesc?.Hash),
      properties: mapProperties(star.GeneralPropertyModifyList),
      skills,
      backSkills,
    };
  }

  private mapFrontSkill(
    roleId: number,
    skillId: number,
    overrideSrc?: number,
  ): HsrGridFightSkill | undefined {
    return this.finishGridFightSkill(
      mapAvatarSkill(this.lang, this.frontById[skillId] || [], {
        ownerId: roleId,
        configType: "GridFightFrontSkill",
        categoryKey: "gridfight_role",
        tags: ["gridfight_role", "skill"],
        omitNonPositiveCost: true,
      }),
      this.frontById[skillId]?.[0]?.SkillTriggerKey,
      overrideSrc,
    );
  }

  private mapBackSkill(
    roleId: number,
    skillId: number,
    overrideSrc?: number,
  ): HsrGridFightSkill | undefined {
    const d = this.backById[skillId];
    if (!d) return undefined;
    const skill = this.finishGridFightSkill(
      mapAvatarSkill(this.lang, [d], {
        ownerId: roleId,
        configType: "GridFightBackBESkillConfig",
        categoryKey: "gridfight_role",
        tags: ["gridfight_role", "skill"],
        omitNonPositiveCost: true,
      }),
      d.SkillTriggerKey,
      overrideSrc,
    );
    if (!skill) return undefined;
    const extra = this.extraDescById[skillId];
    if (extra?.ConditionDesc?.Hash) {
      skill.conditionDesc = TextMap.getText(this.lang, extra.ConditionDesc.Hash);
      tag(this.lang, extra.ConditionDesc.Hash, "GridFightBackSkillExtraDesc", "gridfight_role", roleId, ["skill"]);
    }
    return skill;
  }

  private finishGridFightSkill(
    skill: ReturnType<typeof mapAvatarSkill>,
    triggerKey?: string,
    overrideSrc?: number,
  ): HsrGridFightSkill | undefined {
    if (!skill) return undefined;
    const out = skill as HsrGridFightSkill;
    out.triggerKey = triggerKey;
    if (overrideSrc != null) {
      if (overrideSrc === 0) {
        out.isNew = true;
      } else {
        out.isModified = true;
        out.overrideSrc = overrideSrc;
      }
    }
    return out;
  }

  private mapRank(roleId: number, rankId: number): HsrGridFightRank | undefined {
    const d = this.rankById[rankId];
    if (!d) return undefined;
    tag(this.lang, d.Name?.Hash, "GridFightBackRoleRank", "gridfight_role", roleId, ["rank"]);
    tag(this.lang, d.Desc?.Hash, "GridFightBackRoleRank", "gridfight_role", roleId, ["rank"]);
    return {
      id: d.RankID,
      name: TextMap.getText(this.lang, d.Name?.Hash),
      icon: skillIconUrl(d.IconPath),
      picture: skillIconUrl(d.IconPath)!,
      desc: TextMap.getText(this.lang, d.Desc?.Hash),
      rank: d.Rank,
      params: d.DescParamList?.length ? d.DescParamList : values(d.Param),
      code: d.RankID + "",
      ownerProperties: mapProperties(d.OwnerGeneralPropertyList),
      allMemberProperties: mapProperties(d.AllMemberGeneralPropertyList),
      modifySkillIds: d.ModifySkillList?.length ? d.ModifySkillList : undefined,
    };
  }

  private mapRecommend(roleId: number): HsrGridFightRecommendEquip[] | undefined {
    const rows = this.recommendByRole[roleId];
    if (!rows?.length) return undefined;
    return rows.map(r => ({
      frontBackType: r.FrontBackType as "Front" | "Back",
      first: r.FirstRecommendEquipList || [],
      second: r.SecondRecommendEquipList || [],
    }));
  }
}
