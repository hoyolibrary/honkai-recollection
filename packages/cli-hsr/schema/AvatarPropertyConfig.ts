import type { AvatarPropertyType } from "./enum/AvatarPropertyType";

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarPropertyRow。 */
export interface AvatarPropertyConfig {
  PropertyType: AvatarPropertyType;
  PropertyName: {
    Hash: bigint;
  };
  PropertyNameRelic: {
    Hash: bigint;
  };
  PropertyNameFilter: {
    Hash: bigint;
  };
  IsDisplay?: boolean;
  isBattleDisplay?: boolean;
  Order: number;
  IconPath: string;
  PropertyInstructionID?: number;
  PropertyNameSkillTree?: {
    Hash: bigint;
  };
  PropertyClassify?: number;
  MainRelicFilter?: number;
  SubRelicFilter?: number;
}
