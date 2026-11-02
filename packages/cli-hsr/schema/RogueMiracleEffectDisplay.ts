/**
 * 模拟宇宙奇物效果展示表 RogueMiracleEffectDisplay（主键 MiracleEffectDisplayID，与 RogueMiracle.MiracleEffectDisplayID 关联）。
 * DummyDll 中未找到对应行类型，按 JSON 数据实测形态标注。
 */
export interface RogueMiracleEffectDisplay {
  MiracleEffectDisplayID: number;
  MiracleDesc?: {
    Hash: bigint;
  };
  DescParamList: { Value: number }[];
  ExtraEffect: number[];
  MiracleSimpleDesc?: {
    Hash: bigint;
  };
}
