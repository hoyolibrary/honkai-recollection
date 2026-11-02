import fs from "fs/promises";
import JSONBig from "json-bigint";
import path from "path";
import _ from "lodash";
import { forEachAsync } from "hoyo-cli-common";
import type { HsrGridFightRoleSimple } from "@game/games/hsr/quest/gridfight";
import { GridFightRoleExtractor } from "./GridFightRoleExtractor";
import { GridFightEquipExtractor } from "./GridFightEquipExtractor";
import { GridFightTraitExtractor } from "./GridFightTraitExtractor";
import { GridFightDivisionExtractor } from "./GridFightDivisionExtractor";
import { GridFightPortalExtractor } from "./GridFightPortalExtractor";
import { GridFightAugmentExtractor } from "./GridFightAugmentExtractor";

export async function extractGridFightData(lang: string, rootPath: string) {
  const outpath = path.join(rootPath, `./${lang}/gridfight`);
  await fs.mkdir(outpath, { recursive: true });

  const roleExtractor = new GridFightRoleExtractor(lang);
  console.log("加载货币战争角色数据");
  await roleExtractor.init();
  const roles = roleExtractor.getRoleList();

  const roleDir = path.join(outpath, "roles");
  await fs.mkdir(roleDir, { recursive: true });

  const result = await forEachAsync(
    roles,
    async (role, _, signal) => {
      await fs.writeFile(
        path.join(roleDir, role.id + ".json"),
        JSONBig.stringify(role, null, 2),
        { signal },
      );
    },
    { concurrency: 32, stopOnError: false },
  );
  if (result.errors.length > 0) {
    console.warn("存在货币战争角色写入失败:", result.errors);
  }

  const simpleRoles: HsrGridFightRoleSimple[] = _.sortBy(roles, r => r.id).map(role => ({
    ..._.omit(role, ["stars", "ranks", "recommendEquips"]),
    maxStar: role.maxStar,
    stars: role.stars.map(s => _.omit(s, ["skills", "backSkills"])),
  })) as HsrGridFightRoleSimple[];
  await fs.writeFile(path.join(roleDir, "index.json"), JSONBig.stringify(simpleRoles, null, 2));

  const equipExtractor = new GridFightEquipExtractor(lang);
  console.log("加载货币战争装备数据");
  await equipExtractor.init();
  const equips = equipExtractor.getEquipList();
  await fs.writeFile(path.join(outpath, "equips.json"), JSONBig.stringify(equips, null, 2));

  const traitExtractor = new GridFightTraitExtractor(lang);
  console.log("加载货币战争羁绊数据");
  await traitExtractor.init();
  const traits = traitExtractor.getTraitList();
  await fs.writeFile(path.join(outpath, "traits.json"), JSONBig.stringify(traits, null, 2));

  const divisionExtractor = new GridFightDivisionExtractor(lang);
  console.log("加载货币战争职级/词条数据");
  await divisionExtractor.init();
  const divisions = divisionExtractor.getDivisionList();
  const affixes = divisionExtractor.getAffixList();
  const camps = divisionExtractor.getCampList();
  await fs.writeFile(path.join(outpath, "divisions.json"), JSONBig.stringify(divisions, null, 2));
  await fs.writeFile(path.join(outpath, "affixes.json"), JSONBig.stringify(affixes, null, 2));
  await fs.writeFile(path.join(outpath, "camps.json"), JSONBig.stringify(camps, null, 2));

  const portalExtractor = new GridFightPortalExtractor(lang);
  console.log("加载货币战争投资环境数据");
  await portalExtractor.init();
  const portals = portalExtractor.getPortalList();
  await fs.writeFile(path.join(outpath, "portals.json"), JSONBig.stringify(portals, null, 2));

  const augmentExtractor = new GridFightAugmentExtractor(lang);
  console.log("加载货币战争投资策略数据");
  await augmentExtractor.init();
  const augments = augmentExtractor.getAugmentList();
  await fs.writeFile(path.join(outpath, "augments.json"), JSONBig.stringify(augments, null, 2));
}
