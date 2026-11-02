import { downloadTemplate } from "giget";

export interface PullGameDataOptions {
  /** GitHub 仓库，格式：用户名/仓库名，如 DimbreathBot/AnimeGameData */
  repo: string;
  /** 要拉取的目录名列表（远程路径 = 本地 baseDir/目录名，不重命名） */
  dirs: string[];
  /** 本地根目录，默认 ./data */
  baseDir?: string;
}

/**
 * 从 GitHub 仓库按目录拉取游戏源数据到本地。
 * 目录名保持与仓库一致，不做重命名。
 */
export async function pullGameData(options: PullGameDataOptions): Promise<void> {
  const { repo, dirs, baseDir = "./data" } = options;

  for (const dir of dirs) {
    console.log(`正在拉取 ${dir}`);
    const ret = await downloadTemplate(`github:${repo}/${dir}`, {
      dir: `${baseDir}/${dir}`,
      force: true,
    });
    console.log(`拉取完成: ${ret.dir}`);
  }
}
