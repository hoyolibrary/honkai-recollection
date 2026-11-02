import path from "path";
import fs from "fs/promises";
import JSONBig from "json-bigint";

import TextMap from "../text";
import { getUrl } from "../url";

import { ItemConfig, PlayerOutfitBase } from "schema/ItemConfig";
import { HsrItemConfig } from "@game/games/hsr/HsrItem";

export async function extractItemsData(lang: string, rootPath: string) {
  const outpath = path.join(rootPath, `./${lang}/`);
  await fs.mkdir(outpath, { recursive: true });

  await TextMap.loadMap(lang);

  // 物品
  const json1 = await fs.readFile(`./data/ExcelOutput/ItemConfig.json`, "utf-8");
  const itemConfigs: ItemConfig[] = JSONBig.parse(json1);

  const json2 = await fs.readFile(`./data/ExcelOutput/PlayerOutfitBase.json`, "utf-8");
  const playerOutfits: PlayerOutfitBase[] = JSONBig.parse(json2);

  const items = itemConfigs.map(item =>
    getExtractedItem(item, lang, (item, data) => {
      TextMap.setTagInfo(lang, item.ItemName?.Hash, {
        category: {
          item: item.ID + "",
          type: "ItemConfig",
        },
        tags: ["item"],
      });
      TextMap.setTagInfo(lang, item.ItemDesc?.Hash, {
        category: {
          item: item.ID + "",
          type: "ItemConfig",
        },
        tags: ["item"],
      });
      TextMap.setTagInfo(lang, item.ItemBGDesc?.Hash, {
        category: {
          item: item.ID + "",
          type: "ItemConfig",
        },
        tags: ["item"],
      });

      if (item.ItemSubType == "PlayerOutfit") {
        data.icon = getUrl(item.ItemFigureIconPath, "dicloud")!;
        // 开拓穿搭
        const outfit = playerOutfits.find(x => x.ItemID == item.ID);
        if (outfit) {
          data.slotType = outfit.SlotTypeList[0];
          data.outfitId = outfit.OutfitID;
          // 服装
          if (data.slotType == "Coat") {
            data.icon = "";
            // 根据男女动态插值
            data.picture = getUrl(
              `SpriteOutput/ItemFigures/DressIcon/${item.ID}_{F#f}{M#m}.png`,
              "srtools",
            )!;
          }
        }
      }
    }),
  );
  await fs.writeFile(path.join(outpath, "items.json"), JSONBig.stringify(items, null, 2));
}

export function getExtractedItem<T extends HsrItemConfig = HsrItemConfig>(
  item: ItemConfig,
  lang: string,
  fn?: (item: ItemConfig, data: T) => void,
) {
  const data = {
    id: item.ID,
    code: `${item.ItemSubType}_${item.ID}`,
    name: TextMap.getText(lang, item.ItemName?.Hash),
    desc: TextMap.getText(lang, item.ItemDesc?.Hash),
    text: TextMap.getText(lang, item.ItemBGDesc?.Hash),
    icon: getUrl(item.ItemIconPath, "dicloud"), // ItemIconPath srtools没有存，就大部分情况两个是一样的
    visible: item.isVisible || false,
    rarity: getRarity(item.Rarity),
    type: item.ItemMainType,
    subType: item.ItemSubType,
    inventoryGroup: item.InventoryDisplayTag,
    itemGroup: item.ItemGroup,
    purposeType: item.PurposeType,
    pileLimit: item.PileLimit,
  } as HsrItemConfig;

  fn?.(item, data as T);
  return data as T;
}

export function getRarity(rarityStr: string) {
  switch (rarityStr) {
    case "Normal":
      return 1;
    case "NotNormal":
      return 2;
    case "Rare":
      return 3;
    case "VeryRare":
      return 4;
    case "SuperRare":
      return 5;
    default:
      return 0;
  }
}
