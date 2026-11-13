// 렌더러 · 씬 · 루프를 묶는 게임 본체
import * as THREE from 'three';
import { PLAYER, WORLD, ZONE_NAMES, zoneAt, type Zone } from '../config';
import { CHARACTER_HEIGHT, PALETTES, PlayerCharacter, type PaletteKey } from '../character/PlayerCharacter';
import { World } from '../world/World';
import { Snowfall } from '../world/Snowfall';
import type { Interactable } from '../world/types';
import { FollowCamera } from './FollowCamera';
import { Input } from './Input';
import { detectQuality, type Quality } from './quality';
import { dampAngle } from './util';
import type { Hud } from '../ui/hud';

export class Game {
  readonly quality: Quality = detectQuality();
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam = new FollowCamera();
  private input: Input;
  private world: World;
  private snow: Snowfall;
  private sun: THREE.DirectionalLight;
  private character = new PlayerCharacter();
  private pos = new THREE.Vector3(WORLD.spawn.x, 0, WORLD.spawn.z);
  private vel = new THREE.Vector3();
  private facing = 0; // +z(카메라 쪽)를 바라보며 시작
  private clock = new THREE.Clock();
  private pixelRatio: number;
  private fpsFrames = 0;
  private fpsTime = 0;
  private zone: Zone | null = null;
  private current: Interactable | null = null;
  private tmp = new THREE.Vector3();
  private lightRight = new THREE.Vector3();
  private lightUp = new THREE.Vector3();
  private lightOffset = new THREE.Vector3(-22, 34, 18);

  constructor(private canvas: HTMLCanvasElement, private hud: Hud) {
    const q = this.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q.tier !== 'low', powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(window.devicePixelRatio, q.maxPixelRatio);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 겨울 저녁: 푸른 환경광 + 낮게 깔린 따뜻한 노을빛
    this.scene.add(new THREE.HemisphereLight(0xaab2ff, 0xf3e3da, 1.05));
    const sun = (this.sun = new THREE.DirectionalLight(0xffcfae, 1.55));
    sun.castShadow = true;
    sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    const S = 26;
    Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 120 });
    sun.shadow.radius = 5;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun, sun.target);
    // 그림자 텍셀에 맞춰 스냅하기 위한 빛 기준 축
    const dir = this.lightOffset.clone().normalize();
    this.lightRight.crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
    this.lightUp.crossVectors(dir, this.lightRight).normalize();

    this.world = new World(this.scene, q, (t) => this.hud.say(t));
    this.snow = new Snowfall(q.snowflakes);
    this.scene.add(this.snow.points);

    this.character.root.position.copy(this.pos);
    this.scene.add(this.character.root);

    this.input = new Input(canvas, hud.joystick);
    this.input.onInteract = () => this.interact();
    hud.onContext = () => this.interact();
    this.cam.setIntro(true);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  /** 닉네임·패딩 색 미리보기 (팝업에서 실시간 반영) */
  previewProfile(nickname: string, color: PaletteKey): void {
    this.character.setPalette(PALETTES[color]);
    this.hud.setNickname(nickname);
  }

  /** 닉네임 팝업 열림/닫힘에 따라 조작과 카메라를 전환 */
  setIntro(on: boolean): void {
    this.input.enabled = !on;
    this.cam.setIntro(on);
    this.hud.setPlaying(!on);
  }

  private interact(): void {
    if (this.input.enabled) this.current?.action();
  }

  private resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.cam.camera.aspect = w / h;
    this.cam.camera.updateProjectionMatrix();
  }

  private tick(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const input = this.input;
    input.poll();

    // ── 이동: 카메라 기준 방향, 가속·감속 보간 ──
    this.cam.rotate(input.lookDX, input.lookDY);
    this.cam.zoomBy(input.zoom);
    const yaw = this.cam.yaw;
    const wx = Math.cos(yaw) * input.moveX - Math.sin(yaw) * input.moveY;
    const wz = -Math.sin(yaw) * input.moveX - Math.cos(yaw) * input.moveY;
    const moving = Math.hypot(wx, wz) > 0.01;
    const k = 1 - Math.exp(-(moving ? PLAYER.accel : PLAYER.decel) * dt);
    this.vel.x += (wx * PLAYER.maxSpeed - this.vel.x) * k;
    this.vel.z += (wz * PLAYER.maxSpeed - this.vel.z) * k;
    this.pos.addScaledVector(this.vel, dt);
    this.world.resolve(this.pos, PLAYER.radius);
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (speed > 0.2) this.facing = dampAngle(this.facing, Math.atan2(this.vel.x, this.vel.z), PLAYER.turnRate, dt);
    this.character.root.position.copy(this.pos);
    this.character.root.rotation.y = this.facing;
    this.character.setMoveSpeed(speed / PLAYER.maxSpeed);
    this.character.update(dt);

    this.world.update(dt, t);
    this.cam.update(dt, this.pos, this.world.blocked);
    this.snow.update(t, this.cam.camera, this.canvas.height);
    this.updateShadow();
    this.updateHud();

    this.renderer.render(this.scene, this.cam.camera);
    input.endFrame();
    this.adaptQuality(dt);
  }

  /** 그림자 영역이 플레이어를 따라가되, 텍셀 단위로 스냅해 떨림을 막는다 */
  private updateShadow(): void {
    const texel = 52 / this.quality.shadowSize;
    const x = this.pos.dot(this.lightRight), y = this.pos.dot(this.lightUp);
    this.tmp.copy(this.pos)
      .addScaledVector(this.lightRight, Math.round(x / texel) * texel - x)
      .addScaledVector(this.lightUp, Math.round(y / texel) * texel - y);
    this.sun.target.position.copy(this.tmp);
    this.sun.position.copy(this.tmp).add(this.lightOffset);
  }

  private updateHud(): void {
    // 이름표
    this.tmp.set(this.pos.x, CHARACTER_HEIGHT + 0.28, this.pos.z).project(this.cam.camera);
    this.hud.placeNametag((this.tmp.x * 0.5 + 0.5) * window.innerWidth, (-this.tmp.y * 0.5 + 0.5) * window.innerHeight, this.tmp.z < 1);

    const z = zoneAt(this.pos.x, this.pos.z);
    if (z !== this.zone) { this.zone = z; this.hud.setZone(ZONE_NAMES[z]); }
    const it = this.input.enabled ? this.world.nearest(this.pos.x, this.pos.z) : null;
    if (it !== this.current) { this.current = it; this.hud.setContext(it?.label ?? null); }
  }

  /** 프레임이 목표보다 낮으면 해상도 → 그림자 순으로 품질을 낮춘다 */
  private adaptQuality(dt: number): void {
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime < 3) return;
    const fps = this.fpsFrames / this.fpsTime;
    this.fpsFrames = 0; this.fpsTime = 0;
    if (document.hidden || fps >= this.quality.targetFps) return;
    if (this.pixelRatio > 0.8) {
      this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.25);
      this.renderer.setPixelRatio(this.pixelRatio);
    } else if (this.renderer.shadowMap.enabled && fps < this.quality.targetFps * 0.7) {
      this.renderer.shadowMap.enabled = false;
      this.sun.castShadow = false;
    }
  }
}
