import type { IMetadataEntity } from "@game/common/IEntity";
import type { ActivityConfig } from "schema/ActivityConfig";
import type { ActivityPanel } from "schema/ActivityPanel";
import type { GridFightSeasonModule } from "schema/GridFightSeasonModule";
import TextMap from "../../../text";
import { readExcel, tag } from "./common";

export async function getGridFightSeasons(lang: string): Promise<IMetadataEntity<number>[]> {
  const [modules, activities, panels] = await Promise.all([
    readExcel<GridFightSeasonModule>("GridFightSeasonModule"),
    readExcel<ActivityConfig>("ActivityConfig"),
    readExcel<ActivityPanel>("ActivityPanel"),
  ]);
  await TextMap.loadMap(lang);

  const panelsById = new Map(panels.map(panel => [panel.PanelID, panel]));
  const seasonByModule = new Map(modules.map(row => [row.ActivityModuleID, row.SeasonID]));
  const seasons = new Map<number, ActivityPanel | undefined>();
  for (const row of modules) seasons.set(row.SeasonID, undefined);

  // 以赛季模块的实际 ID 和活动关联为准，多个子赛季共用一个清单项。
  const linkedPanels = new Set<number>();
  for (const activity of activities) {
    if (activity.ActivityPanelID == null) continue;
    const panel = panelsById.get(activity.ActivityPanelID);
    if (!panel) continue;
    for (const moduleId of activity.ActivityModuleIDList) {
      const seasonId = seasonByModule.get(moduleId);
      if (seasonId == null) continue;
      seasons.set(seasonId, panel);
      linkedPanels.add(panel.PanelID);
    }
  }

  // 历史赛季的模块可能下架，活动面板的标签图标仍可能保留赛季编号。
  for (const panel of panels) {
    if (linkedPanels.has(panel.PanelID)) continue;
    const match = /\/BtnGridFightS(\d+)\.png$/i.exec(panel.TabIcon);
    if (match && !seasons.get(Number(match[1]))) seasons.set(Number(match[1]), panel);
  }

  return Array.from(seasons, ([id, panel]) => {
    tag(lang, panel?.TabName?.Hash, "ActivityPanel", "gridfight_season", id);
    tag(lang, panel?.TitleName?.Hash, "ActivityPanel", "gridfight_season", id);
    const name = TextMap.getText(lang, panel?.TabName?.Hash)
      || TextMap.getText(lang, panel?.TitleName?.Hash);
    return { id, name };
  }).sort((a, b) => a.id - b.id);
}
