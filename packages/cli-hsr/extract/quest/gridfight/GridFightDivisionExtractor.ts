import _ from "lodash";
import type { GridFightAffixConfig } from "schema/GridFightAffixConfig";
import type { GridFightBinaryDiffAddRule } from "schema/GridFightBinaryDiffAddRule";
import type { GridFightCamp } from "schema/GridFightCamp";
import type { GridFightConstCommon } from "schema/GridFightConstCommon";
import type { GridFightDivisionInfo } from "schema/GridFightDivisionInfo";
import type { GridFightDivisionLevelShow } from "schema/GridFightDivisionLevelShow";
import type { GridFightDivisionStage } from "schema/GridFightDivisionStage";
import type { GridFightEnemyDifficultyLv } from "schema/GridFightEnemyDifficultyLv";
import type {
  HsrGridFightAffix,
  HsrGridFightCamp,
  HsrGridFightDivision,
} from "@game/games/hsr/quest/gridfight";
import TextMap from "../../../text";
import { gridFightUrl, readExcel, tag, values } from "./common";

/** DummyDll/报告口径：普通强化词条 → 侵蚀词条。导出 Map 键被压扁，按此表理解。 */
const TAN_TAO_AFFIX: Record<number, number> = {
  1001: 1006,
  1002: 1006,
  1003: 1007,
  1004: 1008,
  1005: 1009,
};

