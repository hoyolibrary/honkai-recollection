import {
  discoverTextMapLangs,
  type TextMapFileMatch,
  type DiscoverTextMapLangsResult,
} from "hoyo-cli-common";

/**
 * HSR TextMap 文件名规则（对齐 url.ts 的 MatchItem 风格）。
 *
 * - 纳入：`TextMap{Lang}.json` / `TextMap{Lang}_{n}.json`
 * - 排除：`TextMapMain*`（进游戏前系统文本本地化）
 */
export const hsrTextMapFileMatches: TextMapFileMatch[] = [
  {
    pattern: /^TextMap(?!Main)([A-Za-z]+)(_\d+)*\.json$/i,
    fn: (_full, lang, suffix) => ({
      lang,
      part: suffix ? lang + suffix : lang,
    }),
  },
];

export function discoverHsrTextMapLangs(fileNames: string[]): DiscoverTextMapLangsResult {
  return discoverTextMapLangs(fileNames, hsrTextMapFileMatches);
}
