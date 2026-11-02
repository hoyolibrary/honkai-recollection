import type { AvatarPropertyType } from "./enum/AvatarPropertyType";
import type { RelicType } from "./enum/RelicType";

/** 对齐 DummyDll 中的 RPG.GameCore.RelicBaseTypeRow。 */
export interface RelicBaseType {
  Type?: RelicType;
  BaseTypeText?: {
    Hash: bigint;
  };
  BaseTypeIconPath: string;
  ValidPropertyList: AvatarPropertyType[];
}
