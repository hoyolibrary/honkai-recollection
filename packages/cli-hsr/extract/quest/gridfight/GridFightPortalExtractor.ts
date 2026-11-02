import _ from "lodash";
import type { GridFightNpcConfig } from "schema/GridFightNpcConfig";
import type { GridFightPortalBuff } from "schema/GridFightPortalBuff";
import type { GridFightPresentConfig } from "schema/GridFightPresentConfig";
import type { GridFightSeasonPortal } from "schema/GridFightSeasonPortal";
import type { HsrGridFightPortal } from "@game/games/hsr/quest/gridfight";
import TextMap from "../../../text";
import { gridFightUrl, readExcel, tag, values } from "./common";

export class GridFightPortalExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  portals: GridFightPortalBuff[] = [];
  seasons: GridFightSeasonPortal[] = [];
  presents: GridFightPresentConfig[] = [];
  npcs: GridFightNpcConfig[] = [];

  async init() {
    this.portals = await readExcel("GridFightPortalBuff");
    this.seasons = await readExcel("GridFightSeasonPortal");
    this.presents = await readExcel("GridFightPresentConfig");
    this.npcs = await readExcel("GridFightNpcConfig");
    await TextMap.loadMap(this.lang);
  }

  getPortalList(): HsrGridFightPortal[] {
    const seasonsByPortal = _.groupBy(this.seasons, s => s.PortalID);
    const npcById = Object.fromEntries(this.npcs.map(n => [n.ID, n]));
    const presents = this.presents.map(p => {
      tag(this.lang, p.PresentName?.Hash, "GridFightPresentConfig", "gridfight_portal", p.ID);
      tag(this.lang, p.PresentDesc?.Hash, "GridFightPresentConfig", "gridfight_portal", p.ID);
      return {
        id: p.ID,
        code: p.ID + "",
        name: TextMap.getText(this.lang, p.PresentName?.Hash),
        desc: TextMap.getText(this.lang, p.PresentDesc?.Hash),
        bonusId: p.BonusID,
        shortenType: p.ShortenType,
      };
    });

    const data = this.portals.map(d => {
      tag(this.lang, d.PortalBuffTitle?.Hash, "GridFightPortalBuff", "gridfight_portal", d.ID);
      tag(this.lang, d.PortalBuffDesc?.Hash, "GridFightPortalBuff", "gridfight_portal", d.ID);

      const npcs = (d.ShowNpcIDList || [])
        .map(id => {
          const n = npcById[id];
          if (!n) return undefined;
          tag(this.lang, n.NpcName?.Hash, "GridFightNpcConfig", "gridfight_portal", d.ID);
          tag(this.lang, n.NpcDesc?.Hash, "GridFightNpcConfig", "gridfight_portal", d.ID);
          return {
            id: n.ID,
            code: n.ID + "",
            name: TextMap.getText(this.lang, n.NpcName?.Hash),
            desc: TextMap.getText(this.lang, n.NpcDesc?.Hash),
            icon: gridFightUrl(n.Icon),
            roundIcon: n.RoundIcon ? gridFightUrl(n.RoundIcon) : undefined,
          };
        })
        .filter((n): n is NonNullable<typeof n> => !!n);

      return {
        id: d.ID,
        code: d.ID + "",
        name: TextMap.getText(this.lang, d.PortalBuffTitle?.Hash),
        icon: gridFightUrl(d.IconPath),
        desc: TextMap.getText(this.lang, d.PortalBuffDesc?.Hash),
        params: d.EffectParamList?.length ? values(d.EffectParamList) : undefined,
        inBook: d.IfInBook,
        npcIds: d.ShowNpcIDList?.length ? d.ShowNpcIDList : undefined,
        npcs: npcs.length ? npcs : undefined,
        showBonusId: d.ShowBonusID,
        showBonusIds: d.ShowBonusIDList?.length ? d.ShowBonusIDList : undefined,
        delayedShowBonus: d.DelayedShowBonus?.length ? d.DelayedShowBonus : undefined,
        seasonIds: (seasonsByPortal[d.ID] || []).map(s => s.SeasonID),
        refTraitIds: d.PortalGameRefTrait?.length ? d.PortalGameRefTrait : undefined,
        presents: d.ID === 134 && presents.length ? presents : undefined,
      } as HsrGridFightPortal;
    });

    return _.sortBy(data, "id");
  }
}
