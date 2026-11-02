import type { MapSpaceType } from "./enum/MapSpaceType";

/** 对齐 DummyDll 中的 RPG.GameCore.WorldDataConfigRow。 */
export interface WorldDataConfig {
  ID: number;
  WorldName?: {
    Hash: bigint;
  };
  WorldLanguageName?: {
    Hash: bigint;
  };
  MapSpaceTypeList: MapSpaceType[];
  ChapterIconBigPath: string;
  ChronicleWorldBgPath: string;
  ChronicleWorldSubBgPath: string;
  ChronicleWorldPredictPath: string;
  ChronicleWorldProcessingPath: string;
  CameraWidth: number;
  CameraHeight: number;
  SmallWorldIconPath: string;
  IsRealWorld?: boolean;
  IsShow?: boolean;
  WorldDesc?: {
    Hash: bigint;
  };
  SimpleWorldDesc?: {
    Hash: bigint;
  };
  TrainSpaceType?: MapSpaceType;
}
