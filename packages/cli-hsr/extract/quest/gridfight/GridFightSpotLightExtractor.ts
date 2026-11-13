import _ from "lodash";
import type { GridFightSpotLight } from "schema/GridFightSpotLight";
import type { GridFightSpotLightTag } from "schema/GridFightSpotLightTag";
import type { GridFightSpotLightRemark } from "schema/GridFightSpotLightRemark";
import type { GridFightSpotLightMazebuff } from "schema/GridFightSpotLightMazebuff";
import type { GridFightRoleRecomSpotLight } from "schema/GridFightRoleRecomSpotLight";
import type { GridFightRoleBasicInfo } from "schema/GridFightRoleBasicInfo";
import type { GridFightTraitBasicInfo } from "schema/GridFightTraitBasicInfo";
import type {
  HsrGridFightSpotLight,
  HsrGridFightSpotLightTag,
  HsrGridFightSpotLightMazeBuff,
  HsrGridFightRoleSpotLightRecommendation,
  HsrGridFightSeasonEntityRef,
} from "@game/games/hsr/quest/gridfight";
import TextMap from "../../../text";
import { gridFightUrl, readExcel, tag, values } from "./common";

export class GridFightSpotLightExtractor {
  constructor(private lang: string) {}

  spotLights: GridFightSpotLight[] = [];
  tags: GridFightSpotLightTag[] = [];
  remarks: GridFightSpotLightRemark[] = [];
  mazeBuffs: GridFightSpotLightMazebuff[] = [];
  recommendations: GridFightRoleRecomSpotLight[] = [];
  roles: GridFightRoleBasicInfo[] = [];
  traits: GridFightTraitBasicInfo[] = [];

  async init() {
    [this.spotLights, this.tags, this.remarks, this.mazeBuffs, this.recommendations, this.roles, this.traits] = await Promise.all([
      readExcel<GridFightSpotLight>("GridFightSpotLight"),
      readExcel<GridFightSpotLightTag>("GridFightSpotLightTag"),
      readExcel<GridFightSpotLightRemark>("GridFightSpotLightRemark"),
      readExcel<GridFightSpotLightMazebuff>("GridFightSpotLightMazebuff"),
      readExcel<GridFightRoleRecomSpotLight>("GridFightRoleRecomSpotLight"),
      readExcel<GridFightRoleBasicInfo>("GridFightRoleBasicInfo"),
      readExcel<GridFightTraitBasicInfo>("GridFightTraitBasicInfo"),
    ]);
    await TextMap.loadMap(this.lang);
  }

  getTagList(): HsrGridFightSpotLightTag[] {
    return _.sortBy(this.tags.map(d => {
      tag(this.lang, d.Name.Hash, "GridFightSpotLightTag", "gridfight_spotlight_tag", d.ID);
      return {
        id: d.ID,
        name: TextMap.getText(this.lang, d.Name.Hash),
        tagColor: d.TagColor,
      };
    }), "id");
  }

  private entityRefs(rows: { ID: number; SeasonID: number }[], id: number, context: string): HsrGridFightSeasonEntityRef[] {
    const matches = rows.filter(row => row.ID === id);
    if (!matches.length) throw new Error(`${context}: missing season entity ${id}`);
    return matches.map(row => ({ id: row.ID, seasonId: row.SeasonID }));
  }

