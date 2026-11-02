import fs from "fs/promises";
import JSONBig from "json-bigint";
import TextMap from "../../../text";
import { getSkillIconUrl, getUrl } from "../../../url";
import type { GridFightPropertyValue } from "schema/GridFightRoleStar";
import type { HsrGridFightProperty } from "@game/games/hsr/quest/gridfight";

export async function readExcel<T>(name: string): Promise<T[]> {
  const json = await fs.readFile(`./data/ExcelOutput/${name}.json`, "utf-8");
  return JSONBig.parse(json);
}

export function values(list?: { Value: number }[]): number[] {
  return (list ?? []).map(p => p.Value);
}

export function mapProperties(
  list?: GridFightPropertyValue[],
): HsrGridFightProperty[] | undefined {
  if (!list?.length) return undefined;
  const mapped = list
    .filter(p => p.Value != null)
    .map(p => ({
      type: p.PropertyType,
      value: p.Value?.Value,
    }));
  return mapped.length ? mapped : undefined;
}

export function gridFightUrl(filepath: string) {
  return getUrl(filepath, "dicloud");
}

export function skillIconUrl(filepath: string) {
  return getSkillIconUrl(filepath);
}

export function tag(
  lang: string,
  hash: bigint | undefined,
  type: string,
  key: string,
  id: number | string,
  extraTags: string[] = [],
) {
  if (hash == null) return;
  TextMap.setTagInfo(lang, hash, {
    category: {
      [key]: id + "",
      type,
    },
    tags: [key, ...extraTags],
  });
}

export function hashedTag(
  lang: string,
  text: string | undefined,
  type: string,
  key: string,
  id: number | string,
  extraTags: string[] = [],
) {
  if (!text) return;
  TextMap.setHashedTagInfo(lang, text, {
    category: {
      [key]: id + "",
      type,
    },
    tags: [key, ...extraTags],
  });
}
