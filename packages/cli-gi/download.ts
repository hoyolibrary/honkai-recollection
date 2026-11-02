import { pullGameData } from "hoyo-cli-common";

async function main() {
  try {
    await pullGameData({
      repo: "DimbreathBot/AnimeGameData",
      dirs: ["ExcelBinOutput", "Readable", "Subtitle", "TextMap"],
    });
  } catch (err) {
    console.error("拉取失败:", err);
    process.exitCode = 1;
  }
}

main();
