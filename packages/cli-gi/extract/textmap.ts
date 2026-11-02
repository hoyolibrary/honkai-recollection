import path from "path";
import fs from "fs/promises";
import TextMap from "../text";
import {
  finalizeDbTextRows,
  loadLocalizedTextFiles,
  type DbTextRow,
} from "hoyo-cli-common";
import type { GiSourceType } from "@game/games/gi/GiTextMap";

/** 对齐 GiTextMapAll 的单语导出行（按语言分文件，仍带 lang/kind 便于入库） */
export interface GiDbTextRow extends DbTextRow {
  id: string;
  text: string;
  kind: GiSourceType;
  lang: string;
  tags?: string[];
  category?: Record<string, string>;
  weight?: number;
}

async function writeKindLangJson(
  textmapOutRoot: string,
  kind: GiSourceType,
  lang: string,
  rows: GiDbTextRow[],
) {
  const dir = path.join(textmapOutRoot, kind);
  await fs.mkdir(dir, { recursive: true });
  const finalized = finalizeDbTextRows(rows);
  await fs.writeFile(path.join(dir, `${lang}.json`), JSON.stringify(finalized));
}

/**
 * 导出 TextMap 源：id = hash 字符串，kind = textmap
 */
export async function generateTextMapDb(lang: string, textmapOutRoot: string) {
  await TextMap.loadMap(lang);
  const base = TextMap.getMapWithTagInfo(lang);
  const rows: GiDbTextRow[] = base.map(e => ({
    id: e.id,
    text: e.text,
    tags: e.tags,
    category: e.category,
    kind: "textmap" as const,
    lang,
  }));
  await writeKindLangJson(textmapOutRoot, "textmap", lang, rows);
  return rows.length;
}

/**
 * 导出 Readable / Subtitle 源（结构相同：data/{Readable|Subtitle}/{lang}/*）。
 * id = 文件名去扩展名、去 `_{lang}` 后缀；全文进 text。
 */
export async function generateFileSourceDb(
  lang: string,
  textmapOutRoot: string,
  kind: "readable" | "subtitle",
  dataRoot: string,
) {
  const dirName = kind === "readable" ? "Readable" : "Subtitle";
  const extension = kind === "readable" ? ".txt" : ".srt";
  const dir = path.join(dataRoot, dirName, lang);

  const files = await loadLocalizedTextFiles({ dir, lang, extension });
  const rows: GiDbTextRow[] = files.map(f => ({
    id: f.id,
    text: f.text,
    tags: [],
    category: {},
    kind,
    lang,
  }));
  await writeKindLangJson(textmapOutRoot, kind, lang, rows);
  return rows.length;
}

/** 三种文本源全部导出到 textmap_out/{kind}/{lang}.json */
export async function generateAllGiTextSources(
  lang: string,
  textmapOutRoot: string,
  dataRoot: string,
) {
  const n1 = await generateTextMapDb(lang, textmapOutRoot);
  console.log(`  textmap: ${n1} rows`);

  const n2 = await generateFileSourceDb(lang, textmapOutRoot, "readable", dataRoot);
  console.log(`  readable: ${n2} rows`);

  const n3 = await generateFileSourceDb(lang, textmapOutRoot, "subtitle", dataRoot);
  console.log(`  subtitle: ${n3} rows`);
}
