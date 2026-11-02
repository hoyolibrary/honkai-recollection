import fs from "fs/promises";
import JSONBig from "json-bigint";
import TextMap from "../../../text";
import type { TarotWikiTimeline as TarotWikiTimelineConfig } from "schema/TarotWikiTimeline";
import type { TarotWikiData as TarotWikiDataConfig } from "schema/TarotWikiData";
import type { TarotWikiSubdata as TarotWikiSubdataConfig } from "schema/TarotWikiSubdata";
import type { TarotWikiUnlockConditions as TarotWikiUnlockConditionsConfig } from "schema/TarotWikiUnlockConditions";
import type { TarotWikiChangeinfo as TarotWikiChangeinfoConfig } from "schema/TarotWikiChangeinfo";
import type {
  HsrTarotWikiTimeline,
  HsrTarotWikiData,
  HsrTarotWikiSubdata,
  HsrTarotWikiUnlockCondition,
  HsrTarotWikiChangeinfo,
} from "@game/games/hsr/HsrTarotWiki";
import { mutateGroupJoin } from "hoyo-cli-common";
import _ from "lodash";

export class TarotWikiExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  timelineConfigs: TarotWikiTimelineConfig[] = [];
  dataConfigs: TarotWikiDataConfig[] = [];
  subdataConfigs: TarotWikiSubdataConfig[] = [];
  unlockConditionsConfigs: TarotWikiUnlockConditionsConfig[] = [];
  changeinfoConfigs: TarotWikiChangeinfoConfig[] = [];

  // 输出数据的 Map 索引
  dataMap: Record<number, HsrTarotWikiData> = {};
  subdataMap: Record<number, HsrTarotWikiSubdata> = {};
  changeinfoMap: Record<number, HsrTarotWikiChangeinfo> = {};
  unlockConditionMap: Record<number, HsrTarotWikiUnlockCondition> = {};

  async init() {
    const timelineJson = await fs.readFile("./data/ExcelOutput/TarotWikiTimeline.json", "utf-8");
    this.timelineConfigs = JSONBig.parse(timelineJson);

    const dataJson = await fs.readFile("./data/ExcelOutput/TarotWikiData.json", "utf-8");
    this.dataConfigs = JSONBig.parse(dataJson);

    const subdataJson = await fs.readFile("./data/ExcelOutput/TarotWikiSubdata.json", "utf-8");
    this.subdataConfigs = JSONBig.parse(subdataJson);

    const unlockJson = await fs.readFile("./data/ExcelOutput/TarotWikiUnlockConditions.json", "utf-8");
    this.unlockConditionsConfigs = JSONBig.parse(unlockJson);

    const changeinfoJson = await fs.readFile("./data/ExcelOutput/TarotWikiChangeinfo.json", "utf-8");
    this.changeinfoConfigs = JSONBig.parse(changeinfoJson);

    await TextMap.loadMap(this.lang);
  }

  // ========== Changeinfo ==========

  buildChangeinfos() {
    for (const c of this.changeinfoConfigs) {
      const info: HsrTarotWikiChangeinfo = {
        changeId: c.ChangeID,
        newTitle: TextMap.getText(this.lang, c.NewTitle.Hash),
        newDetails: TextMap.getText(this.lang, c.NewDetails.Hash),
      };

      TextMap.setTagInfo(this.lang, c.NewTitle.Hash, {
        category: { tarotwiki_change: c.ChangeID + "", type: "TarotWikiChangeinfo" },
        tags: ["tarotwiki","tarotwiki_change"],
      });
      TextMap.setTagInfo(this.lang, c.NewDetails.Hash, {
        category: { tarotwiki_change: c.ChangeID + "", type: "TarotWikiChangeinfo" },
        tags: ["tarotwiki","tarotwiki_change"],
      });

      this.changeinfoMap[info.changeId] = info;
    }
  }

  // ========== Subdata ==========

  buildSubdatas() {
    for (const d of this.subdataConfigs) {
      const subdata: HsrTarotWikiSubdata = {
        id: d.ID,
        type: "subdata",
        name: TextMap.getText(this.lang, d.Title.Hash),
        desc: TextMap.getText(this.lang, d.Details.Hash),
        changeId: d.ChangeID,
      };

      TextMap.setTagInfo(this.lang, d.Title.Hash, {
        category: { tarotwiki_subdata: d.ID + "", type: "TarotWikiSubdata" },
        tags: ["tarotwiki", "tarotwiki_subdata"],
      });
      TextMap.setTagInfo(this.lang, d.Details.Hash, {
        category: { tarotwiki_subdata: d.ID + "", type: "TarotWikiSubdata" },
        tags: ["tarotwiki","tarotwiki_subdata"],
      });

      this.subdataMap[subdata.id] = subdata;
    }
  }

  // ========== Data ==========

  buildDatas() {
    for (const d of this.dataConfigs) {
      const wikiData: HsrTarotWikiData = {
        id: d.ID,
        type: "data",
        name: TextMap.getText(this.lang, d.Title.Hash),
        desc: TextMap.getText(this.lang, d.Details.Hash),
        changeId: d.ChangeID,
        children: [],
      };

      TextMap.setTagInfo(this.lang, d.Title.Hash, {
        category: { tarotwiki_data: d.ID + "", type: "TarotWikiData" },
        tags: ["tarotwiki","tarotwiki_data"],
      });
      TextMap.setTagInfo(this.lang, d.Details.Hash, {
        category: { tarotwiki_data: d.ID + "", type: "TarotWikiData" },
        tags: ["tarotwiki","tarotwiki_data"],
      });

      this.dataMap[wikiData.id] = wikiData;
    }
  }

  fillDataSubdata() {
    const merged = mutateGroupJoin(this.dataConfigs, {
      list: this.subdataConfigs,
      key: "ID",
      bIdsKey: "SubdataList",
      bListKey: "subdataList",
    });

    for (const d of merged) {
      const wikiData = this.dataMap[d.ID];
      if (!wikiData) continue;

      wikiData.children = d.subdataList
        .map(s => this.subdataMap[s.ID])
        .filter(Boolean);
    }
  }

  // ========== UnlockCondition + Changes ==========

  buildUnlockConditions() {
    for (const u of this.unlockConditionsConfigs) {
      const cond: HsrTarotWikiUnlockCondition = {
        unlockId: u.UnlockID,
        conditions: u.Conditions.map(c => ({
          type: c.Type,
          param: c.Param,
        })),
        showCondition: u.ShowCondition,
        changes: [],
      };

      this.unlockConditionMap[cond.unlockId] = cond;
    }
  }

  fillUnlockConditionChanges() {
    for (const c of this.changeinfoConfigs) {
      const cond = this.unlockConditionMap[c.UnlockID];
      if (!cond) continue;

      const changeinfo = this.changeinfoMap[c.ChangeID];
      if (changeinfo) {
        cond.changes.push(changeinfo);
      }
    }

    // 按 changeId 排序
    for (const key of Object.keys(this.unlockConditionMap)) {
      this.unlockConditionMap[Number(key)].changes = _.sortBy(
        this.unlockConditionMap[Number(key)].changes,
        "changeId",
      );
    }
  }

  // ========== Timeline ==========

  buildTimelines(): HsrTarotWikiTimeline[] {
    const merged = mutateGroupJoin(this.timelineConfigs, {
      list: this.dataConfigs,
      key: "ID",
      bIdsKey: "DataList",
      bListKey: "dataList",
    });

    const timelines: HsrTarotWikiTimeline[] = [];

    for (const t of merged) {
      const timeline: HsrTarotWikiTimeline = {
        id: t.ID,
        type: "timeline",
        name: TextMap.getText(this.lang, t.Title.Hash),
        progress: t.Progress,
        specialType: t.SpecialType,
        unlockId: t.UnlockID,
        children: t.dataList.map(d => this.dataMap[d.ID]).filter(Boolean),
      };

      TextMap.setTagInfo(this.lang, t.Title.Hash, {
        category: { tarotwiki_timeline: t.ID + "", type: "TarotWikiTimeline" },
        tags: ["tarotwiki","tarotwiki_timeline"],
      });

      timelines.push(timeline);
    }

    return _.sortBy(timelines, "id");
  }

  // ========== 对外入口 ==========

  /** 获取完整的时间轴树 (Timeline → Data → Subdata) */
  getTimelineList(): HsrTarotWikiTimeline[] {
    this.buildChangeinfos();
    this.buildSubdatas();
    this.buildDatas();
    this.fillDataSubdata();

    return this.buildTimelines();
  }

  /** 获取解锁条件列表 (UnlockCondition → Changeinfo) */
  getUnlockConditionList(): HsrTarotWikiUnlockCondition[] {
    this.buildChangeinfos();
    this.buildUnlockConditions();
    this.fillUnlockConditionChanges();

    return _.sortBy(Object.values(this.unlockConditionMap), "unlockId");
  }
}