export class GridFightDivisionExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  infos: GridFightDivisionInfo[] = [];
  stages: GridFightDivisionStage[] = [];
  levelShows: GridFightDivisionLevelShow[] = [];
  difficulties: GridFightEnemyDifficultyLv[] = [];
  affixes: GridFightAffixConfig[] = [];
  camps: GridFightCamp[] = [];
  binaryRules: GridFightBinaryDiffAddRule[] = [];
  consts: GridFightConstCommon[] = [];

  private invasionAffixIds = new Set<number>([1006, 1007, 1008, 1009]);
  invasionLevel?: number;

  async init() {
    this.infos = await readExcel("GridFightDivisionInfo");
    this.stages = await readExcel("GridFightDivisionStage");
    this.levelShows = await readExcel("GridFightDivisionLevelShow");
    this.difficulties = await readExcel("GridFightEnemyDifficultyLv");
    this.affixes = await readExcel("GridFightAffixConfig");
    this.camps = await readExcel("GridFightCamp");
    this.binaryRules = await readExcel("GridFightBinaryDiffAddRule");
    this.consts = await readExcel("GridFightConstCommon");

    const levelConst = this.consts.find(c => c.ConstValueName === "GridFight_TanTao_Level");
    this.invasionLevel = levelConst?.Value?.IntValue;
    for (const id of Object.values(TAN_TAO_AFFIX)) {
      this.invasionAffixIds.add(id);
    }

    await TextMap.loadMap(this.lang);
  }

  getDivisionList(): HsrGridFightDivision[] {
    const stageById = Object.fromEntries(this.stages.map(s => [s.DivisionID, s]));
    const showByKey = Object.fromEntries(
      this.levelShows.map(s => [`${s.SeasonID}_${s.DivisionLevel || 0}`, s]),
    );
    const diffByLevel = _.groupBy(this.difficulties, d => d.EnemyDifficultyLevel || 0);
    const binaryById = _.groupBy(this.binaryRules, r => r.ID);

    const data = this.infos.map(info => {
      const stage = stageById[info.ID];
      const show = showByKey[`${info.SeasonID}_${info.DivisionLevel || 0}`];
      const diffs = _.sortBy(diffByLevel[stage?.EnemyDifficultyLevel || 0] || [], d => d.ChapterID);
      const binary = binaryById[stage?.BinaryNodeDiffAddRule || 0] || [];

      tag(this.lang, info.DivisionName?.Hash, "GridFightDivisionInfo", "gridfight_division", info.ID);
      tag(this.lang, show?.DivisionName?.Hash, "GridFightDivisionLevelShow", "gridfight_division", info.ID);
      tag(this.lang, show?.DivisionAbbr?.Hash, "GridFightDivisionLevelShow", "gridfight_division", info.ID);

      const environmentDescs = (stage?.EnvironmentDescList || [])
        .map(key => TextMap.getHashedText(this.lang, key))
        .filter(Boolean);
      const uniqueEnvironmentDescs = (stage?.UniqueEnvironmentDescList || [])
        .map(key => TextMap.getHashedText(this.lang, key))
        .filter(Boolean);

      for (const key of [...(stage?.EnvironmentDescList || []), ...(stage?.UniqueEnvironmentDescList || [])]) {
        TextMap.setHashedTagInfo(this.lang, key, {
          category: { gridfight_division: info.ID + "", type: "GridFightDivisionStage" },
          tags: ["gridfight_division"],
        });
      }

      return {
        id: info.ID,
        code: info.ID + "",
        name: TextMap.getText(this.lang, show?.DivisionName?.Hash || info.DivisionName?.Hash),
        icon: gridFightUrl(show?.DivisionIcon || info.DivisionIcon),
        seasonId: info.SeasonID,
        progress: info.Progress,
        divisionLevel: info.DivisionLevel,
        abbr: TextMap.getText(this.lang, show?.DivisionAbbr?.Hash) || undefined,
        isPromotion: info.IsPromotion,
        enemyDifficultyLevel: stage?.EnemyDifficultyLevel,
        affixChooseNumList: stage?.AffixChooseNumList?.length ? stage.AffixChooseNumList : undefined,
        environmentDescs: environmentDescs.length ? environmentDescs : undefined,
        uniqueEnvironmentDescs: uniqueEnvironmentDescs.length ? uniqueEnvironmentDescs : undefined,
        hpMulti: stage?.LevelBaseHPMultiRatio?.Value,
        attackMulti: stage?.LevelBaseAttackMultiRatio?.Value,
        weeklyScoreModify: stage?.WeeklyScoreModify,
        expModify: stage?.ExpModify,
        binaryNodeDiffAddRule: stage?.BinaryNodeDiffAddRule,
        binaryDiffAdds: binary.length
          ? binary.map(b => ({
              quality: b.Quality,
              enemyDifficultyAdd: b.EnemyDifficultyAddValue,
            }))
          : undefined,
        difficultyByChapter: diffs.length
          ? diffs.map(d => ({
              chapterId: d.ChapterID,
              attackRatio: d.AttackRatio?.Value,
              defenceRatio: d.DefenceRatio?.Value,
              hpRatio: d.HPRatio?.Value,
              speedRatio: d.SpeedRatio?.Value,
              stanceRatio: d.StanceRatio?.Value,
            }))
          : undefined,
      } as HsrGridFightDivision;
    });

    return _.sortBy(data, "id");
  }

  getAffixList(): HsrGridFightAffix[] {
    return _.sortBy(
      this.affixes.map(d => {
        tag(this.lang, d.AffixName?.Hash, "GridFightAffixConfig", "gridfight_affix", d.ID);
        tag(this.lang, d.AffixDesc?.Hash, "GridFightAffixConfig", "gridfight_affix", d.ID);
        return {
          id: d.ID,
          code: d.ID + "",
          name: TextMap.getText(this.lang, d.AffixName?.Hash),
          icon: gridFightUrl(d.IconPath),
          desc: TextMap.getText(this.lang, d.AffixDesc?.Hash),
          params: d.EffectParamList?.length ? values(d.EffectParamList) : undefined,
          mazeBuffIds: d.RuleParamList?.length ? d.RuleParamList : undefined,
          isInvasion: this.invasionAffixIds.has(d.ID) || undefined,
        } as HsrGridFightAffix;
      }),
      "id",
    );
  }

  getCampList(): HsrGridFightCamp[] {
    return _.sortBy(
      this.camps.map(d => {
        tag(this.lang, d.CampName?.Hash, "GridFightCamp", "gridfight_camp", d.ID);
        return {
          id: d.ID,
          code: d.ID + "",
          name: TextMap.getText(this.lang, d.CampName?.Hash),
          icon: gridFightUrl(d.IconPath),
          seasonId: d.SeasonID,
          monsterIds: d.MonsterList,
          battleAreaIds: d.BattleAreaList,
          bossBattleArea: d.BossBattleArea,
        } as HsrGridFightCamp;
      }),
      "id",
    );
  }
}
