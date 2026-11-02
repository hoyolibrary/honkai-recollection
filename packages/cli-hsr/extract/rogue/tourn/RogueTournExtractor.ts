import fs from "fs/promises";
import JSONBig from "json-bigint";
import { HsrRogueMiracle, HsrRogueMiracleEffect } from "@game/games/hsr/rogue/tourn";
import type { HsrRogueTournEvent } from "@game/games/hsr/rogue/tourn-event";
import { HsrRoguePersona, HsrRoguePersonaGift } from "@game/games/hsr/rogue/tourn3";
import TextMap from "../../../text";
import _ from "lodash";

import { RoguePersonaStyle } from "schema/RoguePersonaStyle";
import { RoguePersonaStyleGift } from "schema/RoguePersonaStyleGift";
import { RogueTournUnlock } from "schema/RoguePersonaStyle";
import { getUrl } from "../../../url";
import { RoguePersonaRoomCompType } from "schema/RoguePersonaRoomCompType";
import { RoguePersonaRoomAttribute } from "schema/RoguePersonaRoomAttribute";
import { RogueTournTitanType } from "schema/RogueTournTitanType";
import { RogueTournMiracle } from "schema/RogueTournMiracle";
import { RogueTournMiracleDisplay } from "schema/RogueTournMiracleDisplay";
import { RogueTournHandbookMiracle } from "schema/RogueTournHandbookMiracle";
import { RogueMiracleDisplay } from "schema/RogueMiracleDisplay";
import { RogueMiracleEffect } from "schema/RogueMiracleEffect";
import type { RogueImage } from "schema/RogueImage";
import type { RogueTournContentDisplay } from "schema/RogueTournContentDisplay";
import type { RogueTournHandBookEvent } from "schema/RogueTournHandBookEvent";
import type { RogueTournNPC } from "schema/RogueTournNPC";

