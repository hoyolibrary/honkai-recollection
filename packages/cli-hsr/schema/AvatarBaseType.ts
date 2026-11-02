import type { AvatarBaseType as AvatarBaseTypeEnum } from "./enum/AvatarBaseType";

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarBaseTypeRow。 */
export interface AvatarBaseType {
  ID?: AvatarBaseTypeEnum;
  BaseTypeIcon: string;
  BaseTypeIconMiddle: string;
  BaseTypeIconSmall: string;
  EquipmentLightMatPath: string;
  Equipment3DTgaPath: string;
  BaseTypeIconPathTalk: string;
  BgPath: string;
  LightConeCardBackImagePath: string;
  BaseTypeText: {
    Hash: bigint;
  };
  BaseTypeDesc: {
    Hash: bigint;
  };
  FirstWordText: string;
}
