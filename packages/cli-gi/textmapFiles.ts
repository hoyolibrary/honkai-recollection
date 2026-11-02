import {
  discoverTextMapLangs,
  type TextMapFileMatch,
  type DiscoverTextMapLangsResult,
} from "hoyo-cli-common";

/**
 * GI TextMap 文件名规则（对齐 url.ts 的 MatchItem 风格）。
 *
 * 规则顺序即加载顺序：先主表，再 Medium（同 key 时 Medium 覆盖）。
 * 命名若变更，只改本文件中的 pattern / fn。
 */
export const giTextMapFileMatches: TextMapFileMatch[] = [
  {
    // TextMapCHS.json / TextMapRU_0.json
    // (?!Main) 与 HSR 一致排除进游戏前包（GI 通常无 Main）
    pattern: /^TextMap(?!Main)([A-Za-z]+)(_\d+)*\.json$/i,
    fn: (_full, lang, suffix) => ({
      lang,
      part: suffix ? lang + suffix : lang,
    }),
  },
  {
    // TextMap_MediumCHS.json / TextMap_MediumRU_0.json — 需并入同一 lang
    pattern: /^TextMap_Medium([A-Za-z]+)(_\d+)*\.json$/i,
    fn: (_full, lang, suffix) => ({
      lang,
      // TextMap + part === 去掉 .json 的文件名
      part: suffix ? `_Medium${lang}${suffix}` : `_Medium${lang}`,
    }),
  },
];

export function discoverGiTextMapLangs(fileNames: string[]): DiscoverTextMapLangsResult {
  return discoverTextMapLangs(fileNames, giTextMapFileMatches);
}
