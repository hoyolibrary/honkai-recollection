import fs from "fs/promises";
import JSONBig from "json-bigint";
import { HsrBook, HsrBookSeries, HsrBookSeriesSimple, HsrBookSeriesWorld } from "@game/games/hsr/HsrBook";
import TextMap from "../../text";
import { getUrl } from "../../url";
import _ from "lodash";
import { LocalbookConfig, BookSeriesConfig, BookSeriesWorld } from "schema/BookSeriesConfig";
import { getExtractedItem } from "../item";
import { ItemConfig } from "schema/ItemConfig";
import { mutateGroupJoin } from "hoyo-cli-common";

const DefaultIconPath = "SpriteOutput/ItemIcon/503.png";
function createDefaultBookItem(d: LocalbookConfig) {
  return {
    ID: d.BookID,
    ItemSubType: "Book",
    ItemName: {
      Hash: d.BookInsideName?.Hash,
    },
    ItemIconPath: DefaultIconPath,
    Rarity: "Normal"
  } as ItemConfig;
}

export class BookExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  localBooks: LocalbookConfig[] = [];
  bookSeries: BookSeriesConfig[] = [];
  bookWorlds: BookSeriesWorld[] = [];
  bookItems: ItemConfig[] = [];

  booksMap: Record<number, HsrBook> = {};
  bookItemsMap: Record<number, ItemConfig> = {};

  async init() {
    const json1 = await fs.readFile(`./data/ExcelOutput/LocalbookConfig.json`, "utf-8");
    this.localBooks = JSONBig.parse(json1);

    const json2 = await fs.readFile(`./data/ExcelOutput/BookSeriesConfig.json`, "utf-8");
    this.bookSeries = JSONBig.parse(json2);

    const json3 = await fs.readFile(`./data/ExcelOutput/BookSeriesWorld.json`, "utf-8");
    this.bookWorlds = JSONBig.parse(json3);

    const json4 = await fs.readFile(`./data/ExcelOutput/ItemConfigBook.json`, "utf-8");
    const json4_1 = await fs.readFile(`./data/ExcelOutput/ItemConfig.json`, "utf-8");
    const bookItems: ItemConfig[] = JSONBig.parse(json4);
    let bookItems_1: ItemConfig[] = JSONBig.parse(json4_1);
    bookItems_1 = bookItems_1.filter(i => i.ItemSubType === "Book");
    this.bookItems = _.uniqBy(bookItems.concat(bookItems_1), i => i.ID);

    this.bookItemsMap = this.bookItems.reduce<Record<number, ItemConfig>>((acc, cur) => {
      acc[cur.ID] = cur;
      return acc;
    }, {});

    await TextMap.loadMap(this.lang);
  }

  getBooks() {
    const items = this.bookItems.reduce<Record<number, ItemConfig>>((acc, cur) => {
      acc[cur.ID] = cur;
      return acc;
    }, {});
    const data = this.localBooks.map(d => {
      let notItem = false;
      let item = items[d.BookID];
      if (!item) {
        notItem = true;
        item = createDefaultBookItem(d);
      }

      const book = getExtractedItem<HsrBook>(item, this.lang);
      book.icon = getUrl(item.ItemIconPath, "dicloud")!;
      Object.assign(book, {
        id: d.BookID,
        seriesId: d.BookSeriesID,
        seriesInsideId: d.BookSeriesInsideID,
        name: TextMap.getText(this.lang, d.BookInsideName?.Hash),
        content: TextMap.getText(this.lang, d.BookContent?.Hash),
        displayType: d.BookDisplayType,
        images: (d.LocalBookImagePath || []).map(i => getUrl(i, "dicloud")),
        notItem,
      });

      TextMap.setTagInfo(this.lang, item.ItemName?.Hash, {
        category: {
          item: item.ID + "",
          type: "ItemConfigBook",
        },
        tags: ["item", "book"],
      });
      TextMap.setTagInfo(this.lang, item.ItemDesc?.Hash, {
        category: {
          item: item.ID + "",
          type: "ItemConfigBook",
        },
        tags: ["item", "book"],
      });
      TextMap.setTagInfo(this.lang, item.ItemBGDesc?.Hash, {
        category: {
          item: item.ID + "",
          type: "ItemConfigBook",
        },
        tags: ["item", "book"],
      });



      TextMap.setTagInfo(this.lang, d.BookInsideName?.Hash, {
        category: {
          book: d.BookID + "",
          type: "LocalbookConfig",
        },
        tags: ["book"]
      });
      TextMap.setTagInfo(this.lang, d.BookContent?.Hash, {
        category: {
          book: d.BookID + "",
          type: "LocalbookConfig",
        },
        tags: ["book"]
      });

      this.booksMap[book.id] = book;
      return book;
    });

    return _.sortBy(data, "id");
  }

  getBookSeries() {
    const booksBySeries = _.groupBy(this.localBooks, "BookSeriesID");

    const data = this.bookSeries.map(d => {
      const books = booksBySeries[d.BookSeriesID] || [];
      const bookSeries: HsrBookSeriesSimple = {
        id: d.BookSeriesID,
        code: d.BookSeriesID + "",
        name: TextMap.getText(this.lang, d.BookSeries?.Hash),
        desc: TextMap.getText(this.lang, d.BookSeriesComments?.Hash),
        num: d.BookSeriesNum,
        world: d.BookSeriesWorld,
        visible: d.IsShowInBookshelf!,
        bookIds: _.sortBy(books, b => b.BookSeriesInsideID).map(b => b.BookID),
      };

      TextMap.setTagInfo(this.lang, d.BookSeries?.Hash, {
        category: {
          bookSeries: d.BookSeriesID + "",
          type: "BookSeriesConfig",
        },
        tags: ["book"]
      });
      TextMap.setTagInfo(this.lang, d.BookSeriesComments?.Hash, {
        category: {
          bookSeries: d.BookSeriesID + "",
          type: "BookSeriesConfig",
        },
        tags: ["book"]
      });
      return bookSeries;
    });

    return _.sortBy(data, "id");
  }

  fillBooksInSeries(bookSeriesList: HsrBookSeriesSimple[], bookList: HsrBook[]){
    let remainBooks = [...bookList];
    const ret = mutateGroupJoin(
      bookSeriesList,
      {
        list: bookList,
        bIdsKey: "bookIds",
        bListKey: "books",
        key: "id",
        aggregate: (books, bookSeries) => {
          let bookItem = books[0] ? this.bookItemsMap[books[0].id] : null;
          let icon = bookItem ? bookItem.ItemIconPath : DefaultIconPath;
          let url = getUrl(icon, "dicloud")
          remainBooks = _.difference(remainBooks, books);
          return {
            icon: url,
            notItem: books.some(b => b.notItem),
          };
        },
      }
    );
    
    if (remainBooks.length > 0) {
      const nullSeries = {
        id: 0,
        code: "0",
        name: "（散落的书籍）",
        desc: "没有书籍系列的书籍，全部塞到一起了",
        icon: getUrl(DefaultIconPath, "dicloud")!,
        num: remainBooks.length,
        world: 0,
        visible: true,
        bookIds: remainBooks.map(b => b.id),
        books: remainBooks,
        notItem: true,
      };
      ret.push(nullSeries);
    }

    return ret;

  }

  getBookWorlds() {
    const data = this.bookWorlds.map(d => {
      const world: HsrBookSeriesWorld = {
        id: d.BookSeriesWorld,
        desc: TextMap.getText(this.lang, d.BookSeriesWorldTextmapID?.Hash),
        icon: getUrl(d.BookSeriesWorldIconPath, "dicloud")!,
        background: getUrl(d.BookSeriesWorldBackgroundPath, "dicloud")!,
      };
      return world;
    });

    return _.sortBy(data, "id");
  }
}
