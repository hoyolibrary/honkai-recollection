import type { RogueTitanCategory } from "./enum/RogueTitanCategory";
import type { RogueTitanType } from "./enum/RogueTitanType";

/** 对齐 DummyDll 中的 RPG.GameCore.RogueTournTitanTypeRow。 */
export interface RogueTournTitanType {
  RogueTitanType: RogueTitanType;
  RogueTitanCategory: RogueTitanCategory;
  TitanTitle: {
    Hash: bigint;
  };
  CharacterName: {
    Hash: bigint;
  };
  RogueTitanCardIcon: string;
  RogueTitanCardShadowIcon: string;
  RogueTitanTalentIcon: string;
  RogueTitanAvatarRoundIconSmall: string;
  RogueTitanAvatarRoundIconMid: string;
}
