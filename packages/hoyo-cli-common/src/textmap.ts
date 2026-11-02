import fs from "fs/promises";
import path from "path";
import _ from "lodash";

/**
 * TextMap 内部 Map 键类型。
 * - HSR：bigint（xxhash64；JSON 文件 key 经 parseKey 转为 bigint）
 * - GI：number（uint32 / *TextMapHash）
 */
export type TextHashKey = string | number | bigint;

/**
 * 调用方传入的 hash：除 H 本身外，兼容 json-bigint 默认的 BigNumber 等
 * （有 toString 的对象，在入口 toHash 时转成 H）。
 */
export type TextHashInput<H extends TextHashKey> = H | { toString(): string };

/** 游戏侧注入的哈希器：明文内部标识符 → TextMap 键 */
export interface TextHasher<H extends TextHashKey = TextHashKey> {
  /** 可选异步初始化（如加载 wasm） */
  init?(): Promise<void>;
  /** 明文 → TextMap 键 */
  hash(text: string): H;
}

export interface TextMapOptions<H extends TextHashKey = TextHashKey> {
  hasher: TextHasher<H>;
  fixText?: (text: string) => string;
  /** TextMap 目录，默认 ./data/TextMap */
  textMapDir?: string;
  /**
   * 将 TextMap JSON 的 key 字符串解析为 H。
   * 默认：number → `Number(key) >>> 0`，否则 `BigInt(key)`。
   */
  parseKey?: (key: string) => H;
}

export interface TextMapTagInfo {
  tags: string[];
  category: Record<string, string>;
}

export type TaggedTextMapEntry = {
  id: string;
  text: string;
  tags?: string[];
  category?: Record<string, string>;
};

const defaultFixText = (text: string) => text;

function defaultParseKey<H extends TextHashKey>(key: string, sample?: H): H {
  if (typeof sample === "number") {
    return (Number(key) >>> 0) as H;
  }
  if (typeof sample === "string") {
    return key as H;
  }
  return BigInt(key) as H;
}

/**
 * 多语言 TextMap 加载 / 查询 / 打标。
 *
 * @typeParam H 哈希键类型。HSR 用 `bigint`，GI 用 `number`（uint32）。
 *
 * 内层使用 `Map<H, string>` 存文案，查表直接 `map.get(hash)`，
 * 不必再把键折成 object 的字符串 key。
 */
export class TextMap<H extends TextHashKey = bigint> {
  /** lang → (hash → text) */
  private cache = new Map<string, Map<H, string>>();
  /** lang → (hash → tagInfo) */
  private tags = new Map<string, Map<H, TextMapTagInfo>>();
  private hasherReady = false;
  private readonly hasher: TextHasher<H>;
  private readonly fixText: (text: string) => string;
  private readonly textMapDir: string;
  private readonly parseKey: (key: string) => H;
  /** 用于 defaultParseKey / toHash 的类型样本 */
  private hashSample: H | undefined;

  /** lang → 分片列表，加载时拼 `TextMap${part}.json` */
  textmapPartMap: Record<string, string[]> = {};

  constructor(options: TextMapOptions<H>) {
    this.hasher = options.hasher;
    this.fixText = options.fixText ?? defaultFixText;
    this.textMapDir = options.textMapDir ?? "./data/TextMap";
    this.parseKey =
      options.parseKey ??
      ((key: string) => defaultParseKey(key, this.hashSample));
  }

  private async ensureHasher() {
    if (!this.hasherReady) {
      if (this.hasher.init) {
        await this.hasher.init();
      }
      try {
        this.hashSample = this.hasher.hash("");
      } catch {
        // hasher 可能不接受空串；parseKey 默认走 BigInt
      }
      this.hasherReady = true;
    }
  }

  /**
   * 将调用方传入的 hash 规范为内部 Map 键 H。
   * - number / bigint / string：直接规范化
   * - json-bigint 默认 BigNumber 等 object：parseKey(String(...)) → H
   * 这样调用侧可继续 `import JSONBig from "json-bigint"`，无需全仓改 useNativeBigInt。
   */
  private toHash(hash: TextHashInput<H>): H {
    const t = typeof hash;
    if (t === "number") {
      // 统一无符号 uint32（GI）
      return ((hash as number) >>> 0) as H;
    }
    if (t === "bigint" || t === "string") {
      return hash as H;
    }
    // BigNumber 等
    return this.parseKey(String(hash));
  }

  async loadMap(lang: string) {
    await this.ensureHasher();

    let map = this.cache.get(lang);
    if (!map) {
      const parts = this.textmapPartMap[lang];
      if (!parts?.length) {
        throw new Error(`TextMap parts not configured for lang: ${lang}`);
      }
      const jsons = await Promise.all(
        parts.map(part =>
          fs.readFile(path.join(this.textMapDir, `TextMap${part}.json`), "utf-8"),
        ),
      );

      map = new Map<H, string>();
      for (const json of jsons) {
        const textmap = JSON.parse(json) as Record<string, string>;
        for (const [key, value] of Object.entries(textmap)) {
          // 后加载分片覆盖先加载的同 key（如 GI Medium）
          map.set(this.parseKey(key), value);
        }
      }
      this.cache.set(lang, map);
      this.tags.set(lang, new Map());
    }
    return map;
  }

