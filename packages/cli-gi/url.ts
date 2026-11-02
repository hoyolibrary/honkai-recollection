import { normalizeAssetPath, matchUrl, type MatchItem } from "hoyo-cli-common";

export { normalizeAssetPath };

/** 占位站点名；映射明细后续补充 */
export type SiteNames = "dicloud" | "main";

const dicloudMatches: MatchItem[] = [
  // GI 资源 URL 映射明细后续补充
];

const mainSiteMatches: MatchItem[] = [];

export function getUrl(filepath: string, site: SiteNames = "dicloud") {
  if (!filepath) {
    return "";
  }
  filepath = normalizeAssetPath(filepath);
  switch (site) {
    case "dicloud":
      // baseUrl 占位，有 matches 前原样拼接路径
      return matchUrl(filepath, dicloudMatches, "https://cdn2.dicloud.work/static/apps/yuanshen/");
    case "main":
      return matchUrl(filepath, mainSiteMatches, "/");
    default:
      throw new Error(`Unknown site: ${site}`);
  }
}
