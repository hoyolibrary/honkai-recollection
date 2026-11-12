import type { HsrGridFightPropertyMetadata } from "@game/games/hsr/quest/gridfight";
import type { HsrDictItem } from "@game/games/hsr/HsrItem";
import type { GridFightRolePropertyConfig } from "schema/GridFightRolePropertyConfig";
import type { GridFightSpecialProperty } from "schema/GridFightSpecialProperty";
import TextMap from "../../../text";
import { getUrl } from "../../../url";
import { readExcel } from "./common";

export async function getGridFightPropertyDictionary(lang: string): Promise<HsrGridFightPropertyMetadata[]> {
  const [properties, special] = await Promise.all([
    readExcel<GridFightRolePropertyConfig>("GridFightRolePropertyConfig"),
    readExcel<GridFightSpecialProperty>("GridFightSpecialProperty"),
  ]);
  await TextMap.loadMap(lang);
  const rows: HsrGridFightPropertyMetadata[] = [
    ...properties.map(row => ({
      id: row.PropertyType,
      isPercent: isGridFightPercentProperty(row.PropertyType),
      name: TextMap.getText(lang, row.PropertyName?.Hash),
      panelName: TextMap.getText(lang, row.PanelPropertyName?.Hash),
      icon: getUrl(row.IconPath || "", "dicloud"),
      miniIcon: getUrl(row.MiniIconPath || "", "dicloud"),
      visible: row.IsDisplay ?? false,
      order: row.Order ?? 0,
    })),
    ...special.map(row => ({
      id: row.VariableName,
      isPercent: isGridFightPercentProperty(row.VariableName),
      name: TextMap.getText(lang, row.Name?.Hash),
      icon: getUrl(row.IconPath || "", "dicloud"),
      miniIcon: getUrl(row.MiniIconPath || "", "dicloud"),
      visible: false,
      order: 0,
    })),
  ];
  if (new Set(rows.map(row => row.id)).size !== rows.length) {
    throw new Error("货币战争属性表出现重复属性键，需核对后合并");
  }
  return rows;
}

export type GridFightPropertyTranslations = HsrDictItem<HsrGridFightPropertyMetadata, "name" | "panelName">;

/** 以属性键对齐语言，允许输入顺序或收录范围不同。 */
export function mergeGridFightPropertyTranslations(target: Map<string, GridFightPropertyTranslations>, rows: HsrGridFightPropertyMetadata[], lang: string) {
  for (const row of rows) {
    const entry = target.get(row.id) ?? { ...row };
    entry[`name${lang}`] = row.name;
    entry[`panelName${lang}`] = row.panelName;
    target.set(row.id, entry);
  }
}

/** 原始表没有格式标志，统一在提取阶段根据属性语义键确定倍率/概率。 */
export function isGridFightPercentProperty(type: string): boolean {
  return /Ratio|Chance|Rate|Resistance|Probability|(?:Luck|Critical)Damage|DamageReduce/.test(type);
}
