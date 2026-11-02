import xxhash from "xxhash-wasm";
import {
  TextMap,
  type TextHasher,
  type TextMapTagInfo,
} from "hoyo-cli-common";

export type { TextMapTagInfo };
export { TextMap };

export type HsrTextMap = {
  hash: string;
  [x: `text${string}`]: string;
} & TextMapTagInfo;

/** HSR TextMap 键：xxhash64 → bigint */
export type HsrHash = bigint;

function fixText(text: string) {
  // icon标签丢失闭合
  if (text.includes("<icon ")) {
    text = text.replaceAll(/(<icon [^>]+)>/g, "$1 />");
  }
  if (text.includes("<gridfightinfo ")) {
    text = text.replaceAll(/(<gridfightinfo [^>]+)>/g, "$1 />");
  }
  return text;
}

/** HSR 使用 xxhash64 作为明文内部标识符 → TextMap 键算法 */
class XxHash64Hasher implements TextHasher<HsrHash> {
  private h64: ((input: string, seed?: bigint) => bigint) | null = null;

  async init() {
    this.h64 = (await xxhash()).h64;
  }

  hash(text: string): HsrHash {
    if (!this.h64) {
      throw new Error("XxHash64Hasher not initialized; call loadMap first");
    }
    return this.h64(text);
  }
}

export default new TextMap<HsrHash>({
  hasher: new XxHash64Hasher(),
  fixText,
  parseKey: key => BigInt(key),
});
