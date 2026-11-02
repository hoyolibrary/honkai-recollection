/** 对齐 DummyDll 中的 RPG.GameCore.ScheduleDataGlobalRow。 */
export interface ScheduleDataGlobal {
  ID: number;
  /** 与 GlobalBeginTime 互斥（一空一值），取非空者 */
  BeginTime: string;
  GlobalBeginTime: string;
  EndTime: string;
  GlobalEndTime: string;
}
