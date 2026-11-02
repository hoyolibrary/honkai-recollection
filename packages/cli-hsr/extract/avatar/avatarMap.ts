import fs from "fs/promises";
import JSONBig from "json-bigint";
import _ from "lodash";
import type { AvatarConfig, ItemConfigAvatar } from "schema/AvatarConfig";
import type { HsrAvatarSkill, HsrGameAvatarSimple } from "@game/games/hsr/HsrGameAvatar";
import TextMap from "../../text";
import { getSkillIconUrl, getUrl } from "../../url";

/** AvatarSkill / FrontSkill / BackBESkill / ServantSkill 的展示字段交集。 */
export interface AvatarSkillLike {
  SkillID: number;
  SkillName?: { Hash: bigint };
  SkillTag?: { Hash: bigint };
  SkillTypeDesc?: { Hash: bigint };
  SkillDesc?: { Hash: bigint };
  SimpleSkillDesc?: { Hash: bigint };
  SkillIcon?: string;
  AttackType?: string;
  SkillEffect?: string;
  SkillTriggerKey?: string;
  Level?: number;
  MaxLevel?: number;
  ParamList?: { Value: number }[];
  SimpleParamList?: { Value: number }[];
  StanceDamageDisplay?: number;
  BPNeed?: { Value: number };
  SPNeed?: { Value: number };
}

export interface MapAvatarSimpleOptions {
  id: number;
  isCollaboration?: boolean;
  categoryKey?: string;
  nameType?: string;
  descType?: string;
  tags?: string[];
}

export interface MapAvatarSkillOptions {
  ownerId: number;
  configType: string;
  categoryKey?: string;
  tags?: string[];
  /** 为 false 时不写 code（忆灵原逻辑） */
  includeCode?: boolean;
  /** 为 true 时 bp/sp ≤ 0 不输出（棋子） */
  omitNonPositiveCost?: boolean;
}

export async function readExcel<T>(name: string): Promise<T[]> {
  const json = await fs.readFile(`./data/ExcelOutput/${name}.json`, "utf-8");
  return JSONBig.parse(json);
}

/** 普通角色表；mergeCollaboration 时并入 AvatarConfigLD。 */
export async function loadAvatarIdentity(mergeCollaboration = false) {
  const avatars = await readExcel<AvatarConfig>("AvatarConfig");
  const items = await readExcel<ItemConfigAvatar>("ItemConfigAvatar");
  if (!mergeCollaboration) {
    return { avatars, items, collabIds: new Set<number>() };
  }

  let collab: AvatarConfig[] = [];
  let collabItems: ItemConfigAvatar[] = [];
  try {
    collab = await readExcel<AvatarConfig>("AvatarConfigLD");
    collabItems = await readExcel<ItemConfigAvatar>("ItemConfigAvatarLD");
  } catch {
    // 无联动表
  }

  return {
    avatars: [...avatars, ...collab],
    items: [...items, ...collabItems],
    collabIds: new Set(collab.map(a => a.AvatarID)),
  };
}

export function mapAvatarSimple(
  lang: string,
  avatar: AvatarConfig | undefined,
  item: ItemConfigAvatar | undefined,
  options: MapAvatarSimpleOptions,
): HsrGameAvatarSimple {
  const id = options.id;
  const categoryKey = options.categoryKey ?? "avatar";
  const tags = options.tags ?? ["avatar"];

  const simple = {
    id,
    code: avatar?.AvatarVOTag || id + "",
    name: TextMap.getText(lang, avatar?.AvatarName?.Hash),
    icon: getUrl(item?.ItemAvatarIconPath || "", "dicloud"),
    roundIcon: getUrl(avatar?.AvatarSideIconPath || "", "dicloud"),
    portrait: getUrl(avatar?.AvatarCutinFrontImgPath || "", "srtools"),
    rarity: avatar
      ? Number(String(avatar.Rarity).replace("CombatPowerAvatarRarityType", ""))
      : undefined,
    element: avatar?.DamageType,
    path: avatar?.AvatarBaseType,
    desc: TextMap.getText(lang, item?.ItemBGDesc?.Hash),
    isCollaboration: options.isCollaboration ?? false,
  } as HsrGameAvatarSimple;

  if (avatar?.AvatarName?.Hash) {
    TextMap.setTagInfo(lang, avatar.AvatarName.Hash, {
      category: { [categoryKey]: id + "", type: options.nameType ?? "AvatarConfig" },
      tags,
    });
  }
  if (item?.ItemBGDesc?.Hash) {
    TextMap.setTagInfo(lang, item.ItemBGDesc.Hash, {
      category: { [categoryKey]: id + "", type: options.descType ?? "ItemConfigAvatar" },
      tags,
    });
  }

  return simple;
}

export function mapAvatarSkill(
  lang: string,
  levels: AvatarSkillLike[],
  options: MapAvatarSkillOptions,
): HsrAvatarSkill | undefined {
  if (!levels.length) return undefined;
  const sorted = _.sortBy(levels, x => x.Level ?? 1);
  const d = sorted[0];
  const firstLevel = d.Level ?? 1;

  const skill = {
    id: d.SkillID,
    name: TextMap.getText(lang, d.SkillName?.Hash),
    icon: getSkillIconUrl(d.SkillIcon || ""),
    type: d.AttackType,
    typeText: TextMap.getText(lang, d.SkillTypeDesc?.Hash),
    effect: d.SkillEffect,
    effectText: TextMap.getText(lang, d.SkillTag?.Hash),
    desc: TextMap.getText(lang, d.SkillDesc?.Hash),
    simpleDesc: TextMap.getText(lang, d.SimpleSkillDesc?.Hash),
    maxLevel: d.MaxLevel ?? 1,
    levels: sorted.map(x => ({
      level: x.Level ?? 1,
      params: (x.ParamList ?? []).map(p => p.Value),
      simpleParams: (x.SimpleParamList ?? []).map(p => p.Value),
    })),
  } as HsrAvatarSkill;

  if (options.includeCode !== false) {
    skill.code = `${d.SkillID}_${firstLevel}`;
  }

  skill.toughness = d.StanceDamageDisplay;

  const bp = d.BPNeed?.Value;
  const sp = d.SPNeed?.Value;
  if (options.omitNonPositiveCost) {
    if (bp && bp > 0) skill.bpCost = bp;
    if (sp && sp > 0) skill.spCost = sp;
  } else {
    if (bp) skill.bpCost = bp;
    if (sp) skill.spCost = sp;
  }

  const categoryKey = options.categoryKey ?? "avatar";
  const tags = options.tags ?? ["skill"];
  for (const hash of [d.SkillName?.Hash, d.SkillDesc?.Hash, d.SimpleSkillDesc?.Hash]) {
    if (hash == null) continue;
    TextMap.setTagInfo(lang, hash, {
      category: { [categoryKey]: options.ownerId + "", type: options.configType },
      tags,
    });
  }

  return skill;
}

export function mapAvatarSkillList(
  lang: string,
  skills: AvatarSkillLike[],
  order: number[],
  options: MapAvatarSkillOptions,
): HsrAvatarSkill[] {
  const groups = _.groupBy(skills, x => x.SkillID);
  const mapped = Object.values(groups)
    .map(levels => mapAvatarSkill(lang, levels, options))
    .filter((s): s is HsrAvatarSkill => !!s);
  return _.sortBy(mapped, x => order.indexOf(x.id));
}
