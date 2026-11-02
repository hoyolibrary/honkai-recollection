/** 对齐 DummyDll 中的 RPG.GameCore.ActivityDiceCombatAvatarRow。 */
export interface ActivityDiceAvatarConfig {
  DiceAvatarID: number;
  Rare: number;
  Name: {
    Hash: bigint;
  };
  HP: number;
  SkillID: number;
  DiceIDPerRare: number[];
  DiceCountPerRare: number[];
  AttackDiceNumber?: number;
  DefendDiceNumber: number;
  ImgPath: string;
  ImgPathUI3D: string;
  HighLevelBGImgPath: string;
  HighLevelBGImgPathUI3D: string;
  ImgPathHeadIcon: string;
  ShopIcon: string;
  IsCollection?: boolean;
  AttackEffectPath: string;
  AttackEffectEnemyPath: string;
  AttackAnimation: string;
  RecommendDiceIDList: number[];
  FinalAttackVoice: string;
  AttackJson: string;
  ColorfulDiceAvailableCount?: number;
}
