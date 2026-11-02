import { normalizeAssetPath, matchUrl, type MatchItem } from "hoyo-cli-common";

export { normalizeAssetPath };

export type SiteNames = "miyoushe" | "hakushin" | "srtools" | "dicloud" | "dicloud-s3" | "main";

const hakushinMatches: MatchItem[] = [
  {
    pattern: /AvatarDrawCard\/(\d+).png/i,
    fn: (_, id) => `https://api.hakush.in/hsr/UI/avatardrawcard/${id}.webp`,
  },
  {
    pattern: /AvatarRoundIcon\/Avatar\/(\d+).png/i,
    fn: (_, id) => `https://api.hakush.in/hsr/UI/avatarroundicon/${id}.webp`,
  },
  {
    pattern: /AvatarShopIcon\/(\d+).png/i,
    fn: (_, id) => `https://api.hakush.in/hsr/UI/avatarshopicon/${id}.webp`,
  },
  {
    pattern: /SkillIcons\/Avatar\/\d+\/(\w+).png/i,
    fn: (_, name) => `https://api.hakush.in/hsr/UI/skillicons/${name}.webp`,
  },
  {
    pattern: /ServantIconTeam\/(\d+).png/i,
    fn: (_, id) => `https://api.hakush.in/hsr/UI/servanticonteam/${id}.webp`,
  },
  {
    pattern: /CardFigure\/CardFigure_(\d+).png/i,
    fn: (_, id) => `https://api.hakush.in/hsr/UI/special_1415/cardfigure/CardFigure_${id}.webp`,
  },
];

