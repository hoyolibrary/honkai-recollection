import type { GridFightPreset } from "./enum/GridFightPreset";
import type { GridFightRoleSkillTag } from "./enum/GridFightRoleSkillTag";

/** 对齐 DummyDll 中的 RPG.GameCore.GridFightRoleSkillDisplayConfigRow。复合主键 (RoleID, FrontBackType)。 */
export interface GridFightRoleSkillDisplay {
  RoleID: number;
  FrontBackType: GridFightPreset;
  Name: {
    Hash: bigint;
  };
  IconPath: string;
  CategoryTagList: GridFightRoleSkillTag[];
}
