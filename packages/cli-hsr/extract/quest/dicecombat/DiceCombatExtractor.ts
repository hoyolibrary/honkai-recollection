import fs from "fs/promises";
import JSONBig from "json-bigint";
import { HsrDiceAvatar, HsrDiceAvatarSkill, HsrDiceCardPack } from "@game/games/hsr/quest/dicecombat";
import TextMap from "../../../text";
import { getUrl } from "../../../url";
import _ from "lodash";
import { ActivityDiceAvatarConfig } from "schema/ActivityDiceAvatarConfig";
import { ActivityDiceSkill } from "schema/ActivityDiceSkill";
import { ActivityDiceShopConfig, ActivityDiceShopGoodsConfig } from "schema/ActivityDiceShopConfig";
import { mutateGroupJoin } from "hoyo-cli-common";


export class DiceCombatExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

 
  diceavatars: ActivityDiceAvatarConfig[] = [];
  avatarSkills: ActivityDiceSkill[] = [];

  shops: ActivityDiceShopConfig[] = [];
  shopItems: ActivityDiceShopGoodsConfig[] = [];

  diceavatarMap: Record<number, HsrDiceAvatar> = {};
  async init() {
   

    const json1 = await fs.readFile(`./data/ExcelOutput/ActivityDiceAvatarConfig.json`, "utf-8");
    this.diceavatars = JSONBig.parse(json1);

    const json2 = await fs.readFile(`./data/ExcelOutput/ActivityDiceSkill.json`, "utf-8");
    this.avatarSkills = JSONBig.parse(json2);

    const json10 = await fs.readFile(`./data/ExcelOutput/ActivityDiceShopConfig.json`, "utf-8");
    this.shops = JSONBig.parse(json10);

    const json11 = await fs.readFile(`./data/ExcelOutput/ActivityDiceShopGoodsConfig.json`, "utf-8");
    this.shopItems = JSONBig.parse(json11);
   
    await TextMap.loadMap(this.lang);
  }


  getDiceAvatarList() {
    const data = this.diceavatars.map(d => {

      const diceCounts = [...d.DiceCountPerRare];
      // 彩色骰子的展示数量为实际可用数量
      diceCounts[3] = d.ColorfulDiceAvailableCount || 0;

      // 有不支持彩骰的卡牌
      const diceSlotNumber = Math.max(
        d.DiceCountPerRare.filter(x => x > 0).length,
        2,
      );

      const diceavatar = {
        id: d.DiceAvatarID,
        code: d.DiceAvatarID + "",
        name: TextMap.getText(this.lang, d.Name.Hash),
        icon: getUrl(d.ImgPathHeadIcon, "dicloud"),
        portrait: getUrl(d.ImgPath, "dicloud"),
        portraitBg: getUrl(d.HighLevelBGImgPath, "dicloud"),
        portrait3D: getUrl(d.ImgPathUI3D, "dicloud"),
        portraitBg3D: getUrl(d.HighLevelBGImgPathUI3D, "dicloud"),
        rarity: d.Rare,

        isCollection: d.IsCollection || false,

        hp: d.HP,
        attackDiceNumber: d.AttackDiceNumber,
        defendDiceNumber: d.DefendDiceNumber,
        colorfulDiceNumber: d.ColorfulDiceAvailableCount || 0,
        diceSlotNumber,
        diceCounts,
        diceIds: d.DiceIDPerRare,

      } as HsrDiceAvatar;

      return diceavatar;
    });

    this.diceavatarMap = data.reduce<Record<number, HsrDiceAvatar>>((map, a) => {
      map[a.id] = a as HsrDiceAvatar;
      return map;
    }, {});
    return data;
  }

  fillAllSkillData() {
    const skillMap = this.avatarSkills.reduce<Record<number, ActivityDiceSkill>>(
      (map, a) => {
        map[a.CDNGHDNMMAG] = a;
        return map;
      },
      {},
    );


    for (const item of this.diceavatars) {
      const avatar = this.diceavatarMap[item.DiceAvatarID];

      avatar.skill = this.getSkillInfo(skillMap[item.SkillID]);
    }
  }


  getSkillInfo(d: ActivityDiceSkill): HsrDiceAvatarSkill {
    const skill = {
      id: d.CDNGHDNMMAG,
      desc: TextMap.getText(this.lang, d.NMAHGFAPENI.Hash),
      params: d.PBLPLDJKPEI,
    } as HsrDiceAvatarSkill;
    return skill;
  }


  getCardPacks() {
    const shopWithGoods = mutateGroupJoin(
      this.shops,
      {
        list: this.shopItems,
        key: "DiceShopGoodsID",
        bIdsKey: "GoodsList",
        bListKey: "goods"
      }
    );
    return _.sortBy(shopWithGoods.map(item => {
      return {
        id: item.DiceShopID,
        icon: getUrl(item.IMGPath, "dicloud"),
        order: item.ShopSortID,
        name: TextMap.getText(this.lang, item.Name.Hash),
        goodIds: item.GoodsList,
        goods: item.goods.map(good => {
          return {
            id: good.DiceShopGoodsID,
            itemId: good.ItemID,
            cost: good.ItemCost.map(cost => {
              return {
                itemId: cost.ItemID,
                num: cost.ItemNum,
              };
            }),
          }
        }),
      } as HsrDiceCardPack;
    }), "order");
  }
  
}
