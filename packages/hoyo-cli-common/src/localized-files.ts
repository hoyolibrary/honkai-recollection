import fs from "fs/promises";
import path from "path";

/**
 * 从本地化文件名解析稳定 id：去掉扩展名，并去掉末尾的 `_{lang}`（若存在）。
 *
 * 例：
 * - CHS Readable: `Book1.txt` → `Book1`
 * - EN Readable: `Book1_EN.txt` → `Book1`
 * - Subtitle: `Ambor_Readings_CHS.srt` → `Ambor_Readings`
 */
export function fileBaseId(fileName: string, lang: string): string {
  const ext = path.extname(fileName);
  let base = path.basename(fileName, ext);
  const suffix = `_${lang}`;
  if (base.endsWith(suffix)) {
    base = base.slice(0, -suffix.length);
  }
  return base;
}

export interface LocalizedTextFile {
  /** 跨语言稳定 id（无扩展名、无语言后缀） */
  id: string;
  /** 文件全文 */
  text: string;
  /** 原始文件名 */
  fileName: string;
}

export interface LoadLocalizedTextFilesOptions {
  /** 某语言目录，如 `./data/Readable/CHS` */
  dir: string;
  /** 语言代码，用于剥离文件名后缀，如 `CHS` / `EN` */
  lang: string;
  /** 扩展名含点，如 `.txt` / `.srt` */
  extension: string;
}

/**
 * 加载「按语言分子目录的纯文本文件树」中的一种语言。
 * Readable / Subtitle 结构一致，仅扩展名不同。
 */
export async function loadLocalizedTextFiles(
  options: LoadLocalizedTextFilesOptions,
): Promise<LocalizedTextFile[]> {
  const { dir, lang, extension } = options;
  const ext = extension.startsWith(".") ? extension : `.${extension}`;

  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return [];
    }
    throw err;
  }

  const files = names.filter(n => n.toLowerCase().endsWith(ext.toLowerCase()));
  const rows = await Promise.all(
    files.map(async fileName => {
      const text = await fs.readFile(path.join(dir, fileName), "utf-8");
      return {
        id: fileBaseId(fileName, lang),
        text,
        fileName,
      };
    }),
  );

  rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return rows;
}
