import _ from "lodash";
import type { GridFightCraftConfig } from "schema/GridFightCraftConfig";
import type { GridFightElationEquip } from "schema/GridFightElationEquip";
import type { GridFightEquipCategoryInfo } from "schema/GridFightEquipCategoryInfo";
import type { GridFightEquipment } from "schema/GridFightEquipment";
import type { GridFightEquipRecommendRole } from "schema/GridFightEquipRecommendRole";
import type { GridFightEquipTag } from "schema/GridFightEquipTag";
import type { GridFightItems } from "schema/GridFightItems";
import type { GridFightSeasonItem } from "schema/GridFightSeasonItem";
import type { GridFightSeasonCraft } from "schema/GridFightSeasonCraft";
import type { HsrGridFightCraft, HsrGridFightEquip } from "@game/games/hsr/quest/gridfight";
import TextMap from "../../../text";
import { gridFightSeasonIds, gridFightUrl, mapProperties, readExcel, tag, values } from "./common";

export class GridFightEquipExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  items: GridFightItems[] = [];
  equips: GridFightEquipment[] = [];
  categories: GridFightEquipCategoryInfo[] = [];
  tags: GridFightEquipTag[] = [];
  crafts: GridFightCraftConfig[] = [];
  seasonItems: GridFightSeasonItem[] = [];
  seasonCrafts: GridFightSeasonCraft[] = [];
  elationEquips: GridFightElationEquip[] = [];
  recommendRoles: GridFightEquipRecommendRole[] = [];

  async init() {
    this.items = await readExcel("GridFightItems");
    this.equips = await readExcel("GridFightEquipment");
    this.categories = await readExcel("GridFightEquipCategoryInfo");
    this.tags = await readExcel("GridFightEquipTag");
    this.crafts = await readExcel("GridFightCraftConfig");
    this.seasonItems = await readExcel("GridFightSeasonItem");
    this.seasonCrafts = await readExcel("GridFightSeasonCraft");
    this.elationEquips = await readExcel("GridFightElationEquip");
    this.recommendRoles = await readExcel("GridFightEquipRecommendRole");
    await TextMap.loadMap(this.lang);
  }

  getEquipList(): HsrGridFightEquip[] {
    const itemById = Object.fromEntries(this.items.map(i => [i.ID, i]));
    const equipById = Object.fromEntries(this.equips.map(e => [e.ID, e]));
    const catById = Object.fromEntries(this.categories.map(c => [c.EquipCategory, c]));
    const tagById = Object.fromEntries(this.tags.map(t => [t.TagID, t]));
    const craftsByDest = _.groupBy(this.crafts, c => c.CraftEquipID);
    const seasonsByCraft = _.groupBy(this.seasonCrafts, s => s.CraftID);
    const elationById = Object.fromEntries(this.elationEquips.map(e => [e.ID, e]));
    const recByKey = Object.fromEntries(this.recommendRoles.map(r => [`${r.Season}_${r.EquipID}`, r]));

    const ids = _.uniq([...this.items.map(i => i.ID), ...this.equips.map(e => e.ID)]);
    const referencedConfigs = new Set(this.seasonItems.map(s => s.ConfigID));
    const seasonalItemIds = new Set(this.seasonItems.map(s => s.ItemID));
    const versions = [
      ...this.seasonItems.map(s => ({ id: s.ItemID, configId: s.ConfigID, seasonId: s.SeasonID })),
      ...ids.filter(id => !referencedConfigs.has(id) && !seasonalItemIds.has(id))
        .map(id => ({ id, configId: id, seasonId: undefined })),
    ];

    const data = versions.map(({ id, configId, seasonId }) => {
      const item = itemById[configId];
      const equip = equipById[configId];
      const cat = equip ? catById[equip.EquipCategory] : undefined;
      const elation = elationById[configId];
      const crafts: HsrGridFightCraft[] = (craftsByDest[id] ?? []).flatMap(c =>
        gridFightSeasonIds((seasonsByCraft[c.CraftID] ?? []).map(s => s.SeasonID))
          .map(seasonId => ({ id: c.CraftID, costIds: c.CostEquipList || [], seasonId })),
      );
      const rec = recByKey[`${seasonId}_${id}`];

      const elationDesc = TextMap.getText(this.lang, elation?.ElationEquipDesc?.Hash);
      const desc = TextMap.getText(this.lang, equip?.EquipDesc?.Hash) || undefined;

      tag(this.lang, item?.ItemName?.Hash, "GridFightItems", "gridfight_equip", id, ["item"]);
      tag(this.lang, equip?.EquipDesc?.Hash, "GridFightEquipment", "gridfight_equip", id, ["item"]);
      if (elationDesc) {
        tag(this.lang, elation?.ElationEquipDesc?.Hash, "GridFightElationEquip", "gridfight_equip", id, ["item"]);
      }

      const tags = (equip?.EquipmentTagList || [])
        .map(tagId => {
          const t = tagById[tagId];
          if (!t) return undefined;
          tag(this.lang, t.EquipTagDesc?.Hash, "GridFightEquipTag", "gridfight_equip", id, ["item"]);
          return {
            id: t.TagID,
            name: TextMap.getText(this.lang, t.EquipTagDesc?.Hash),
          };
        })
        .filter((t): t is { id: number; name: string } => !!t);

      if (cat?.CategoryName?.Hash) {
        tag(this.lang, cat.CategoryName.Hash, "GridFightEquipCategoryInfo", "gridfight_equip", id, ["item"]);
      }

      const seasonCrafts = crafts.filter(craft => craft.seasonId === seasonId);
      return {
        id,
        code: id + "",
        name: TextMap.getText(this.lang, item?.ItemName?.Hash),
        icon: gridFightUrl(item?.IconPath || ""),
        smallIcon: item?.SmallIconPath ? gridFightUrl(item.SmallIconPath) : undefined,
        desc: desc || elationDesc || undefined,
        elationDesc: elationDesc || undefined,
        category: equip?.EquipCategory ?? "",
        categoryName: cat ? TextMap.getText(this.lang, cat.CategoryName?.Hash) : undefined,
        slotCount: cat?.EquipCount,
        priority: item?.ItemPriority,
        dressRule: equip?.DressRule,
        dressRuleParams: equip?.DressRuleParamList?.length ? equip.DressRuleParamList : undefined,
        equipFunc: equip?.EquipFunc,
        equipFuncParams: equip?.EquipFuncParamList?.length ? equip.EquipFuncParamList : undefined,
        properties: mapProperties(equip?.GeneralPropertyList),
        params: equip?.ParamList?.length ? values(equip.ParamList) : undefined,
        effectParams: equip?.EffectParamList?.length ? values(equip.EffectParamList) : undefined,
        tags: tags.length ? tags : undefined,
        recommendRoleIds: rec?.RecommendRoleIDList?.length ? rec.RecommendRoleIDList : undefined,
        seasonId,
        crafts: seasonCrafts.length ? seasonCrafts : undefined,
        craft: seasonCrafts.at(-1),
      } as HsrGridFightEquip;
    });

    return _.sortBy(data, ["id", "seasonId"]);
  }
}
