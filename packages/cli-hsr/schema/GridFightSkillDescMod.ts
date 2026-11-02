/** 对齐 DummyDll 中的 RPG.GameCore.GridFightSkillDescModConfigRow。复合主键 (ModifySkillID, ModifySkillType)。 */
export interface GridFightSkillDescMod {
  ModifySkillID: number;
  ModifySkillType?: string;
  ModifySkillDesc: {
    Hash: bigint;
  };
  ModifySkillSimpleDesc?: {
    Hash: bigint;
  };
}
