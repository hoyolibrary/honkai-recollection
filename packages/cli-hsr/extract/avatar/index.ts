import fs from "fs/promises";
import JSONBig from "json-bigint";

import path from "path";

import { forEachAsync } from "hoyo-cli-common";
import { AvatarExtractor } from "./AvatarExtractor";
import {
  HsrGameAvatarSimple,
  HsrGameServant,
  HsrGameServantSimple,
} from "@game/games/hsr/HsrGameAvatar";
import _ from "lodash";
import { ServantExtractor } from "./ServantExtractor";

export async function extractAvatarData(lang: string, rootPath: string) {

  const outpath = path.join(rootPath, `./${lang}/avatars`);
  await fs.mkdir(outpath, { recursive: true });


  let allAvatars: HsrGameAvatarSimple[] = [];

  for (const isCollaboration of [true, false]) {
    const extractor = new AvatarExtractor(lang, isCollaboration);

    console.log("加载角色关联数据 " + (isCollaboration ? "[联动]" : "[普通]"));
    await extractor.init();

    console.log("开始写入各个角色数据...");
    extractor.getAvatarList();
    extractor.fillAllAvatarData();

    allAvatars = allAvatars.concat(
      _.sortBy(Object.values(extractor.avatarMap), d => d.id)
        .map(d => ({
          ..._.omit(d, ["promotions", "versions"]),
          hasEnhancement: d.versions.length > 1,
          hasSkin: d.skins.length > 1,
        }) as any),
    );

    // const controller = new AbortController();
    const result = await forEachAsync(
      Object.values(extractor.avatarMap),
      async (avatar, _, signal) => {
        await fs.writeFile(
          path.join(outpath, avatar.id + ".json"),
          JSONBig.stringify(avatar, null, 2),
          { signal },
        );
      },
      {
        concurrency: 32,
        stopOnError: false,
        // signal: controller.signal,
      },
    );

    if (result.errors.length > 0) {
      console.warn("存在角色数据写入失败:", result.errors);
    }
  }

  console.log("写入完整角色列表数据...");
  allAvatars = _.sortBy(allAvatars, a => a.id);
  await fs.writeFile(path.join(outpath, "index.json"), JSONBig.stringify(allAvatars));

  const outpath2 = path.join(rootPath, `./${lang}/servants`);
  await fs.mkdir(outpath2, { recursive: true });

  let allServants: HsrGameServantSimple[] = [];
  const extractor = new ServantExtractor(lang);

  console.log("加载忆灵关联数据 ");
  await extractor.init();

  allServants = allServants.concat(extractor.getServantList());
  extractor.fillAllServantData();

  console.log("写入完整忆灵列表数据...");
  allServants = _.sortBy(allServants, a => a.id);
  await fs.writeFile(path.join(outpath2, "index.json"), JSONBig.stringify(allServants, null, 2));
  
}
