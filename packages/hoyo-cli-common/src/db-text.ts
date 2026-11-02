/**
 * 导入数据库用的单语文本行（与 HSR textmap_out / GI textmap_out 对齐的最小形状）
 */
export interface DbTextRow {
  id: string;
  text: string;
  tags?: string[];
  category?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Navicat 等工具按首行推断字段：保证第一行具备 tags / category。
 */
export function finalizeDbTextRows<T extends DbTextRow>(rows: T[]): T[] {
  if (rows[0]) {
    rows[0].tags ||= [];
    rows[0].category ||= {};
  }
  return rows;
}
