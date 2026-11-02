import fs from "fs/promises";
import JSONBig from "json-bigint";
import path from "path";

import TextMap from "../text";
import { getUrl } from "../url";

import type { HsrStatus } from "@game/games/hsr/HsrStatus";

/** StatusConfig.json 原始条目 */
interface StatusConfigEntry {
  StatusID: number;
  ModifierName: string;
  StatusName?: {
    Hash: bigint | number | string;
  };
  StatusType: string;
  StatusDesc?: {
    Hash: bigint | number | string;
  };
  StatusIconPath: string;
  StatusIconPathHighSize: string;
  StatusEffect?: {
    Hash: bigint | number | string;
  };
  CanDispel?: boolean;
  ReadParamList: string[];
  TagList: string[];
}

/** MonsterStatusResistanceType.json 原始条目 */
interface MonsterStatusResistanceTypeEntry {
  Type: string;
  Icon: string;
}

/**
 * 提取战斗状态配置 (statuses.json，全量)。
 *
 * StatusConfig 所有条目原样输出，StatusName/StatusDesc/StatusEffect 按 TextMap 解析为当前语言文本，
 * 图标路径转换为 CDN 地址。异常抗性等字典只聚合其中常用的 STAT_* 子集，
 * 由 MonsterStatusResistanceType 提供类型清单与免疫图标，名称取同族的 MCommon_* 通用异常条目。
 */
export async function extractStatusData(lang: string, rootPath: string) {
  const outpath = path.join(rootPath, `./${lang}/`);
  await fs.mkdir(outpath, { recursive: true });

  await TextMap.loadMap(lang);

  const statusConfig: StatusConfigEntry[] = JSONBig.parse(
    await fs.readFile(`./data/ExcelOutput/StatusConfig.json`, "utf-8"),
  );
  const resistTypes: MonsterStatusResistanceTypeEntry[] = JSONBig.parse(
    await fs.readFile(`./data/ExcelOutput/MonsterStatusResistanceType.json`, "utf-8"),
  );

  const getText = (hash?: bigint | number | string) =>
    hash != null ? TextMap.getText(lang, hash) : "";

  // 全量状态表
  const statusList: HsrStatus[] = statusConfig.map(item => {
    return {
      id: item.StatusID,
      modifierName: item.ModifierName,
      statusType: item.StatusType,
      name: getText(item.StatusName?.Hash),
      desc: getText(item.StatusDesc?.Hash),
      effect: getText(item.StatusEffect?.Hash),
      icon: getUrl(item.StatusIconPath, "dicloud") || "",
      iconHighSize: getUrl(item.StatusIconPathHighSize, "dicloud") || "",
      canDispel: item.CanDispel,
      readParamList: item.ReadParamList || [],
      tagList: item.TagList || [],
    };
  });

  await fs.writeFile(path.join(outpath, "statuses.json"), JSONBig.stringify(statusList, null, 2));

  // 异常抗性类型子集 (聚合字典用)
  // ModifierName → StatusName.Hash, 同名修饰符取最小 StatusID (通用条目在前)
  const nameHashByModifier: Record<string, bigint | number | string> = {};
  for (const entry of [...statusConfig].sort((a, b) => a.StatusID - b.StatusID)) {
    if (!entry.StatusName?.Hash || nameHashByModifier[entry.ModifierName] !== undefined) {
      continue;
    }
    nameHashByModifier[entry.ModifierName] = entry.StatusName.Hash;
  }

  const resistStatuses = resistTypes.map(item => {
    const modifierName = "MCommon_" + item.Type.replace(/^STAT_/, "");
    const nameHash = nameHashByModifier[modifierName];
    return {
      id: item.Type,
      name: nameHash != null ? TextMap.getText(lang, nameHash) : "",
      icon: getUrl(item.Icon, "main"),
      modifierName,
      isPercent: true,
    };
  });

  return { statuses: resistStatuses };
}
