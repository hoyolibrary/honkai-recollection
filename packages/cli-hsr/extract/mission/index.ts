import fs from "fs/promises";
import JSONBig from "json-bigint";
import path from "path";
import { MainMissionExtractor } from "./MainMissionExtractor";
import { WorldDataConfig } from "schema/WorldDataConfig";
import { SubMission } from "schema/SubMission";
import TextMap from "../../text";
import { getUrl } from "../../url";
import { HsrSubMission, HsrWorldData } from "@game/games/hsr/mission";



export async function extractMissionData(lang: string, rootPath: string) {
  const outpath = path.join(rootPath, `./${lang}/mission`);
  await fs.mkdir(outpath, { recursive: true });

  const extractor = new MainMissionExtractor(lang);
  await extractor.init();

  const graph = extractor.getExtractedData();
  await fs.writeFile(path.join(outpath, "graph.json"), JSON.stringify(graph, null, 2));

  // 子任务归属映射（MissionInfo 权威口径）：供剧情提取器等工具使用，不进前端展示数据 graph.json
  const subOwner: [number, number][] = [];
  for (const [mainId, subIds] of extractor.ownedSubIds) {
    for (const subId of subIds) subOwner.push([subId, mainId]);
  }
  await fs.writeFile(path.join(outpath, "subowner.json"), JSON.stringify(subOwner));

  const json1 = await fs.readFile(`./data/ExcelOutput/WorldDataConfig.json`, "utf-8");
  const worldDataConfigs: WorldDataConfig[] = JSONBig.parse(json1);
  const worlds = worldDataConfigs.map(w => {
    return {
      id: w.ID,
      name: TextMap.getText(lang, w.WorldName?.Hash),
      desc: TextMap.getText(lang, w.WorldDesc?.Hash),
      simpleDesc: TextMap.getText(lang, w.SimpleWorldDesc?.Hash),
      worldLanguageName: TextMap.getText(lang, w.WorldLanguageName?.Hash),
      mapSpaceTypeList: w.MapSpaceTypeList,
      trainSpaceType: w.TrainSpaceType,

      icon: getUrl(w.SmallWorldIconPath),
      chapterIcon: getUrl(w.ChapterIconBigPath),
      chronicleWorldBg: getUrl(w.ChronicleWorldBgPath),
      chronicleWorldSubBg: getUrl(w.ChronicleWorldSubBgPath),
      chronicleWorldPredict: getUrl(w.ChronicleWorldPredictPath),
      chronicleWorldProcessing: getUrl(w.ChronicleWorldProcessingPath),

    } as HsrWorldData;
  });
  await fs.writeFile(path.join(outpath, "worlds.json"), JSON.stringify(worlds, null, 2));

  const json2 = await fs.readFile(`./data/ExcelOutput/SubMission.json`, "utf-8");
  const submissions: HsrSubMission[] = JSONBig.parse(json2).map((item: SubMission) => {
    const name = TextMap.getText(lang, item.TargetText?.Hash ?? null);
    const desc = TextMap.getText(lang, item.DescrptionText?.Hash ?? null);

    if (item.TargetText?.Hash) {
      TextMap.setTagInfo(lang, item.TargetText.Hash, {
        category: {
          submission: item.SubMissionID + "",
          type: "SubMission",
        },
        tags: ["mission", "submission"],
      });
    }

    if (item.DescrptionText?.Hash) {
      TextMap.setTagInfo(lang, item.DescrptionText.Hash, {
        category: {
          submission: item.SubMissionID + "",
          type: "SubMission",
        },
        tags: ["mission", "submission"],
      });
    }

    return {
      id: item.SubMissionID,
      name,
      desc,
    };
  });
  await fs.writeFile(path.join(outpath, "submission.json"), JSON.stringify(submissions, null, 2));
}
