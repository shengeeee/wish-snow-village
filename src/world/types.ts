import type * as THREE from 'three';
import type { Bulbs } from './Bulbs';

/** 이동 충돌체 (바닥 평면 기준) */
export type Collider =
  | { kind: 'circle'; x: number; z: number; r: number }
  | { kind: 'box'; x: number; z: number; hw: number; hd: number; rot: number };

/** 카메라 가림 판정용 부피 */
export type Occluder =
  | { kind: 'cone'; x: number; z: number; r: number; h: number; y0?: number }
  | { kind: 'box'; x: number; z: number; hw: number; hd: number; rot: number; h: number };

/** 가까이 가면 상황별 버튼이 뜨는 대상 */
export interface Interactable {
  x: number;
  z: number;
  r: number;
  label: string;
  action: () => void;
}

/** 월드를 조립하는 동안 각 소품이 등록하는 공용 컨텍스트 */
export interface WorldCtx {
  root: THREE.Group;
  colliders: Collider[];
  occluders: Occluder[];
  interactables: Interactable[];
  bulbs: Bulbs;
  lights: THREE.PointLight[]; // 우선순위 순 (품질에 따라 앞에서부터 켠다)
  rng: () => number;
  say: (text: string) => void;
}
