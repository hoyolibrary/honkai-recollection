import _ from "lodash";
import fs from "fs/promises";
import path from "path";
import JSONBig from "json-bigint";
import { NounAtlas, NounAtlasChangeInfo } from "schema/NounAtlas";
import { HsrNounDesc } from "@game/games/hsr/HsrDataBank";
import TextMap from "../../text";
import { BookExtractor } from "./BookExtractor";
export async function extractNouns(lang: string, rootPath: string) {

  const outpath = path.join(rootPath, `./${lang}/databank`);
  await fs.mkdir(outpath, { recursive: true });


  await TextMap.loadMap(lang);


  // 名词解释
  const json1 = await fs.readFile(`./data/ExcelOutput/NounAtlas.json`, "utf-8");
  const nounData: NounAtlas[] = JSONBig.parse(json1);

  const json1_1 = await fs.readFile(`./data/ExcelOutput/NounAtlasChangeInfo.json`, "utf-8");
  const changesData = JSONBig.parse(json1_1) as NounAtlasChangeInfo[]
  const changesDataMap = _.keyBy(changesData, "NounID");

  const subIds = changesData.flatMap(item => item.ChangeNounIDList);
  const mainIds = changesData.map(d => d.NounID);

  const dataGroup: {
    main: NounAtlas[],
    sub: NounAtlas[],
  } = _.groupBy(nounData, x => subIds.includes(x.ID ?? -1) ? "sub" : "main") as any;

  let nounsMap: Record<number, HsrNounDesc> = {};

  function getNoun(item: NounAtlas) { 
    const ret = {
      id: item.ID || 0,
      name: TextMap.getText(lang, item.NounTitle.Hash),
      desc: TextMap.getText(lang, item.NounDesc.Hash),
      type: item.Type,
      sort: item.SortID || 0,
      relatedIds: item.RelatedTerms,
    } as HsrNounDesc;

    TextMap.setTagInfo(lang, item.NounTitle.Hash, { 
      category: {
        noun: item.ID + "",
        type: "NounAtlas",
      },
      tags: ["noun"]
    });
    TextMap.setTagInfo(lang, item.NounDesc.Hash, { 
      category: {
        noun: item.ID + "",
        type: "NounAtlas",
      },
      tags: ["noun"]
    });
    return ret;
  }
  
  for (const item of dataGroup.main) {
    const ret = getNoun(item);
    const changeInfo = changesDataMap[item.ID || 0]?.ChangeNounIDList;
    if (changeInfo) {
      const subs = dataGroup.sub.filter(x => changeInfo.includes(x.ID ?? -1));
      ret.changes = subs.map(x => _.pick(getNoun(x), ["id", "name", "desc"]));
    } else {
      ret.changes = [];
    }
    nounsMap[item.ID ?? 0] = ret;
  }

  const nouns = _.sortBy(Object.values(nounsMap), x => x.sort);
  await fs.writeFile(path.join(outpath, "nouns.json"), JSONBig.stringify(nouns, null, 2));
  
}


export async function extractBookData(lang: string, rootPath: string) {
  const outpath = path.join(rootPath, `./${lang}/databank`);
  await fs.mkdir(outpath, { recursive: true });

  const extractor = new BookExtractor(lang);

  console.log("加载书籍数据");
  await extractor.init();

  // console.log("写入书籍列表数据...");
  const books = extractor.getBooks();
  // await fs.writeFile(path.join(outpath, "books.json"), JSONBig.stringify(books, null, 2));

  console.log("写入书籍系列数据...");
  const bookSeries = extractor.getBookSeries();
  const bookSeriesFull = extractor.fillBooksInSeries(bookSeries, books)
  await fs.writeFile(path.join(outpath, "bookseries.json"), JSONBig.stringify(bookSeriesFull, null, 2));

  console.log("写入书籍世界数据...");
  const worlds = extractor.getBookWorlds();
  await fs.writeFile(path.join(outpath, "worlds.json"), JSONBig.stringify(worlds, null, 2));
}
