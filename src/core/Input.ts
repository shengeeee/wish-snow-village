// 키보드 · 마우스/터치 드래그 · 가상 조이스틱 입력을 하나로 모은다
export class Input {
  /** 이동 입력: x=오른쪽, y=앞 (-1~1) */
  moveX = 0;
  moveY = 0;
  /** 이번 프레임에 누적된 시점 회전(px)과 줌 */
  lookDX = 0;
  lookDY = 0;
  zoom = 0;
  enabled = false;
  onInteract: () => void = () => {};

  private keys = new Set<string>();
  private joyX = 0;
  private joyY = 0;
  private drags = new Map<number, { x: number; y: number }>();

  constructor(canvas: HTMLCanvasElement, joystick: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (isTyping(e.target)) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE' && !e.repeat && this.enabled) this.onInteract();
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      this.drags.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    canvas.addEventListener('pointermove', (e) => {
      const d = this.drags.get(e.pointerId);
      if (!d) return;
      this.lookDX += e.clientX - d.x;
      this.lookDY += e.clientY - d.y;
      d.x = e.clientX;
      d.y = e.clientY;
    });
    const end = (e: PointerEvent) => this.drags.delete(e.pointerId);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => { this.zoom += e.deltaY; e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // 가상 조이스틱
    const knob = joystick.querySelector<HTMLElement>('.knob')!;
    let id = -1, cx = 0, cy = 0;
    const R = 46;
    const set = (x: number, y: number) => {
      this.joyX = x; this.joyY = y;
      knob.style.transform = `translate(${x * R}px, ${-y * R}px)`;
    };
    joystick.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      joystick.setPointerCapture(id);
      const r = joystick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      move(e);
    });
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      let x = (e.clientX - cx) / R, y = -(e.clientY - cy) / R;
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      set(x, y);
    };
    const up = (e: PointerEvent) => { if (e.pointerId === id) { id = -1; set(0, 0); } };
    joystick.addEventListener('pointermove', move);
    joystick.addEventListener('pointerup', up);
    joystick.addEventListener('pointercancel', up);
  }

  /** 프레임마다 호출: 이동 벡터 계산 */
  poll(): void {
    if (!this.enabled) { this.moveX = this.moveY = 0; return; }
    const k = this.keys;
    let x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    x += this.joyX; y += this.joyY;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    this.moveX = x; this.moveY = y;
  }

  endFrame(): void {
    this.lookDX = this.lookDY = this.zoom = 0;
  }
}

function isTyping(t: EventTarget | null): boolean {
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
}
