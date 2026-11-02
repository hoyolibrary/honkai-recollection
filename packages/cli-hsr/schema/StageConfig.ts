/**
 * 对齐 DummyDll 中的 RPG.GameCore.StageConfigRow。
 * 仅镜像挑战提取所需字段子集（全表 29303 行，其余字段见原始 JSON）；
 * 非挑战类 Stage 行可能缺省 Level/分组字段，故标可选。
 */
export interface StageConfig {
  StageID: number;
  /** 关卡展示名；异相仲裁用其 Hash 唯一反查预览首领模板。 */
  StageName?: {
    Hash: bigint;
  };
  StageType: string;
  Level?: number;
  HardLevelGroup?: number;
  EliteGroup?: number;
  StageConfigData?: {
    BFLIFKBEOPJ: string;
    MNDFOPKBHKP: string;
  }[];
  /** 波次数组；波内键 `Monster0..MonsterN` 为该波有序站位（MonsterConfig.MonsterID） */
  MonsterList?: {
    [key: string]: number;
  }[];
}
