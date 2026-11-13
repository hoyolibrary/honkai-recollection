import _ from "lodash";
import type { GridFightPetPal } from "schema/GridFightPetPal";
import type { GridFightPetPalEff } from "schema/GridFightPetPalEff";
import type { GridFightPetPalEffHandBook } from "schema/GridFightPetPalEffHandBook";
import type {
  HsrGridFightPetPal,
  HsrGridFightPetPalEffect,
} from "@game/games/hsr/quest/gridfight";
import TextMap from "../../../text";
import { gridFightUrl, readExcel, tag, values } from "./common";

export class GridFightPetPalExtractor {
  constructor(private lang: string) {}

  petPals: GridFightPetPal[] = [];
  effects: GridFightPetPalEff[] = [];
  handbook: GridFightPetPalEffHandBook[] = [];

  async init() {
    [this.petPals, this.effects, this.handbook] = await Promise.all([
      readExcel<GridFightPetPal>("GridFightPetPal"),
      readExcel<GridFightPetPalEff>("GridFightPetPalEff"),
      readExcel<GridFightPetPalEffHandBook>("GridFightPetPalEffHandBook"),
    ]);
    await TextMap.loadMap(this.lang);
  }

  getPetPalList(): HsrGridFightPetPal[] {
    const effects = new Map(this.effects.map(d => {
      for (const text of [d.Desc, d.AddDesc, d.SwitchDesc, d.SimpleDesc]) {
        tag(this.lang, text?.Hash, "GridFightPetPalEff", "gridfight_pet_pal_effect", d.ID);
      }
      const effect: HsrGridFightPetPalEffect = {
        id: d.ID,
        desc: TextMap.getText(this.lang, d.Desc.Hash),
        addDesc: d.AddDesc ? TextMap.getText(this.lang, d.AddDesc.Hash) : undefined,
        switchDesc: TextMap.getText(this.lang, d.SwitchDesc.Hash),
        simpleDesc: d.SimpleDesc ? TextMap.getText(this.lang, d.SimpleDesc.Hash) : undefined,
        isOCEffective: d.IsOCEffective,
        jsonPath: d.JsonPath,
        params: values(d.EffectParamList),
      };
      return [d.ID, effect] as const;
    }));
    const partners = new Map(this.petPals.map(d => [d.ID, d]));
    const effectGroups = new Map<number, number>();
    for (const group of this.handbook) {
      const partner = partners.get(group.PetPalID);
      if (!partner) throw new Error(`GridFightPetPalEffHandBook ${group.GroupID}: missing PetPal ${group.PetPalID}`);
      for (const effectId of group.PetPalEffList) {
        if (!effects.has(effectId) || !partner.EffIDList.includes(effectId)) {
          throw new Error(`GridFightPetPalEffHandBook ${group.GroupID}: effect ${effectId} is not owned by PetPal ${partner.ID}`);
        }
        if (effectGroups.has(effectId)) {
          throw new Error(`GridFightPetPalEffHandBook: effect ${effectId} is repeated in groups ${effectGroups.get(effectId)} and ${group.GroupID}`);
        }
        effectGroups.set(effectId, group.GroupID);
      }
    }
    for (const partner of this.petPals) {
      for (const effectId of partner.EffIDList) {
        if (!effects.has(effectId)) throw new Error(`GridFightPetPal ${partner.ID}: missing effect ${effectId}`);
        if (!effectGroups.has(effectId)) throw new Error(`GridFightPetPal ${partner.ID}: effect ${effectId} has no handbook group`);
      }
    }
    const groupsByPartner = _.groupBy(this.handbook, d => d.PetPalID);
    return _.sortBy(this.petPals.map(d => {
      tag(this.lang, d.Name.Hash, "GridFightPetPal", "gridfight_pet_pal", d.ID);
      tag(this.lang, d.Desc?.Hash, "GridFightPetPal", "gridfight_pet_pal", d.ID);
      return {
        id: d.ID,
        code: d.ID + "",
        name: TextMap.getText(this.lang, d.Name.Hash),
        desc: d.Desc ? TextMap.getText(this.lang, d.Desc.Hash) : undefined,
        icon: gridFightUrl(d.Icon),
        headImage: gridFightUrl(d.HeadImage),
        smallIcon: gridFightUrl(d.SmallIcon),
        figureUp: gridFightUrl(d.FigureUp),
        figureDown: gridFightUrl(d.FigureDown),
        sort: d.Sort,
        effectIds: [...d.EffIDList],
        handbookGroups: (groupsByPartner[d.ID] ?? []).map(group => {
          tag(this.lang, group.CategoryDesc.Hash, "GridFightPetPalEffHandBook", "gridfight_pet_pal_handbook", group.GroupID);
          tag(this.lang, group.GroupDesc.Hash, "GridFightPetPalEffHandBook", "gridfight_pet_pal_handbook", group.GroupID);
          return {
            id: group.GroupID,
            petpalId: group.PetPalID,
            categoryId: group.CategoryID,
            categoryDesc: TextMap.getText(this.lang, group.CategoryDesc.Hash),
            desc: TextMap.getText(this.lang, group.GroupDesc.Hash),
            effectIds: [...group.PetPalEffList],
            effects: group.PetPalEffList.map(id => effects.get(id)!),
          };
        }),
      };
    }), "id");
  }
}
