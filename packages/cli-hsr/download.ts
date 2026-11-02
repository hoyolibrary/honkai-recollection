/**
 * 仅在不想拉取完整 TurnBasedGameData 子仓库时，才手动使用本脚本。
 * 在 packages/cli-hsr 目录执行：pnpm exec tsx ./download.ts。
 * 仅下载 ExcelOutput 和 TextMap，不包含 Config、Story 等完整数据。
 * 完整数据应从仓库根目录通过 git submodule update --init extern/TurnBasedGameData 准备。
 * 本脚本会覆盖 ./data 下的对应目录，不用于更新已初始化的数据子仓库。
 */
import { pullGameData } from "hoyo-cli-common";

async function main() {
  try {
    await pullGameData({
      repo: "DimbreathBot/TurnBasedGameData",
      dirs: ["ExcelOutput", "TextMap"],
    });
  } catch (err) {
    console.error("拉取失败:", err);
    process.exitCode = 1;
  }
}

main();
