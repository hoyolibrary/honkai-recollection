import _ from "lodash";
import type { GridFightRoleBasicInfo } from "schema/GridFightRoleBasicInfo";
import type { GridFightTraitBasicInfo } from "schema/GridFightTraitBasicInfo";
import type { GridFightTraitEffect } from "schema/GridFightTraitEffect";
import type { GridFightTraitEffectLayerPa } from "schema/GridFightTraitEffectLayerPa";
import type { GridFightTraitLayer } from "schema/GridFightTraitLayer";
import type { MazeBuff } from "schema/MazeBuff";
import type { HsrGridFightTrait } from "@game/games/hsr/quest/gridfight";
import TextMap from "../../../text";
import { gridFightUrl, mapProperties, readExcel, tag, values } from "./common";

export class GridFightTraitExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  traits: GridFightTraitBasicInfo[] = [];
  layers: GridFightTraitLayer[] = [];
  effects: GridFightTraitEffect[] = [];
  effectLayers: GridFightTraitEffectLayerPa[] = [];
  roles: GridFightRoleBasicInfo[] = [];
  buffs: MazeBuff[] = [];

  async init() {
    this.traits = await readExcel("GridFightTraitBasicInfo");
    this.layers = await readExcel("GridFightTraitLayer");
    this.effects = await readExcel("GridFightTraitEffect");
    this.effectLayers = await readExcel("GridFightTraitEffectLayerPa");
    this.roles = await readExcel("GridFightRoleBasicInfo");
    this.buffs = await readExcel("GridFightTraitMazebuff");
    await TextMap.loadMap(this.lang);
  }

  getTraitList(): HsrGridFightTrait[] {
    const layersByTrait = _.groupBy(this.layers, l => l.TraitID);
    const effectById = Object.fromEntries(this.effects.map(e => [e.ID, e]));
    const effectLayersById = _.groupBy(this.effectLayers, e => e.ID);
    const buffById = Object.fromEntries(this.buffs.filter(buff => buff.Lv === 1).map(buff => [buff.ID, buff]));
    const membersByTrait: Record<number, number[]> = {};
    for (const role of this.roles) {
      for (const traitId of role.TraitList || []) {
        (membersByTrait[traitId] ||= []).push(role.ID);
      }
    }

    const data = this.traits.map(d => {
      tag(this.lang, d.TraitName?.Hash, "GridFightTraitBasicInfo", "gridfight_trait", d.ID);
      tag(this.lang, d.TraitBaseDesc?.Hash, "GridFightTraitBasicInfo", "gridfight_trait", d.ID);
      tag(this.lang, d.TraitBaseSimpleDesc?.Hash, "GridFightTraitBasicInfo", "gridfight_trait", d.ID);

      const layers = _.sortBy(layersByTrait[d.ID] || [], l => l.Layer).map(l => {
        tag(this.lang, l.PropertyDesc?.Hash, "GridFightTraitLayer", "gridfight_trait", d.ID);
        const buff = buffById[l.MazebuffID];
        tag(this.lang, buff?.BuffDesc?.Hash, "GridFightTraitMazebuff", "gridfight_trait", d.ID);
        tag(this.lang, buff?.BuffSimpleDesc?.Hash, "GridFightTraitMazebuff", "gridfight_trait", d.ID);
        return {
          layer: l.Layer,
          quality: l.Quality || "Copper",
          bindType: l.PropertyBindType,
          desc: TextMap.getText(this.lang, l.PropertyDesc?.Hash) || undefined,
          params: l.PropertyParamList?.length ? values(l.PropertyParamList) : undefined,
          memberProperties: mapProperties(l.TraitMemberPropertyList),
          allMemberProperties: mapProperties(l.AllMemberPropertyList),
          mazeBuffId: l.MazebuffID || undefined,
          mazeBuffDesc: TextMap.getText(this.lang, buff?.BuffDesc?.Hash) || undefined,
          mazeBuffSimpleDesc: TextMap.getText(this.lang, buff?.BuffSimpleDesc?.Hash) || undefined,
          mazeBuffParams: buff?.ParamList?.length ? values(buff.ParamList) : undefined,
        };
      });

      const effects = (d.TraitEffectList || [])
        .map(id => {
          const effect = effectById[id];
          if (!effect) return undefined;
          const elayers = _.sortBy(effectLayersById[id] || [], x => x.Layer).map(x => {
            tag(this.lang, x.TraitEffectDesc?.Hash, "GridFightTraitEffectLayerPa", "gridfight_trait", d.ID);
            return {
              layer: x.Layer,
              desc: TextMap.getText(this.lang, x.TraitEffectDesc?.Hash) || undefined,
              params: x.EffectParamList?.length ? values(x.EffectParamList) : undefined,
              descParams: x.DescParamList?.length ? x.DescParamList : undefined,
            };
          });
          return {
            id: effect.ID,
            type: effect.TraitEffectType,
            icon: effect.TraitEffectIconPath ? gridFightUrl(effect.TraitEffectIconPath) : undefined,
            layers: elayers,
          };
        })
        .filter((e): e is NonNullable<typeof e> => !!e);

      return {
        id: d.ID,
        code: d.TraitSearchKey || d.ID + "",
        name: TextMap.getText(this.lang, d.TraitName?.Hash),
        icon: gridFightUrl(d.IconPath),
        miniIcon: d.MiniIconPath ? gridFightUrl(d.MiniIconPath) : undefined,
        desc: TextMap.getText(this.lang, d.TraitBaseDesc?.Hash),
        simpleDesc: TextMap.getText(this.lang, d.TraitBaseSimpleDesc?.Hash),
        params: d.BaseDescParamList?.length ? values(d.BaseDescParamList) : undefined,
        traitType: d.TraitType || "Origin",
        activationType: d.ActivationType,
        searchKey: d.TraitSearchKey,
        sortPriority: d.TraitSortPriority,
        seasonId: d.SeasonID,
        beIds: d.BEIDList?.length ? d.BEIDList : undefined,
        layers,
        effects,
        roleIds: membersByTrait[d.ID] || [],
      } as HsrGridFightTrait;
    });

    return _.sortBy(data, t => t.sortPriority ?? t.id);
  }
}
