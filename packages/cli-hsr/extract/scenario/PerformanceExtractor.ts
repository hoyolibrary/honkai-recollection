import fs from "fs/promises";
import JSONBig from "json-bigint";
import TextMap from "../../text";
import type {
  HsrPerformanceA,
  HsrPerformanceBase,
  HsrPerformanceC,
  HsrPerformanceD,
  HsrPerformanceDS,
  HsrPerformanceE,
  HsrPerformanceIndex,
  HsrPerformanceReplayOverride,
  HsrPerformanceSkipFlag,
  HsrPerformanceSkipOverride,
  HsrPerformanceSourceTable,
  HsrPerformanceType,
  HsrPerformanceVideo,
} from "@game/games/hsr/HsrPerformance";
import type {
  PerformanceA,
  PerformanceC,
  PerformanceD,
  PerformanceDS,
  PerformanceE,
  PerformanceReplayOverride,
  PerformanceSkipFlag,
  PerformanceSkipOverride,
  PerformanceVideo,
} from "schema/Performance";

export interface HsrPerformanceData {
  A: HsrPerformanceA[];
  C: HsrPerformanceC[];
  D: HsrPerformanceD[];
  DS: HsrPerformanceDS[];
  E: HsrPerformanceE[];
  Video: HsrPerformanceVideo[];
  index: HsrPerformanceIndex[];
  skipOverride: HsrPerformanceSkipOverride[];
  replayOverride: HsrPerformanceReplayOverride[];
  skipFlag: HsrPerformanceSkipFlag[];
}

async function readConfig<T>(table: HsrPerformanceSourceTable): Promise<T[]> {
  const json = await fs.readFile(`./data/ExcelOutput/${table}.json`, "utf-8");
  return JSONBig.parse(json);
}

async function readRawConfig<T>(fileName: string): Promise<T[]> {
  const json = await fs.readFile(`./data/ExcelOutput/${fileName}.json`, "utf-8");
  return JSONBig.parse(json);
}

export class PerformanceExtractor {
  performanceAConfigs: PerformanceA[] = [];
  performanceCConfigs: PerformanceC[] = [];
  performanceDConfigs: PerformanceD[] = [];
  performanceDSConfigs: PerformanceDS[] = [];
  performanceEConfigs: PerformanceE[] = [];
  performanceVideoConfigs: PerformanceVideo[] = [];
  skipOverrideConfigs: PerformanceSkipOverride[] = [];
  replayOverrideConfigs: PerformanceReplayOverride[] = [];
  skipFlagCConfigs: PerformanceSkipFlag[] = [];
  skipFlagDConfigs: PerformanceSkipFlag[] = [];
  skipFlagEConfigs: PerformanceSkipFlag[] = [];

  constructor(private lang: string) {}

  async init() {
    // Desc 文案解析依赖 TextMap，必须先加载语言包
    await TextMap.loadMap(this.lang);
    [
      this.performanceAConfigs,
      this.performanceCConfigs,
      this.performanceDConfigs,
      this.performanceDSConfigs,
      this.performanceEConfigs,
      this.performanceVideoConfigs,
      this.skipOverrideConfigs,
      this.replayOverrideConfigs,
      this.skipFlagCConfigs,
      this.skipFlagDConfigs,
      this.skipFlagEConfigs,
    ] = await Promise.all([
      readConfig<PerformanceA>("PerformanceA"),
      readConfig<PerformanceC>("PerformanceC"),
      readConfig<PerformanceD>("PerformanceD"),
      readConfig<PerformanceDS>("PerformanceDS"),
      readConfig<PerformanceE>("PerformanceE"),
      readConfig<PerformanceVideo>("PerformanceVideo"),
      readRawConfig<PerformanceSkipOverride>("PerformanceSkipOverride"),
      readRawConfig<PerformanceReplayOverride>("PerformanceReplayOverride"),
      readRawConfig<PerformanceSkipFlag>("PerformanceSkipFlagC"),
      readRawConfig<PerformanceSkipFlag>("PerformanceSkipFlagD"),
      readRawConfig<PerformanceSkipFlag>("PerformanceSkipFlagE"),
    ]);
  }