export class RogueTournExtractor {
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
  }

  roguePersonaStyles: RoguePersonaStyle[] = [];
  roguePersonaGifts: RoguePersonaStyleGift[] = [];
  rogueTournUnlocks: RogueTournUnlock[] = [];

  personaRoomTypes: RoguePersonaRoomCompType[] = [];
  personaRoomAttributes: RoguePersonaRoomAttribute[] = [];

  titanTypes: RogueTournTitanType[] = [];

  /** 差分宇宙奇物主表（运行时条目，含变体） */
  tournMiracles: RogueTournMiracle[] = [];
  /** 差分宇宙奇物图鉴（展示列表以本表为准） */
  tournHandbookMiracles: RogueTournHandbookMiracle[] = [];
  /** 差分宇宙奇物展示（4 位 ID） */
  tournMiracleDisplays: RogueTournMiracleDisplay[] = [];
  /** 模拟宇宙共用奇物展示（短 ID，差分宇宙图鉴常回落于此） */
  miracleDisplays: RogueMiracleDisplay[] = [];
  /** 奇物效果表（差分 / 模拟宇宙共用，经 MiracleEffectID 1:1 关联） */
  miracleEffects: RogueMiracleEffect[] = [];

  /** 差分宇宙事件图鉴 */
  tournHandbookEvents: RogueTournHandBookEvent[] = [];
  /** 事件图鉴关联的 NPC 配置入口 */
  tournNpcs: RogueTournNPC[] = [];
  /** 事件分类与解锁条件展示文本 */
  tournContentDisplays: RogueTournContentDisplay[] = [];
  /** 模拟宇宙共用图片配置 */
  rogueImages: RogueImage[] = [];

  async init() {
    // 面具表
    const json = await fs.readFile(`./data/ExcelOutput/RoguePersonaStyle.json`, "utf-8");
    this.roguePersonaStyles = JSONBig.parse(json);

    // 解锁详情表（用于面具）
    const json1 = await fs.readFile(`./data/ExcelOutput/RogueTournUnlock.json`, "utf-8");
    this.rogueTournUnlocks = JSONBig.parse(json1);

    // 面具奇迹表
    const json2 = await fs.readFile(`./data/ExcelOutput/RoguePersonaStyleGift.json`, "utf-8");
    this.roguePersonaGifts = JSONBig.parse(json2);


    // 房间类型表S3
    const json10 = await fs.readFile(`./data/ExcelOutput/RoguePersonaRoomCompType.json`, "utf-8");
    this.personaRoomTypes = JSONBig.parse(json10);
    // 信标表S3
    const json11 = await fs.readFile(`./data/ExcelOutput/RoguePersonaRoomAttribute.json`, "utf-8");
    this.personaRoomAttributes = JSONBig.parse(json11);

    // 泰坦表S2
    const json21 = await fs.readFile(`./data/ExcelOutput/RogueTournTitanType.json`, "utf-8");
    this.titanTypes = JSONBig.parse(json21);

    // 差分宇宙奇物主表 / 图鉴 / 展示
    const json30 = await fs.readFile(`./data/ExcelOutput/RogueTournMiracle.json`, "utf-8");
    this.tournMiracles = JSONBig.parse(json30);
    const json31 = await fs.readFile(`./data/ExcelOutput/RogueTournMiracleDisplay.json`, "utf-8");
    this.tournMiracleDisplays = JSONBig.parse(json31);
    const json32 = await fs.readFile(`./data/ExcelOutput/RogueTournHandbookMiracle.json`, "utf-8");
    this.tournHandbookMiracles = JSONBig.parse(json32);
    // 模拟宇宙共用展示（短 MiracleDisplayID）
    const json33 = await fs.readFile(`./data/ExcelOutput/RogueMiracleDisplay.json`, "utf-8");
    this.miracleDisplays = JSONBig.parse(json33);
    // 奇物效果（差分 / 模拟宇宙共用）
    const json34 = await fs.readFile(`./data/ExcelOutput/RogueMiracleEffect.json`, "utf-8");
    this.miracleEffects = JSONBig.parse(json34);

    // 差分宇宙事件图鉴 / NPC 入口 / 展示文本 / 图片
    const json40 = await fs.readFile(`./data/ExcelOutput/RogueTournHandBookEvent.json`, "utf-8");
    this.tournHandbookEvents = JSONBig.parse(json40);
    const json41 = await fs.readFile(`./data/ExcelOutput/RogueTournNPC.json`, "utf-8");
    this.tournNpcs = JSONBig.parse(json41);
    const json42 = await fs.readFile(`./data/ExcelOutput/RogueTournContentDisplay.json`, "utf-8");
    this.tournContentDisplays = JSONBig.parse(json42);
    const json43 = await fs.readFile(`./data/ExcelOutput/RogueImage.json`, "utf-8");
    this.rogueImages = JSONBig.parse(json43);

    await TextMap.loadMap(this.lang);
  }

  async getRogueTournSeasons() {
    // 由于每过一个赛季，上个赛季信息就会被清空，只能通过活动表来获得赛季名称，并且拼接图标路径（还有拼错的）
    const json = await fs.readFile(`./data/ExcelOutput/ActivityPanel.json`, "utf-8");
    const activityPanels: any[] = JSONBig.parse(json);

    const rogueActivities = activityPanels.filter(d => d.UIPrefab.includes("RogueTourn"));
    return _.sortBy(rogueActivities, x => x.PanelID).map((d, i) => { 
      return {
        id: d.PanelID,
        season: i + 1,
        name: TextMap.getText(this.lang, d.TabName?.Hash),
        desc: TextMap.getText(this.lang, d.TitleName?.Hash),
        icon: `https://cdn2.dicloud.work/static/mihoyo-tools/hsr/ui/tabicon/RogueTournS${i+1}.png`,
      };
    });
  }

  getPersonaRoomCompTypes() {
    return this.personaRoomTypes.map((d, i) => {
      return {
        id: d.LLICIMBCNPF,
        code: d.LHLKJIDFLIN,
        name: TextMap.getText(this.lang, d.BAAOGIMCALN?.Hash),
        desc: TextMap.getText(this.lang, d.NMAHGFAPENI?.Hash),
        update: TextMap.getText(this.lang, d.LJPBJNANBLB?.Hash),
        icon: getUrl(d.OLOIFNNLKJP, "dicloud"),
      }
    });
  }

  getPersonaRoomAttributes() {
    return this.personaRoomAttributes.map(d => {
      return {
        id: d.HHPFKDEBMGP,
        name: TextMap.getText(this.lang, d.MJOOFPBABEA?.Hash),
        skill: TextMap.getText(this.lang, d.NMAHGFAPENI?.Hash),
        icon: getUrl(d.OLOIFNNLKJP, "dicloud"),
        params: d.PBLPLDJKPEI.map(p => p.Value),
        effect: d.OOMBNFMJLEO,

      }
    });
  }

  getRoguePersonaGiftList() { 
    return this.roguePersonaGifts.map(d => {
      let rarity = 0;
      switch (d.PMIEAEGJNMJ) {
        case "Common":
          rarity = 1; break;
        case "Rare":
          rarity = 2; break;
        case "Epic":
          rarity = 3; break;
        case "Core":
          rarity = 4; break;
      };
      return {
        id: d.FMDMDDCBPAM,
        name: TextMap.getText(this.lang, d.MJOOFPBABEA?.Hash),
        icon: getUrl(d.OLOIFNNLKJP, "dicloud"),
        skill: TextMap.getText(this.lang, d.NMAHGFAPENI?.Hash),
        params: d.PBLPLDJKPEI.map(p => p.Value),
        type: d.PMIEAEGJNMJ,
        rarity,
        personaIds: d.NIKKAPEIDJO,
      } as HsrRoguePersonaGift;
    })
  }

  getRoguePersonaList() {
    // 创建解锁ID到解锁详情的映射
    const unlockMap = new Map<number, RogueTournUnlock>();
    for (const unlock of this.rogueTournUnlocks) {
      unlockMap.set(unlock.RogueUnlockID, unlock);
    }

    const data = this.roguePersonaStyles
    .filter(d => d.GIFCDPFAKKP)
    .map(d => {
      // 查找对应的解锁详情
      let unlockDetailText = undefined;
      if (d.JJKLIJNFIBB) {
        const unlock = unlockMap.get(d.JJKLIJNFIBB);
        if (unlock && unlock.RogueUnlockDetail?.Hash) {
          unlockDetailText = TextMap.getText(this.lang, unlock.RogueUnlockDetail.Hash);
        }
      }

      const persona = {
        id: d.KLOEJIMMPJM,
        code: d.KLOEJIMMPJM + "",
        icon: getUrl(d.DOKOMKFGOOC, "dicloud"),
        name: TextMap.getText(this.lang, d.MJOOFPBABEA?.Hash),
        desc: TextMap.getText(this.lang, d.DDGDJCKKHPH?.Hash),
        effect: TextMap.getText(this.lang, d.NMAHGFAPENI?.Hash),
        wishpowerGain: TextMap.getText(this.lang, d.PJNNPOKJEFD?.Hash),
        skill: TextMap.getText(this.lang, d.FBOICELIKNJ?.Hash),
        params: d.PBLPLDJKPEI.map(p => p.Value),
        unlockDetail: unlockDetailText,
      } as HsrRoguePersona;

      // 设置文本标签信息
      TextMap.setTagInfo(this.lang, d.MJOOFPBABEA?.Hash, {
        category: {
          roguePersona: d.KLOEJIMMPJM + "",
          type: "RoguePersonaStyle",
        },
        tags: ["rogue-tourn"]
      });
      TextMap.setTagInfo(this.lang, d.DDGDJCKKHPH?.Hash, {
        category: {
          roguePersona: d.KLOEJIMMPJM + "",
          type: "RoguePersonaStyle",
        },
        tags: ["rogue-tourn"]
      });
      TextMap.setTagInfo(this.lang, d.NMAHGFAPENI?.Hash, {
        category: {
          roguePersona: d.KLOEJIMMPJM + "",
          type: "RoguePersonaStyle",
        },
        tags: ["rogue-tourn"]
      });
      TextMap.setTagInfo(this.lang, d.PJNNPOKJEFD?.Hash, {
        category: {
          roguePersona: d.KLOEJIMMPJM + "",
          type: "RoguePersonaStyle",
        },
        tags: ["rogue-tourn"]
      });
      TextMap.setTagInfo(this.lang, d.FBOICELIKNJ?.Hash, {
        category: {
          roguePersona: d.KLOEJIMMPJM + "",
          type: "RoguePersonaStyle",
        },
        tags: ["rogue-tourn"]
      });

      if (d.JJKLIJNFIBB) {
        const unlock = unlockMap.get(d.JJKLIJNFIBB);
        if (unlock && unlock.RogueUnlockDetail?.Hash) {
          TextMap.setTagInfo(this.lang, unlock.RogueUnlockDetail.Hash, {
            category: {
              roguePersona: d.KLOEJIMMPJM + "",
              type: "RogueTournUnlock",
            },
            tags: ["rogue-tourn", "unlock"]
          });
        }
      }

      return persona;
    });

    return data;
  }


  getTitanList() { 
    return this.titanTypes.map(d => {
      return {
        id: d.RogueTitanType,
        code: d.RogueTitanType,
        type: d.RogueTitanCategory,
        name: TextMap.getText(this.lang, d.TitanTitle?.Hash),
        characterName: TextMap.getText(this.lang, d.CharacterName?.Hash),
        icon: getUrl(d.RogueTitanTalentIcon, "dicloud"),
        roundIcon: getUrl(d.RogueTitanAvatarRoundIconSmall, "dicloud"),
        picture: getUrl(d.RogueTitanCardIcon, "dicloud"),
        shadowPicture: getUrl(d.RogueTitanCardShadowIcon, "dicloud"),
      }
    })
  }

  /** 仅提取 Excel 入口，不依赖 Config/Story；后续剧情解析沿 npcJsonPath 继续关联。 */
  getEventList(): HsrRogueTournEvent[] {
    const npcs = new Map(this.tournNpcs.map(row => [row.RogueNPCID, row]));
    const displays = new Map(this.tournContentDisplays.map(row => [row.DisplayID, row]));
    const images = new Map(this.rogueImages.map(row => [row.ImageID, row]));

    return this.tournHandbookEvents
      .map(row => {
        const type = displays.get(row.TypeDisplayID);
        const unlock = displays.get(row.UnlockDisplayID);
        const image = images.get(row.ImageID);

        TextMap.setTagInfo(this.lang, row.EventTitle.Hash, {
          category: {
            rogue_tourn_event: String(row.EventHandbookID),
            type: "RogueTournHandBookEvent",
          },
          tags: ["rogue_tourn_event"],
        });
        for (const display of [type, unlock]) {
          if (!display) continue;
          TextMap.setTagInfo(this.lang, display.DisplayContent.Hash, {
            category: {
              rogue_tourn_event_display: String(display.DisplayID),
              type: "RogueTournContentDisplay",
            },
            tags: ["rogue_tourn_event_display"],
          });
        }

        return {
          id: row.EventHandbookID,
          code: String(row.EventHandbookID),
          name: TextMap.getText(this.lang, row.EventTitle.Hash),
          icon: image ? getUrl(image.ImagePath, "dicloud") : undefined,
          typeDisplayId: row.TypeDisplayID,
          typeName: type ? TextMap.getText(this.lang, type.DisplayContent.Hash) : undefined,
          unlockDisplayId: row.UnlockDisplayID,
          unlockDesc: unlock ? TextMap.getText(this.lang, unlock.DisplayContent.Hash) : undefined,
          imageId: row.ImageID,
          priority: row.Priority,
          isUsed: row.IsUsed,
          npcEntries: row.UnlockNPCProgressIDList.map(progress => ({
            id: progress.FDOELDMEBPE,
            npcJsonPath: npcs.get(progress.FDOELDMEBPE)?.NPCJsonPath,
          })),
        };
      })
      .sort((a, b) => a.priority - b.priority || a.id - b.id);
  }

  /**
   * 差分宇宙奇物列表
   *
   * 1) 图鉴条目（inHandbook=true）：
   *    - RogueTournHandbookMiracle 有 MiracleCategory
   *    - 每个 (图鉴, 赛季) 一条主条目（优先 MiracleID === HandbookMiracleID）
   *    - S3 图鉴 = Common68 + Rare66 + Legendary18 + Negative27 = 179
   * 2) 无图鉴特殊条目（inHandbook=false）：
   *    - 主表无 HandbookMiracleID（如「破解版」等变体）
   * 3) 无名称的丢弃；有图鉴时仍丢弃无分类条目 / 图鉴变体行
   */
  getMiracleList(): HsrRogueMiracle[] {
    type MiracleDisplay = RogueTournMiracleDisplay | RogueMiracleDisplay;

    const tournDisplayMap = new Map<number, RogueTournMiracleDisplay>();
    for (const d of this.tournMiracleDisplays) {
      tournDisplayMap.set(d.MiracleDisplayID, d);
    }
    const baseDisplayMap = new Map<number, RogueMiracleDisplay>();
    for (const d of this.miracleDisplays) {
      baseDisplayMap.set(d.MiracleDisplayID, d);
    }
    const effectMap = new Map<number, RogueMiracleEffect>();
    for (const e of this.miracleEffects) {
      effectMap.set(e.MiracleEffectID, e);
    }

    const resolveDisplayForMiracle = (
      m: RogueTournMiracle,
      handbook?: RogueTournHandbookMiracle,
    ): MiracleDisplay | undefined => {
      if (handbook) {
        return (
          tournDisplayMap.get(handbook.MiracleDisplayID)
          || baseDisplayMap.get(handbook.MiracleDisplayID)
          || tournDisplayMap.get(m.MiracleID)
          || baseDisplayMap.get(m.MiracleDisplayID)
        );
      }
      return (
        tournDisplayMap.get(m.MiracleID)
        || baseDisplayMap.get(m.MiracleDisplayID)
      );
    };

    /** 将 RogueMiracleEffect 转为输出对象（参考 Lightcone skill 嵌入） */
    const convertEffect = (
      effectId: number,
      miracleId: number,
    ): HsrRogueMiracleEffect | undefined => {
      const e = effectMap.get(effectId);
      if (!e) return undefined;

      const effect: HsrRogueMiracleEffect = {
        id: e.MiracleEffectID,
        desc: TextMap.getText(this.lang, e.MiracleDesc?.Hash ?? null),
        params: (e.ParamList ?? []).map(p => p.Value),
        dynamicHint: TextMap.getText(this.lang, e.MiracleDynamicHint?.Hash ?? null),
      };

      TextMap.setTagInfo(this.lang, e.MiracleDesc?.Hash ?? null, {
        category: {
          rogueMiracle: miracleId + "",
          type: "RogueMiracleEffect",
        },
        tags: ["rogue-tourn", "miracle"],
      });
      TextMap.setTagInfo(this.lang, e.MiracleDynamicHint?.Hash ?? null, {
        category: {
          rogueMiracle: miracleId + "",
          type: "RogueMiracleEffect",
        },
        tags: ["rogue-tourn", "miracle"],
      });

      return effect;
    };

    const tagMiracleText = (
      miracleId: number,
      display: MiracleDisplay | undefined,
      type: string,
    ) => {
      TextMap.setTagInfo(this.lang, display?.MiracleName?.Hash ?? null, {
        category: {
          rogueMiracle: miracleId + "",
          type,
        },
        tags: ["rogue-tourn", "miracle"],
      });
      TextMap.setTagInfo(this.lang, display?.MiracleBGDesc?.Hash ?? null, {
        category: {
          rogueMiracle: miracleId + "",
          type,
        },
        tags: ["rogue-tourn", "miracle"],
      });
    };

    /** 按 HandbookMiracleID 分组主表 */
    const miraclesByHandbook = new Map<number, RogueTournMiracle[]>();
    for (const m of this.tournMiracles) {
      if (m.HandbookMiracleID == null) continue;
      let list = miraclesByHandbook.get(m.HandbookMiracleID);
      if (!list) {
        list = [];
        miraclesByHandbook.set(m.HandbookMiracleID, list);
      }
      list.push(m);
    }

    const data: HsrRogueMiracle[] = [];
    const emittedIds = new Set<number>();

    // —— 1) 图鉴主条目 ——
    for (const handbook of this.tournHandbookMiracles) {
      if (!handbook.MiracleCategory) continue;

      const linked = miraclesByHandbook.get(handbook.HandbookMiracleID);
      if (!linked?.length) continue;

      const bySeason = _.groupBy(linked, m => m.TournMode);
      for (const [tournMode, candidates] of Object.entries(bySeason)) {
        const primary =
          candidates.find(m => m.MiracleID === handbook.HandbookMiracleID)
          || candidates[0];

        const display = resolveDisplayForMiracle(primary, handbook);
        const name = TextMap.getText(this.lang, display?.MiracleName?.Hash ?? null);
        if (!name) continue;

        const season = Number(String(tournMode).replace(/^Tourn/i, ""));
        const desc = TextMap.getText(this.lang, display?.MiracleBGDesc?.Hash ?? null);

        const miracle: HsrRogueMiracle = {
          id: primary.MiracleID,
          code: primary.MiracleID + "",
          season,
          category: handbook.MiracleCategory,
          miracleDisplayId: handbook.MiracleDisplayID,
          miracleEffectId: primary.MiracleEffectID,
          handbookMiracleId: handbook.HandbookMiracleID,
          inHandbook: true,
          name,
          desc,
          icon: getUrl(display?.MiracleIconPath ?? "", "dicloud"),
          figureIcon: getUrl(display?.MiracleFigureIconPath ?? "", "dicloud"),
          effect: convertEffect(primary.MiracleEffectID, primary.MiracleID),
        };

        tagMiracleText(primary.MiracleID, display, "RogueTournHandbookMiracle");
        emittedIds.add(primary.MiracleID);
        data.push(miracle);
      }
    }

    // —— 2) 无图鉴特殊条目（无 HandbookMiracleID，如破解版） ——
    for (const m of this.tournMiracles) {
      if (m.HandbookMiracleID != null) continue;
      if (emittedIds.has(m.MiracleID)) continue;

      const display = resolveDisplayForMiracle(m);
      const name = TextMap.getText(this.lang, display?.MiracleName?.Hash ?? null);
      if (!name) continue;

      const season = Number(String(m.TournMode).replace(/^Tourn/i, ""));
      const desc = TextMap.getText(this.lang, display?.MiracleBGDesc?.Hash ?? null);

      const miracle: HsrRogueMiracle = {
        id: m.MiracleID,
        code: m.MiracleID + "",
        season,
        category: m.MiracleCategory,
        miracleDisplayId: m.MiracleDisplayID,
        miracleEffectId: m.MiracleEffectID,
        inHandbook: false,
        name,
        desc,
        icon: getUrl(display?.MiracleIconPath ?? "", "dicloud"),
        figureIcon: getUrl(display?.MiracleFigureIconPath ?? "", "dicloud"),
        effect: convertEffect(m.MiracleEffectID, m.MiracleID),
      };

      tagMiracleText(m.MiracleID, display, "RogueTournMiracle");
      emittedIds.add(m.MiracleID);
      data.push(miracle);
    }

    return _.sortBy(data, ["season", "id"]);
  }
}
