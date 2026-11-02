import fs from "fs/promises";
import path from "path";

import _ from "lodash";
import JSONBig from "json-bigint";
import { forEachAsync } from "hoyo-cli-common";
import { ChallengeBossExtractor } from "./ChallengeBossExtractor";
import { ChallengeMazeExtractor } from "./ChallengeMazeExtractor";
import { ChallengePeakExtractor } from "./ChallengePeakExtractor";
import { ChallengeStoryExtractor } from "./ChallengeStoryExtractor";
import type { HsrChallengeSeasonBase } from "@game/games/hsr/challenge";

interface ChallengeExtractor {
  init(): Promise<void>;
  getSeasonList(): HsrChallengeSeasonBase[];
}

/** 已实现的模式 → Extractor，按数组顺序驱动 */
const modeExtractors: [string, new (lang: string) => ChallengeExtractor][] = [
  ["maze", ChallengeMazeExtractor],
  ["story", ChallengeStoryExtractor],
  ["boss", ChallengeBossExtractor],
  ["peak", ChallengePeakExtractor],
];

export async function extractChallengeData(lang: string, rootPath: string) {
  for (const [mode, Extractor] of modeExtractors) {
    const outpath = path.join(rootPath, `./${lang}/challenge/${mode}`);
    await fs.mkdir(outpath, { recursive: true });

    const extractor = new Extractor(lang);

    console.log(`加载逐光捡金[${mode}]数据`);
    await extractor.init();

    console.log(`生成逐光捡金[${mode}]期数据...`);
    const seasons = extractor.getSeasonList();

    const result = await forEachAsync(
      seasons,
      async (season, _, signal) => {
        await fs.writeFile(
          path.join(outpath, `${season.id}.json`),
          JSONBig.stringify(season, null, 2),
          { signal },
        );
      },
      {
        concurrency: 32,
        stopOnError: false,
      },
    );

    if (result.errors.length > 0) {
      console.warn(`存在逐光捡金[${mode}]期数据写入失败:`, result.errors);
    }

    console.log(`写入逐光捡金[${mode}]期索引数据...`);
    const simpleSeasons = seasons.map(s => _.omit(s, ["floors"]));
    await fs.writeFile(path.join(outpath, "index.json"), JSONBig.stringify(simpleSeasons, null, 2));
  }
}
