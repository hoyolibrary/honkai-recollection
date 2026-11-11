import _ from "lodash";
import type { GridFightAugment } from "schema/GridFightAugment";
import type { GridFightSeasonAugment } from "schema/GridFightSeasonAugment";
import type { HsrGridFightAugment } from "@game/games/hsr/quest/gridfight";
import TextMap from "../../../text";
import { gridFightSeasonIds, gridFightUrl, readExcel, tag, values } from "./common";

export class GridFightAugmentExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  augments: GridFightAugment[] = [];
  seasons: GridFightSeasonAugment[] = [];

  async init() {
    this.augments = await readExcel("GridFightAugment");
    this.seasons = await readExcel("GridFightSeasonAugment");
    await TextMap.loadMap(this.lang);
  }

  getAugmentList(): HsrGridFightAugment[] {
    const seasonsByAugment = _.groupBy(this.seasons, s => s.AugmentID);

    const data = this.augments.flatMap(d => {
      tag(this.lang, d.HexName?.Hash, "GridFightAugment", "gridfight_augment", d.ID);
      tag(this.lang, d.HexDesc?.Hash, "GridFightAugment", "gridfight_augment", d.ID);
      const augment: HsrGridFightAugment = {
        id: d.ID,
        code: d.AugmentSearchKey || d.ID + "",
        name: TextMap.getText(this.lang, d.HexName?.Hash),
        icon: gridFightUrl(d.IconPath),
        miniIcon: d.MiniIconPath ? gridFightUrl(d.MiniIconPath) : undefined,
        desc: TextMap.getText(this.lang, d.HexDesc?.Hash),
        quality: d.Quality,
        categoryId: d.CategoryID,
        params: d.EffectParamList?.length ? values(d.EffectParamList) : undefined,
        chapterLimit: d.ChapterLimitList?.length ? d.ChapterLimitList : undefined,
        refTraitIds: d.AugmentGameRefTrait?.length ? d.AugmentGameRefTrait : undefined,
        searchKey: d.AugmentSearchKey,
      };
      return gridFightSeasonIds((seasonsByAugment[d.ID] ?? []).map(s => s.SeasonID))
        .map(seasonId => ({ ...augment, seasonId }));
    });

    return _.sortBy(data, ["id", "seasonId"]);
  }
}
