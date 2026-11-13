// 게임 HUD: 로고·닉네임, 구역 표시, 이름표, 상황별 버튼, 말풍선 안내
import { isTouch } from '../core/quality';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export class Hud {
  readonly joystick = $('joystick');
  onContext: () => void = () => {};
  onMenu: () => void = () => {};

  private nametag = $('nametag');
  private nick = $('hud-nick');
  private zone = $('zone');
  private ctxBtn = $<HTMLButtonElement>('context');
  private ctxLabel = $('context-label');
  private toast = $('toast');
  private help = $('help');
  private zoneTimer = 0;
  private toastTimer = 0;

  constructor() {
    document.body.classList.toggle('touch', isTouch());
    this.ctxBtn.addEventListener('click', () => this.onContext());
    $('menu').addEventListener('click', () => this.onMenu());
  }

  setNickname(name: string): void {
    this.nametag.textContent = name;
    this.nick.textContent = name;
  }

  setPlaying(on: boolean): void {
    document.body.classList.toggle('playing', on);
    if (on) {
      this.help.classList.add('show');
      window.setTimeout(() => this.help.classList.remove('show'), 9000);
    }
  }

  placeNametag(x: number, y: number, visible: boolean): void {
    this.nametag.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    this.nametag.style.opacity = visible ? '1' : '0';
  }

  setZone(name: string): void {
    this.zone.textContent = name;
    this.zone.classList.add('show');
    window.clearTimeout(this.zoneTimer);
    this.zoneTimer = window.setTimeout(() => this.zone.classList.remove('show'), 2600);
  }

  setContext(label: string | null): void {
    this.ctxBtn.classList.toggle('show', !!label);
    if (label) this.ctxLabel.textContent = label;
  }

  say(text: string): void {
    this.toast.textContent = text;
    this.toast.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove('show'), 4200);
  }
}
