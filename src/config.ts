// 월드 배치와 게임 수치 (한곳에서 조정)
export const WORLD = {
  plazaR: 14, // 중앙 광장 반지름
  boundR: 50.5, // 이동 가능한 월드 경계
  treeR: 3.4, // 트리 + 선물 충돌 반경
  arena: { x: 38, z: 0, r: 9.5 }, // 눈싸움 놀이터
  pathHalfW: 1.7,
  // 광장에서 뻗어 나가는 길 (방향 단위벡터, 시작·끝 거리)
  paths: [
    { ax: 0, az: -1, from: 13.2, to: 30.5 }, // 북: 오두막
    { ax: -1, az: 0, from: 13.2, to: 30.5 }, // 서: 오두막
    { ax: 1, az: 0, from: 13.2, to: 29 }, // 동: 눈싸움 놀이터
  ],
  cabins: [
    { x: 0, z: -35, rot: 0 },
    { x: -35, z: 0, rot: Math.PI / 2 },
  ],
  spawn: { x: 0, z: 8.5 },
};

export const PLAYER = {
  maxSpeed: 3.8,
  accel: 9,
  decel: 11,
  turnRate: 11,
  radius: 0.38,
};

export type Zone = 'plaza' | 'field' | 'arena' | 'path' | 'cabin';

export const ZONE_NAMES: Record<Zone, string> = {
  plaza: '중앙 광장',
  field: '눈사람 들판',
  arena: '눈싸움 놀이터',
  path: '오솔길',
  cabin: '오두막 앞',
};

export function onPath(x: number, z: number, margin = 0): boolean {
  for (const p of WORLD.paths) {
    const along = x * p.ax + z * p.az;
    const perp = Math.abs(x * p.az - z * p.ax);
    if (along >= p.from - margin && along <= p.to + margin && perp < WORLD.pathHalfW + margin) return true;
  }
  return false;
}

export function zoneAt(x: number, z: number): Zone {
  if (Math.hypot(x, z) < WORLD.plazaR) return 'plaza';
  const a = WORLD.arena;
  if (Math.hypot(x - a.x, z - a.z) < a.r) return 'arena';
  for (const c of WORLD.cabins) if (Math.hypot(x - c.x, z - c.z) < 6) return 'cabin';
  if (onPath(x, z)) return 'path';
  return 'field';
}
