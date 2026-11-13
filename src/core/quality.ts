// 기기 성능에 따른 품질 단계
export interface Quality {
  tier: 'low' | 'mid' | 'high';
  maxPixelRatio: number;
  shadowSize: number;
  snowflakes: number;
  pointLights: number;
  targetFps: number;
}

const TIERS: Record<Quality['tier'], Quality> = {
  high: { tier: 'high', maxPixelRatio: 2, shadowSize: 2048, snowflakes: 7000, pointLights: 9, targetFps: 50 },
  mid: { tier: 'mid', maxPixelRatio: 1.5, shadowSize: 1024, snowflakes: 3500, pointLights: 5, targetFps: 28 },
  low: { tier: 'low', maxPixelRatio: 1, shadowSize: 1024, snowflakes: 1800, pointLights: 3, targetFps: 26 },
};

export const isTouch = (): boolean => window.matchMedia('(pointer: coarse)').matches;

export function detectQuality(): Quality {
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (isTouch() || small) return { ...(cores >= 8 ? TIERS.mid : TIERS.low) };
  return { ...TIERS.high };
}