const srtoolsMatches: MatchItem[] = [
  {
    pattern: /AvatarShopIcon\/Avatar\/(\d+).png/i,
    fn: (_, id) =>
      `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/avatarshopicon/avatar/${id}.webp`,
  },
  {
    pattern: /AvatarDrawCard\/(\d+).png/i,
    fn: (_, id) => `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/avatardrawcard/${id}.webp`,
  },
  {
    pattern: /AvatarDrawCard\/AvatarSkin\/(\d+).png/i,
    fn: (_, id) =>
      `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/avatardrawcard/avatarskin/${id}.webp`,
  },
  {
    pattern: /SkillIcons\/Avatar\/(\d+)\/(\w+).png/i,
    fn: (_, id, name) =>
      `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/skillicons/avatar/${id}/${name}.webp`,
  },
  {
    pattern: /LightConeMediumIcon\/(\d+).png/i,
    fn: (_, id) =>
      `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/lightconemediumicon/${id}.webp`,
  },
  {
    pattern: /LightConeMaxFigures\/(\d+).png/i,
    fn: (_, id) =>
      `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/lightconemaxfigures/${id}.webp`,
  },
  {
    pattern: /ItemFigures\/([A-Za-z0-9_/{}#]+).png/i,
    fn: (_, name) =>
      `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/itemfigures/${name}.webp`,
  },
  {
    pattern: /MonsterFigure\/([A-Za-z0-9_/{}#]+).png/i,
    fn: (_, name) =>
      `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/monsterfigure/${name}.webp`,
  },
];

const dicloudMatches: MatchItem[] = [
  {
    pattern: /AvatarRoundIcon\/Avatar\/(\d+).png/i,
    fn: (_, id) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/spriteoutput/avatarroundicon/${id}.png`,
  },
  {
    pattern: /ItemIcon\/([A-Za-z0-9_/{}#]+).png/i,
    fn: (_, name) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/spriteoutput/itemicon/${name}.png`,
  },
  {
    pattern: /AvatarShopIcon\/Avatar\/(\d+).png/i,
    fn: (_, id) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/spriteoutput/avatarshopicon/${id}.png`,
  },
  {
    pattern: /StellarCustomizationShopIcon\/(\d+).png/i,
    fn: (_, id) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/spriteoutput/stellarcustomizationshopicon/${id}.png`,
  },
  {
    pattern: /ServantRoundIcon\/(\d+).png/i,
    fn: (_, id) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/spriteoutput/servantroundicon/${id}.png`,
  },
  {
    pattern: /ServantIconTeam\/(\d+).png/i,
    fn: (_, id) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/spriteoutput/servanticonteam/${id}.png`,
  },
  {
    pattern: /CardFigure\/CardFigure_(\d+).png/i,
    fn: (_, id) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/cardfigure/CardFigure_${id}.png`,
  },
  {
    pattern: /DiceCombat\/(DiceCombat.+)\.png/i,
    fn: (_, name) => `https://cdn2.dicloud.work/static/apps/hkstarrail/dicecombat/${name}.png`,
  },
  {
    pattern: /DiceCombat\/([A-Za-z0-9]+)\/(DiceCombat.+)\.png/i,
    fn: (_, path, name) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/dicecombat/${path.toLowerCase()}/${name}.png`,
  },
  {
    pattern: /Book\/Img\/([A-Za-z0-9_]+)\.png/i,
    fn: (_, name) => `https://cdn2.dicloud.work/static/apps/hkstarrail/bookimg/${name}.png`,
  },
  {
    pattern: /Tourn\/Persona\/PersonaItem\/([A-Za-z0-9_]+)\/(RogueTourn.+)\.png/i,
    fn: (_, path, name) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/rogue/tourn/persona/${name}.png`,
  },
  {
    pattern: /Tourn\/Persona\/PersonaGift\/(.+)\.png/i,
    fn: (_, name) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/rogue/tourn/personagift/${name}.png`,
  },
  {
    pattern: /Tourn\/Persona\/RoomBuff\/(.+)\.png/i,
    fn: (_, name) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/rogue/tourn/roombuff/${name}.png`,
  },
  {
    pattern: /Tourn\/Titan\/TitanIcons\/(.+)\.png/i,
    fn: (_, name) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/rogue/tourn/titanicons/${name}.png`,
  },
  {
    pattern: /Tourn\/Titan\/AvatarRound\/(.+)\.png/i,
    fn: (_, name) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/rogue/tourn/avatarround/${name}.png`,
  },
  {
    pattern: /Tourn\/Titan\/AvatarEnv\/(.+)\.png/i,
    fn: (_, name) =>
      `https://cdn2.dicloud.work/static/apps/hkstarrail/rogue/tourn/avatarenv/${name}.png`,
  },
  {
    pattern: /Rogue\/MiracleIcon\/(\d+)\.png/i,
    fn: (_, id) => `https://cdn2.dicloud.work/static/apps/hkstarrail/rogue/miracleicon/${id}.png`,
  },
  {
    pattern: /TabIcon\/Abyss\/(.+)\.png/i,
    fn: (_, name) => `https://cdn2.dicloud.work/static/apps/hkstarrail/abyss/tabicon/${name}.png`,
  },
  {
    pattern: /SpriteOutput\/ChallengePeak\/(.+)\.png/i,
    fn: (_, name) => `https://cdn2.dicloud.work/static/apps/hkstarrail/abyss/challengepeak/${name}.png`,
  },
  {
    pattern: /GridFight\/(.+)\.png/i,
    fn: (_, name) => `https://cdn2.dicloud.work/static/apps/hkstarrail/gridfight/${name}.png`,
  },
];

const mainSiteMatches: MatchItem[] = [
  {
    pattern: /UI\/Avatar\/Icon\/(\w+).png/i,
    fn: (_, name) => `https://cdn2.dicloud.work/static/mihoyo-tools/hsr/icon/property/${name}.png`,
  },
];

/**
 * 技能图标。
 * - `SkillIcons/Avatar/**` 走 srtools（neonteam `.webp`）
 * - `GridFight/**` 必须走 cdn2.dicloud.work 的 `.png`。srtools 会把后缀改成 webp 并落到 neonteam，下载不到。
 */
export function getSkillIconUrl(filepath: string) {
  if (!filepath) {
    return "";
  }
  if (/GridFight/i.test(filepath)) {
    return getUrl(filepath, "dicloud");
  }
  return getUrl(filepath, "srtools");
}

export function getUrl(filepath: string, site: SiteNames = "dicloud") {
  if (!filepath) {
    return "";
  }
  filepath = normalizeAssetPath(filepath);
  // GridFight 资源只在 cdn2，且目录已被规范成小写（BattleIcon → battleicon）。
  // 误走 srtools/hakushin 会变成 neonteam webp，404。
  if ((site === "srtools" || site === "hakushin") && /\/gridfight\//i.test(filepath)) {
    site = "dicloud";
  }
  let url: string | undefined = "";
  switch (site) {
    case "hakushin":
      return matchUrl(filepath, hakushinMatches, "https://api.hakush.in/hsr/UI/");
    case "srtools":
      url = matchUrl(filepath, srtoolsMatches, "https://cdn.neonteam.dev/neonteam/assets/");
      url = url?.replace(/\.png$/, ".webp");
      return url;
    case "dicloud":
      return matchUrl(filepath, dicloudMatches, "https://cdn2.dicloud.work/static/apps/hkstarrail/");
    case "dicloud-s3":
      return matchUrl(
        filepath,
        dicloudMatches,
        "https://cdn2.dicloud.work/static/apps/hkstarrail/",
      )?.replace("cdn2", "cdn3");
    case "main":
      return matchUrl(filepath, mainSiteMatches, "/");
    default:
      throw new Error(`Unknown site: ${site}`);
  }
}
