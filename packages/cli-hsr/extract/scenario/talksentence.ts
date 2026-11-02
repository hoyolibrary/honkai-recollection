import _ from "lodash";
import fs from "fs/promises";
import path from "path";
import JSONBig from "json-bigint";
import TextMap from "../../text";
import { TalkSentenceConfig } from "schema/TalkSentenceConfig";
import { HsrTalkSentence } from "@game/games/hsr/HsrTalkSentence";

export async function extractTalkSentenceData(lang: string, rootPath: string) {
  const outpath = path.join(rootPath, `./${lang}/scenario`);
  await fs.mkdir(outpath, { recursive: true });

  await TextMap.loadMap(lang);

  const json = await fs.readFile("./data/ExcelOutput/TalkSentenceConfig.json", "utf-8");
  const configs: TalkSentenceConfig[] = JSONBig.parse(json);

  const data = _.sortBy(
    configs
      .filter((d): d is TalkSentenceConfig & { TalkSentenceID: number } => d.TalkSentenceID != null)
      .map(d => {
        const nameHash = d.TextmapTalkSentenceName?.Hash;
        const textHash = d.TalkSentenceText?.Hash;

        const item: HsrTalkSentence = {
          id: d.TalkSentenceID,
          name: TextMap.getText(lang, nameHash),
          text: TextMap.getText(lang, textHash),
          voiceId: d.VoiceID,
        };

        TextMap.setTagInfo(lang, nameHash, {
          category: {
            talk_sentence: d.TalkSentenceID + "",
            type: "TalkSentenceConfig",
          },
          tags: ["talk_sentence"],
        });
        TextMap.setTagInfo(lang, textHash, {
          category: {
            talk_sentence: d.TalkSentenceID + "",
            type: "TalkSentenceConfig",
          },
          tags: ["talk_sentence"],
        });

        return item;
      }),
    "id",
  );

  await fs.writeFile(
    path.join(outpath, "talksentence.json"),
    JSONBig.stringify(data, null, 2),
  );
}
