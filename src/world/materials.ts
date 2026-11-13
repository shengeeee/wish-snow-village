import * as THREE from 'three';

const cache = new Map<string, THREE.MeshStandardMaterial>();

/** 색·거칠기별로 공유되는 기본 재질 */
export function std(color: number, roughness = 0.85, metalness = 0): THREE.MeshStandardMaterial {
  const key = `${color}/${roughness}/${metalness}`;
  let m = cache.get(key);
  if (!m) cache.set(key, (m = new THREE.MeshStandardMaterial({ color, roughness, metalness })));
  return m;
}

/** 스스로 빛나는 창문·등불 재질 */
export function glow(color: number, intensity = 1.2): THREE.MeshStandardMaterial {
  const key = `glow/${color}/${intensity}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.6 });
    cache.set(key, m);
  }
  return m;
}

export const COLORS = {
  snow: 0xf6f4f3,
  snowShade: 0xe6e8f2,
  pine: 0x2f5c49,
  pineLight: 0x3c6e56,
  trunk: 0x7a5a45,
  woodCream: 0xe9d6b6,
  woodBrown: 0xb98f6b,
  woodDark: 0x7d5b47,
  roofRed: 0xb5524a,
  roofGreen: 0x40695a,
  red: 0xc5524a,
  green: 0x3f6f57,
  gold: 0xe2b45a,
  cream: 0xf3e7cf,
  iron: 0x3d3c4d,
  warm: 0xffc47a,
};

export const SNOW = () => std(COLORS.snow, 1);
