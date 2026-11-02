import xxhash from "xxhash-wasm";
import type { TextHasher } from "hoyo-cli-common";

/** GI TextMap 键：uint32（用 number 表示，避免无意义的 BigInt 包装） */
export type GiHash = number;

/**
 * 原神 TextMap 键为 **uint32**（`GiHash` / `number`）。
 *
 * ## 语义（与 HSR 的 getHashedText 相同）
 *
 * 哈希对象是「本地化文本的**内部标识符**」，不是展示文案本身。
 *
 * HSR 示例（`AvatarRankConfig`）：
 * - Excel：`Name: "AvatarRankName_100101"`（内部 id 字符串）
 * - 查表：`TextMap.getHashedText(lang, d.Name)` → `hash(内部id)` → TextMap 键
 *
 * GI 侧更常见的是 Excel 已写入预计算数字：
 * - `nameTextMapHash: 14898380` → `TextMap.getText(lang, d.nameTextMapHash)`（直接 number）
 * - **几乎用不到** `getHashedText`；常见业务表都是 `*TextMapHash` 数字字段。
 *
 * ## 算法
 *
 * - 键空间：uint32
 * - 明文内部 id → 键：尚未用权威样本验证；暂用 **xxhash32**（`h32` seed=0）provisional
 * - `ManualTextMapConfigData.textMapId` **不是** 该哈希的输入
 *
 * 验证到正确算法后只改本文件；查表路径 `getText` 不受影响。
 */
export class GiTextHasher implements TextHasher<GiHash> {
  private h32: ((input: string, seed?: number) => number) | null = null;

  async init() {
    this.h32 = (await xxhash()).h32;
  }

  hash(text: string): GiHash {
    if (!this.h32) {
      throw new Error("GiTextHasher not initialized; call loadMap first");
    }
    // 无符号 uint32
    return this.h32(text) >>> 0;
  }
}