  private mapBase<T extends HsrPerformanceType>(
    d: PerformanceA,
    type: T,
  ): HsrPerformanceBase<T> {
    return {
      id: d.PerformanceID,
      type,
      path: d.PerformancePath,
      planeId: d.PlaneID,
      floorId: d.FloorID,
      isSkip: d.IsSkip,
      startBlack: d.StartBlack,
      endBlack: d.EndBlack,
      endWithCrack: d.EndWithCrack,
    };
  }

  getExtractedData(): HsrPerformanceData {
    const A: HsrPerformanceA[] = this.performanceAConfigs.map(d => this.mapBase(d, "A"));
    const C: HsrPerformanceC[] = this.performanceCConfigs.map(d => this.mapBase(d, "C"));
    const D: HsrPerformanceD[] = this.performanceDConfigs.map(d => ({
      ...this.mapBase(d, "D"),
      performanceCharacter: d.PerformanceCharacter,
      groupId: d.GroupID,
      changePlayerType: d.ChangePlayerType,
    }));
    const DS: HsrPerformanceDS[] = this.performanceDSConfigs.map(d => ({
      ...this.mapBase(d, "DS"),
      performanceCharacter: d.PerformanceCharacter,
      groupId: d.GroupID,
      changePlayerType: d.ChangePlayerType,
    }));
    const E: HsrPerformanceE[] = this.performanceEConfigs.map(d => ({
      ...this.mapBase(d, "E"),
      performanceCharacter: d.PerformanceCharacter,
      isIntroDialogue: d.IsIntroDialogue,
      changePlayerType: d.ChangePlayerType,
    }));
    const Video: HsrPerformanceVideo[] = this.performanceVideoConfigs.map(d =>
      this.mapBase(d, "Video"),
    );

    for (const items of [A, C, D, DS, E, Video]) {
      items.sort((a, b) => a.id - b.id);
    }

    const index = [A, C, D, DS, E, Video].flatMap(items =>
      items.map(({ id, type, path }) => ({ id, type, path })),
    );

    const skipOverride = this.skipOverrideConfigs
      .map(d => {
        const item: HsrPerformanceSkipOverride = {
          id: d.PerformanceID,
          performanceType: d.PerformanceType,
          desc: TextMap.getText(this.lang, d.Desc?.Hash),
          isOverrideCharacter: d.IsOverrideCharacter === 1 ? true : undefined,
          overrideCharacterList: d.OverrideCharacterList ?? [],
          important:
            d.IsOverrideImportantFlag === 1 ? !!d.OverrideImportantFlag : undefined,
          confirmRequiredToSkip:
            d.IsConfirmRequiredToSkipFlag === 1 ? true : undefined,
          packId: d.PackID,
        };

        TextMap.setTagInfo(this.lang, d.Desc?.Hash, {
          category: {
            performance: d.PerformanceID + "",
            type: "PerformanceSkipOverride",
          },
          tags: ["performance"],
        });

        return item;
      })
      .sort((a, b) => a.id - b.id);

    const replayOverride = this.replayOverrideConfigs
      .map(d => {
        const item: HsrPerformanceReplayOverride = {
          id: d.PerformanceID,
          performanceType: d.PerformanceType,
          desc: TextMap.getText(this.lang, d.Desc?.Hash),
        };

        TextMap.setTagInfo(this.lang, d.Desc?.Hash, {
          category: {
            performance: d.PerformanceID + "",
            type: "PerformanceReplayOverride",
          },
          tags: ["performance"],
        });

        return item;
      })
      .sort((a, b) => a.id - b.id);

    // SkipFlagC/D/E 按演出类型分表、ID 互斥，合并为一张标记表
    const skipFlag = [
      ...this.skipFlagCConfigs,
      ...this.skipFlagDConfigs,
      ...this.skipFlagEConfigs,
    ]
      .map(d => {
        const item: HsrPerformanceSkipFlag = {
          id: d.PerformanceID,
          skippable: d.Skippable,
          actorList: d.ActorList ?? [],
          containImportBranch: d.ContainImportBranch === true ? true : undefined,
        };
        return item;
      })
      .sort((a, b) => a.id - b.id);

    return { A, C, D, DS, E, Video, index, skipOverride, replayOverride, skipFlag };
  }
}
