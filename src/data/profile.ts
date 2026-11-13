// 닉네임 생성·검증과 로컬 프로필 저장 (로컬 데모용, 서버 연동 전)
import { PALETTE_KEYS, type PaletteKey } from '../character/PlayerCharacter';

export interface Profile {
  /** 익명 로컬 ID — 닉네임만으로 사용자를 식별하지 않기 위한 값 (추후 Supabase 익명 인증 ID로 교체) */
  id: string;
  nickname: string;
  color: PaletteKey;
}

const KEY = 'wsv.profile.v1';
export const NICK_MIN = 2;
export const NICK_MAX = 10;

const ADJ = ['졸린', '따끈한', '춤추는', '포근한', '말랑한', '반짝이는', '수줍은', '씩씩한', '느긋한', '배고픈', '동글동글', '보송한', '신난', '꾸벅꾸벅', '소복한'];
const NOUN = ['눈송이', '군고구마', '눈사람', '목도리', '붕어빵', '핫초코', '털장갑', '귤', '루돌프', '호빵', '솔방울', '별사탕', '고드름', '군밤', '털모자'];

const BANNED = ['시발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '지랄', '좆', '새끼', '개새', '섹스', '꺼져', '미친놈', '미친년', 'fuck', 'shit', 'bitch', 'sex', 'porn', '운영자', '관리자', 'admin'];

export function randomNickname(): string {
  for (let i = 0; i < 20; i++) {
    const n = `${pick(ADJ)} ${pick(NOUN)}`;
    if ([...n].length <= NICK_MAX) return n;
  }
  return '졸린 눈송이';
}

export function cleanNickname(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** 문제가 있으면 안내 문구를, 괜찮으면 null을 돌려준다 */
export function validateNickname(raw: string): string | null {
  const n = cleanNickname(raw);
  const len = [...n].length;
  if (len < NICK_MIN) return `닉네임은 ${NICK_MIN}글자 이상이어야 해요.`;
  if (len > NICK_MAX) return `닉네임은 ${NICK_MAX}글자까지 쓸 수 있어요.`;
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 _-]+$/.test(n)) return '한글, 영문, 숫자만 쓸 수 있어요.';
  const flat = n.toLowerCase().replace(/[\s_-]/g, '');
  if (BANNED.some((w) => flat.includes(w))) return '사용할 수 없는 단어가 들어 있어요.';
  return null;
}

export function loadProfile(): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Profile | null;
    if (!p || typeof p.nickname !== 'string' || validateNickname(p.nickname)) return null;
    if (!PALETTE_KEYS.includes(p.color)) p.color = 'red';
    return p;
  } catch {
    return null;
  }
}

export function saveProfile(nickname: string, color: PaletteKey, prev: Profile | null): Profile {
  const p: Profile = { id: prev?.id ?? newId(), nickname: cleanNickname(nickname), color };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* 저장 불가 환경에서는 세션 동안만 유지 */ }
  return p;
}

function newId(): string {
  return crypto.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function pick<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}
