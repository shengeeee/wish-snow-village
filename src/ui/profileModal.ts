// 첫 입장 닉네임 · 패딩 색 설정 팝업 (메뉴에서 다시 열어 변경 가능)
import { PALETTES, PALETTE_KEYS, type PaletteKey } from '../character/PlayerCharacter';
import { NICK_MAX, randomNickname, validateNickname } from '../data/profile';

const COLOR_NAMES: Record<PaletteKey, string> = { red: '레드', green: '그린', cream: '크림', sky: '스카이', mustard: '머스타드' };

export interface ProfileModalOpts {
  nickname: string;
  color: PaletteKey;
  first: boolean;
  onPreview: (nickname: string, color: PaletteKey) => void;
  onDone: (nickname: string, color: PaletteKey) => void;
}

export function openProfileModal(o: ProfileModalOpts): void {
  const modal = document.getElementById('profile')!;
  const input = document.getElementById('nick-input') as HTMLInputElement;
  const count = document.getElementById('nick-count')!;
  const error = document.getElementById('nick-error')!;
  const swatches = document.getElementById('swatches')!;
  const done = document.getElementById('profile-done') as HTMLButtonElement;
  const reroll = document.getElementById('nick-reroll')!;
  document.getElementById('profile-title')!.textContent = o.first ? '어서 와요, 눈 내리는 마을에!' : '프로필 바꾸기';
  done.textContent = o.first ? '마을로 들어가기' : '바꾸기 완료';

  let color = o.color;
  input.value = o.nickname;
  input.maxLength = NICK_MAX + 4;

  const refresh = () => {
    const err = validateNickname(input.value);
    count.textContent = `${[...input.value.trim()].length}/${NICK_MAX}`;
    error.textContent = err ?? '';
    done.disabled = !!err;
    o.onPreview(input.value.trim() || '…', color);
  };

  swatches.replaceChildren(...PALETTE_KEYS.map((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.background = '#' + PALETTES[key].jacket.toString(16).padStart(6, '0');
    b.title = COLOR_NAMES[key];
    b.setAttribute('aria-label', `${COLOR_NAMES[key]} 패딩`);
    b.classList.toggle('on', key === color);
    b.onclick = () => {
      color = key;
      swatches.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === b));
      refresh();
    };
    return b;
  }));

  input.oninput = refresh;
  reroll.onclick = () => { input.value = randomNickname(); refresh(); };
  const finish = () => {
    if (validateNickname(input.value)) return;
    modal.classList.remove('show');
    input.blur();
    o.onDone(input.value, color);
  };
  done.onclick = finish;
  input.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) finish(); };

  modal.classList.add('show');
  refresh();
}
