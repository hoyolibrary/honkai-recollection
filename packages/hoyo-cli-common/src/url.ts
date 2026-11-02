import path from "path/posix";

/**
 * 文件名保持不变，其余路径均转为小写字母
 */
export function normalizeAssetPath(filepath: string) {
  const fileName = path.basename(filepath);
  const pathname = path.dirname(filepath);
  return path.join(pathname.toLowerCase(), fileName);
}

export type MatchItem = {
  pattern: RegExp;
  fn: (...groups: string[]) => string;
};

/**
 * 按 matches 规则转换资源路径；无匹配时回落到 baseUrl + path
 */
export function matchUrl(pathStr: string, matches: MatchItem[], baseUrl: string): string | undefined {
  for (const match of matches) {
    const result = match.pattern.exec(pathStr);
    if (!result) {
      continue;
    }
    return match.fn(...result);
  }
  return baseUrl + pathStr;
}
