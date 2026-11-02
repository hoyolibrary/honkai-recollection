/**
 * 虚构专用血量：等级曲线转 Single，输入量化到 Q32，逐次定点相乘后 floor。
 * 结果按虚构血量回归口径对照。
 */
export function calculateStoryHp(
  hpBase: number,
  curveRatio: number,
  eliteRatio = 1,
  modifyRatio = 1,
  waveMultiplier = 1,
): number {
  const scale = 1n << 32n;
  const encode = (value: number) => BigInt(Math.trunc(value * Number(scale)));
  let raw = encode(hpBase);
  for (const ratio of [Math.fround(curveRatio), eliteRatio, modifyRatio, waveMultiplier]) {
    raw = (raw * encode(ratio)) >> 32n;
  }
  return Number(raw / scale);
}