  getSpotLightList(): HsrGridFightSpotLight[] {
    const tags = new Map(this.getTagList().map(d => [d.id, d]));
    const remarks = new Map(this.remarks.map(d => [d.SpotLightID, d]));
    for (const id of remarks.keys()) {
      if (!this.spotLights.some(d => d.ID === id)) throw new Error(`GridFightSpotLightRemark: missing Spotlight ${id}`);
    }
    return _.sortBy(this.spotLights.map(d => {
      tag(this.lang, d.Name.Hash, "GridFightSpotLight", "gridfight_spotlight", d.ID);
      tag(this.lang, d.Desc.Hash, "GridFightSpotLight", "gridfight_spotlight", d.ID);
      const remark = remarks.get(d.ID);
      if (remark) tag(this.lang, remark.SpotLightRemark.Hash, "GridFightSpotLightRemark", "gridfight_spotlight", d.ID);
      return {
        id: d.ID,
        code: d.ID + "",
        name: TextMap.getText(this.lang, d.Name.Hash),
        desc: TextMap.getText(this.lang, d.Desc.Hash),
        icon: gridFightUrl(d.Icon),
        params: values(d.EffectParamList),
        jsonPath: d.JsonPath,
        tagIds: [...d.Tag],
        tags: d.Tag.map(id => {
          const item = tags.get(id);
          if (!item) throw new Error(`GridFightSpotLight ${d.ID}: missing tag ${id}`);
          return item;
        }),
        suitableRoleIds: [...d.SuitableAvatarList],
        suitableRoles: d.SuitableAvatarList.flatMap(id => this.entityRefs(this.roles, id, `GridFightSpotLight ${d.ID}`)),
        isOCEffective: d.IsOCEffective,
        isCarry: d.IsCarry,
        enemyDiffLvAdd: d.EnemyDiffLvAdd,
        traitId: d.TraitID,
        traits: d.TraitID == null ? undefined : this.entityRefs(this.traits, d.TraitID, `GridFightSpotLight ${d.ID}`),
        remark: remark ? {
          desc: TextMap.getText(this.lang, remark.SpotLightRemark.Hash),
          params: values(remark.ParamList),
        } : undefined,
      };
    }), "id");
  }

  getRoleRecommendationList(): HsrGridFightRoleSpotLightRecommendation[] {
    const spotLightIds = new Set(this.spotLights.map(d => d.ID));
    return _.sortBy(this.recommendations.flatMap(d => {
      for (const id of [...d.FirstRecommendSpotLightList, ...d.SecondRecommendSpotLightList]) {
        if (!spotLightIds.has(id)) throw new Error(`GridFightRoleRecomSpotLight ${d.RoleID}: missing Spotlight ${id}`);
      }
      return this.entityRefs(this.roles, d.RoleID, "GridFightRoleRecomSpotLight").map(role => ({
        roleId: role.id,
        seasonId: role.seasonId,
        frontBackType: d.FrontBackType,
        firstRecommendSpotLightIds: [...d.FirstRecommendSpotLightList],
        secondRecommendSpotLightIds: [...d.SecondRecommendSpotLightList],
      }));
    }), ["seasonId", "roleId", "frontBackType"]);
  }

  getMazeBuffList(): HsrGridFightSpotLightMazeBuff[] {
    return _.sortBy(this.mazeBuffs.map(d => {
      tag(this.lang, d.BuffName.Hash, "GridFightSpotLightMazebuff", "gridfight_spotlight_buff", `${d.ID}_${d.Lv}`);
      tag(this.lang, d.BuffDesc.Hash, "GridFightSpotLightMazebuff", "gridfight_spotlight_buff", `${d.ID}_${d.Lv}`);
      return {
        id: d.ID,
        code: `${d.ID}_${d.Lv}`,
        name: TextMap.getText(this.lang, d.BuffName.Hash),
        desc: TextMap.getText(this.lang, d.BuffDesc.Hash),
        nameHash: String(d.BuffName.Hash),
        descHash: String(d.BuffDesc.Hash),
        icon: gridFightUrl(d.BuffIcon),
        params: values(d.ParamList),
        level: d.Lv,
        maxLevel: d.LvMax,
        buffSeries: d.BuffSeries,
        buffRarity: d.BuffRarity,
        modifierName: d.ModifierName,
        inBattleBindingType: d.InBattleBindingType,
        inBattleBindingKey: d.InBattleBindingKey,
        buffEffect: d.BuffEffect,
        mazeBuffType: d.MazeBuffType,
      };
    }), ["id", "level"]);
  }
}
