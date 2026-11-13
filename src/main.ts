import './ui/style.css';
import { Game } from './core/Game';
import { Hud } from './ui/hud';
import { openProfileModal } from './ui/profileModal';
import { loadProfile, randomNickname, saveProfile, type Profile } from './data/profile';

async function boot(): Promise<void> {
  // 간판 글씨에 쓰는 폰트를 먼저 불러온다 (실패해도 기본 폰트로 진행)
  await Promise.race([
    document.fonts.load('64px Jua', '눈사람').catch(() => undefined),
    new Promise((r) => setTimeout(r, 1800)),
  ]);

  const hud = new Hud();
  const game = new Game(document.getElementById('stage') as HTMLCanvasElement, hud);
  let profile: Profile | null = loadProfile();

  const edit = (first: boolean) => {
    game.setIntro(true);
    openProfileModal({
      nickname: profile?.nickname ?? randomNickname(),
      color: profile?.color ?? 'red',
      first,
      onPreview: (n, c) => game.previewProfile(n, c),
      onDone: (n, c) => {
        profile = saveProfile(n, c, profile);
        game.previewProfile(profile.nickname, profile.color);
        game.setIntro(false);
        if (first) hud.say(`${profile.nickname}님, 눈 내리는 마을에 온 걸 환영해요!`);
      },
    });
  };
  hud.onMenu = () => edit(false);

  if (profile) {
    game.previewProfile(profile.nickname, profile.color);
    game.setIntro(false);
    hud.say(`${profile.nickname}님, 다시 만나서 반가워요!`);
  } else {
    edit(true);
  }
  document.getElementById('loading')?.remove();
}

void boot();
