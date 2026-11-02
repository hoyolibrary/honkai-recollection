/** StroyLineUIData：编年史多视角故事线 UI 表（上游表名拼写即为 Stroy） */
export interface StroyLineUIData {
  StoryLineID?: number;
  Gender?: string;
  Name?: { Hash: bigint };
  IconPath?: string;
  ChronicleIconPath?: string;
  MediumImgPath?: string;
  LargeImgPath?: string;
  FigurePath?: string;
  Color?: string;
}
