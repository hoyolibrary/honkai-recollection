import { TextMap, type TextMapTagInfo } from "hoyo-cli-common";
import { GiTextHasher, type GiHash } from "./hash";

export type { TextMapTagInfo, GiHash };
export { TextMap };

/**
 * GI TextMap：键类型为 {@link GiHash}（number / uint32）。
 *
 * @example
 * // 预计算键（常见）
 * TextMap.getText(lang, row.nameTextMapHash);
 * // 内部标识符（罕见）
 * TextMap.getHashedText(lang, "Some_Internal_Loc_Key");
 */
export default new TextMap<GiHash>({
  hasher: new GiTextHasher(),
  parseKey: key => Number(key) >>> 0,
  // fixText: 后续按 GI 富文本标签需要再加
});
