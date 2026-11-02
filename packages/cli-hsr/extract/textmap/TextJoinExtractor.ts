import fs from "fs/promises";
import JSONBig from "json-bigint";
import TextMap from "../../text";
import _ from "lodash";
import type { TextJoinConfig, TextJoinItem } from "schema/TextJoinConfig";
import type { HsrTextJoin, HsrTextJoinItem } from "@game/games/hsr/HsrTextJoin";

export class TextJoinExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  textJoinConfigs: TextJoinConfig[] = [];
  textJoinItems: TextJoinItem[] = [];

  async init() {
    const json1 = await fs.readFile(
      `./data/ExcelOutput/TextJoinConfig.json`,
      "utf-8",
    );
    this.textJoinConfigs = JSONBig.parse(json1);

    const json2 = await fs.readFile(
      `./data/ExcelOutput/TextJoinItem.json`,
      "utf-8",
    );
    this.textJoinItems = JSONBig.parse(json2);

    await TextMap.loadMap(this.lang);
  }

  extract(): HsrTextJoin[] {
    // 预建 TextJoinItem 的 Map，用于按 ID 查找
    const itemMap = this.textJoinItems.reduce<Record<number, TextJoinItem>>(
      (acc, cur) => {
        acc[cur.TextJoinItemID] = cur;
        return acc;
      },
      {},
    );

    const data = this.textJoinConfigs.map(config => {
      // 将 TextJoinItemList 中的 ID 关联到 TextJoinItem 实体
      const items: HsrTextJoinItem[] = (config.TextJoinItemList || []).map(
        itemId => {
          const item = itemMap[itemId];
          return {
            id: itemId,
            text: TextMap.getText(
              this.lang,
              item?.TextJoinText?.Hash ?? null,
            ),
          };
        },
      );

      const textJoin: HsrTextJoin = {
        id: config.TextJoinID,
        defaultItemId: config.DefaultItem,
        isOverride: config.IsOverride || false,
        type: config.Type || undefined,
        items,
      };

      // 为每个 TextJoinItem 打标
      for (const itemId of config.TextJoinItemList || []) {
        const item = itemMap[itemId];
        if (item) {
          TextMap.setTagInfo(this.lang, item.TextJoinText?.Hash, {
            category: {
              textJoin: config.TextJoinID + "",
              type: "TextJoinItem",
            },
            tags: ["textjoin"],
          });
        }
      }

      return textJoin;
    });

    return _.sortBy(data, "id");
  }
}
