import fs from "fs/promises";
import JSONBig from "json-bigint";
import type { HsrAvatarExRank } from "@game/games/hsr/HsrAvatarExRank";
import type { AvatarExRankConfig } from "schema/AvatarExRankConfig";
import type { AvatarSkillConfig } from "schema/AvatarSkillConfig";
import TextMap from "../../text";
import { getUrl } from "../../url";

/** 普通角色奇缘星魂；货币战争的同 ID 配置不能复用本类的描述和参数。 */
export class AvatarExRankExtractor {
  exRankConfigs: AvatarExRankConfig[] = [];
  avatarSkills: AvatarSkillConfig[] = [];

  constructor(private lang: string) {}

  async init() {
    const [ranks, skills] = await Promise.all([
      fs.readFile("./data/ExcelOutput/AvatarExRankConfig.json", "utf-8"),
      fs.readFile("./data/ExcelOutput/AvatarSkillConfig.json", "utf-8"),
    ]);
    this.exRankConfigs = JSONBig.parse(ranks);
    this.avatarSkills = JSONBig.parse(skills);
    await TextMap.loadMap(this.lang);
  }

  getExRankList(): HsrAvatarExRank[] {
    const relatedSkills = new Map<number, Set<number>>();
    for (const skill of this.avatarSkills) {
      for (const exRankId of skill.RelatedExRankIDList) {
        const ids = relatedSkills.get(exRankId) ?? new Set<number>();
        ids.add(skill.SkillID);
        relatedSkills.set(exRankId, ids);
      }
    }

    return this.exRankConfigs.map(row => {
      const tag = {
        category: {
          avatar: String(row.ACCJKGEKHKP),
          ex_rank: String(row.PHFMCACHFIJ),
          type: "AvatarExRankConfig",
        },
        tags: ["avatar", "ex_rank", "skill"],
      };
      TextMap.setHashedTagInfo(this.lang, row.OENAMINOLLF, tag);
      TextMap.setHashedTagInfo(this.lang, row.NMAHGFAPENI, tag);
      TextMap.setTagInfo(this.lang, row.AGOHEFBOPNO.Hash, tag);

      const rank: HsrAvatarExRank = {
        id: row.PHFMCACHFIJ,
        code: `AvatarExRank_${row.PHFMCACHFIJ}`,
        avatarId: row.ACCJKGEKHKP,
        name: TextMap.getHashedText(this.lang, row.OENAMINOLLF),
        desc: TextMap.getHashedText(this.lang, row.NMAHGFAPENI),
        effectText: TextMap.getText(this.lang, row.AGOHEFBOPNO.Hash),
        icon: getUrl(row.OLOIFNNLKJP, "srtools"),
        picture: getUrl(row.AIAFHMFPFMN, "srtools")!,
        panelPrefabPath: row.DPPHHNMHPAK,
        triggerHash: row.OIBKPJEGPOK.Hash,
        params: row.NNACKOBKFGE.map(param => param?.Value),
        rankAbilities: [...row.NNFEGHLLEPH],
        extraEffectIds: [...row.BDECHFIJBFA],
        relatedSkillIds: [...(relatedSkills.get(row.PHFMCACHFIJ) ?? [])].sort((a, b) => a - b),
        unlockCost: { itemId: row.PKBNJLOLPBM.ItemID, num: row.PKBNJLOLPBM.ItemNum },
        guideVideoId: row.ODEKADIBFAO,
      };
      return rank;
    }).sort((a, b) => a.id - b.id);
  }

  getExRanksByAvatarId(avatarId: number): HsrAvatarExRank[] {
    return this.getExRankList().filter(rank => rank.avatarId === avatarId);
  }
}
