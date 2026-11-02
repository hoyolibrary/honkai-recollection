/** 对齐 DummyDll 中的 RPG.GameCore.GridFightConstCommonRow。Value 为变体（Int/Double/String/Array/Map）。 */
export interface GridFightConstCommon {
  ConstValueName: string;
  Value: GridFightConstValue;
}

export interface GridFightConstValue {
  IntValue?: number;
  DoubleValue?: number;
  StringValue?: string;
  ArrayValue?: GridFightConstValue[];
  MapValue?: GridFightConstValue | Record<string, GridFightConstValue>;
}