  /**
   * 按预计算哈希查文案。
   * @param hash 内部为 H；HSR 也可直接传 json-bigint 默认的 BigNumber（入口转换）
   */
  getText(lang: string, hash: TextHashInput<H> | null | undefined): string {
    if (hash == null) {
      return "";
    }
    // 必须先 loadMap
    const text = this.cache.get(lang)?.get(this.toHash(hash));
    return this.fixText(text || "");
  }

  /** 对内部标识符字符串哈希后查表（出现频率较低） */
  getHashedText(lang: string, text: string | null | undefined): string {
    return this.getText(lang, text != null && text !== "" ? this.hasher.hash(text) : null);
  }

  setTagInfo(
    lang: string,
    hash: TextHashInput<H> | null | undefined,
    info: Partial<TextMapTagInfo>,
  ) {
    if (hash == null) {
      return;
    }
    const h = this.toHash(hash);
    const tagMap = this.tags.get(lang);
    if (!tagMap) {
      return;
    }
    let tagInfo = tagMap.get(h);
    if (!tagInfo) {
      tagInfo = { tags: [], category: {} };
      tagMap.set(h, tagInfo);
    }
    if (info.tags?.length) {
      tagInfo.tags = _.uniq(tagInfo.tags.concat(info.tags));
    }
    if (info.category) {
      Object.assign(tagInfo.category, info.category);
    }
  }

  setHashedTagInfo(
    lang: string,
    text: string | null | undefined,
    info: Partial<TextMapTagInfo>,
  ) {
    this.setTagInfo(lang, text != null && text !== "" ? this.hasher.hash(text) : null, info);
  }

  getMapWithTagInfo(lang: string): TaggedTextMapEntry[] {
    const map = this.cache.get(lang);
    const tagMap = this.tags.get(lang);
    const ret: TaggedTextMapEntry[] = [];
    if (!map) {
      return ret;
    }

    for (const [hash, value] of map) {
      const tagInfo = tagMap?.get(hash);
      ret.push({
        id: String(hash),
        text: this.fixText(value || ""),
        tags: tagInfo?.tags,
        category: tagInfo?.category,
      });
    }

    // 给第一行补全字段，防止 navicat 找不到字段
    if (ret[0]) {
      ret[0].tags ||= [];
      ret[0].category ||= {};
    }
    return ret;
  }

  findHashesByCHSText(textCHS: string[]): Record<string, H | undefined> {
    const ret = textCHS.reduce(
      (a, text) => {
        a[text] = undefined;
        return a;
      },
      {} as Record<string, H | undefined>,
    );

    const map = this.cache.get("CHS");
    if (!map) {
      return ret;
    }
    for (const [hash, text] of map) {
      if (textCHS.includes(text)) {
        ret[text] = hash;
      }
    }
    return ret;
  }
}

export interface DiscoverTextMapLangsResult {
  /** 去重后的语言列表（按首次出现顺序） */
  langs: string[];
  /**
   * lang → 加载分片列表。`TextMap.loadMap` 拼路径为 `TextMap${part}.json`。
   * part 的具体含义由各游戏的 {@link TextMapFileMatch} 决定。
   */
  textmapPartMap: Record<string, string[]>;
}

/**
 * 单条 TextMap 文件名匹配规则（风格对齐 url 的 MatchItem / matchUrl）。
 * 正则与 part 提取放在各游戏包，common 不堆积命名约定。
 */
export type TextMapFileMatch = {
  pattern: RegExp;
  /**
   * `...RegExpExecArray`：第 0 项为整串，其后为捕获组。
   * 返回 null 表示匹配到但丢弃；否则提供语言码与 load 用的 part。
   */
  fn: (...groups: string[]) => { lang: string; part: string } | null;
};

/**
 * 按游戏提供的 matches 扫描文件名，组装语言与分片。
 *
 * 遍历顺序：**先按 matches 顺序，再扫 fileNames**。
 * 因此「主表规则在前、Medium 规则在后」即可控制加载顺序，而无需在 common 写死命名。
 */
export function discoverTextMapLangs(
  fileNames: string[],
  matches: TextMapFileMatch[],
): DiscoverTextMapLangsResult {
  const langs: string[] = [];
  const textmapPartMap: Record<string, string[]> = {};

  for (const rule of matches) {
    for (const name of fileNames) {
      const result = rule.pattern.exec(name);
      if (!result) {
        continue;
      }
      const parsed = rule.fn(...result);
      if (!parsed) {
        continue;
      }
      const { lang, part } = parsed;
      if (!textmapPartMap[lang]) {
        langs.push(lang);
        textmapPartMap[lang] = [];
      }
      if (!textmapPartMap[lang].includes(part)) {
        textmapPartMap[lang].push(part);
      }
    }
  }

  return { langs, textmapPartMap };
}
