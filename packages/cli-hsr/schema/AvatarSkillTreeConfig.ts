import type { AvatarPropertyType } from "./enum/AvatarPropertyType";
import type { AvatarSkillTreeAnchorType } from "./enum/AvatarSkillTreeAnchorType";
import type { AvatarSkillTreePointTriggerKey } from "./enum/AvatarSkillTreePointTriggerKey";
import type { ItemConfigEntry } from "./ItemConfig";

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarSkillTreeRow。 */
export interface AvatarSkillTreeConfig {
  PointID: number;
  Level: number;
  AvatarID: number;
  PointType: number;
  AnchorType: AvatarSkillTreeAnchorType;
  MaxLevel: number;
  DefaultUnlock?: boolean;
  PrePoint: number[];
  StatusAddList: AvatarPropertyValue[];
  MaterialList: ItemConfigEntry[];
  LevelUpSkillID: number[];
  IconPath: string;
  PointName: string;
  PointDesc: string;
  SimplePointDesc: string;
  ExtraEffectIDList: number[];
  SimpleExtraEffectIDList: number[];
  RecommendPriority?: number;
  AbilityName: string;
  PointTriggerKey: AvatarSkillTreePointTriggerKey;
  ParamList: { Value: number }[];
  AvatarPromotionLimit?: number;
  AvatarLevelLimit?: number;
  EnhancedID?: number;
}

/** 对齐 DummyDll 中的 RPG.GameCore.AvatarPropertyValue。 */
export interface AvatarPropertyValue {
  Value: {
    Value: number;
  };
  PropertyType: AvatarPropertyType;
}
