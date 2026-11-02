

// 仅收录自动推算（开始任务 worldId）仍不正确的章节；千星城 602 相关章节
// 由 assignSplitWorlds 自动搬移，不在此列（旧 500501/105007/105008/804501 四条已验证冗余移除）。
// 若某次上游更新后章节世界漂移，先用「graph vs raw WorldID 漂移清单」核对再加入本表。
export const chapterWorldMapFix : {
  [chapterId: number]: number
} = {
  803601: 501, // 天气真好，养它！
  801411: 201, // 星际决胜庆典
  802001: 301, // 金人旧巷市廛喧
  601101: 401, // 梦的解析
}

export const endmostChapterIds = [
  104009, // 记忆是梦的开场白
];

/**
 * 编年史任务图片文件 ID 修正：MainMissionID → 实际上传的图片数字 ID。
 *
 * 只记录已人工核对的异常命名；性别后缀及文件名大小写仍由提取器根据桶内实际文件判断。
 */
export const mainMissionIconIdFix: Record<number, number> = {
  1043660: 10403660, // 重逢啊，笑泪相拥的约定
  1054000: 10540000, // 每个人都能成名十五分钟
  1054010: 10540010, // 象征交换与侦探
};
