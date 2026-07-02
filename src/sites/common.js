// Shared building blocks for the dead websites you find on each terminal.
// Everything here is plain HTML strings -- deliberately ugly, deliberately
// early-internet, in the way only a Geocities/Angelfire page from 1999 can be.

export function marquee(text) {
  return `<marquee class="blink-marquee" scrollamount="4">${text}</marquee>`;
}

export function blink(text) {
  return `<span class="retro-blink">${text}</span>`;
}

export function underConstruction() {
  return `<div class="under-construction">工事中 UNDER CONSTRUCTION</div>`;
}

export function hitCounter(number) {
  const digits = String(number).padStart(7, '0').split('');
  return `<div class="hitcounter">${digits.map((d) => `<span>${d}</span>`).join('')}</div>`;
}

export function codeReveal(code) {
  return `<span class="code-reveal">${code}</span>`;
}

const GUESTBOOK_NAMES = ['yuki_1998', '名無しさん', 'darkangel_xx', 'sysop', 'ろむせん', 'かにゃ', 'guest0007', 'ANONYMOUS'];
const GUESTBOOK_NORMAL = [
  'はじめまして！いいホームページですね(^-^)',
  'リンクはらせてもらいました。また来ます。',
  '素材お借りします！ありがとうございます。',
  '相互リンクお願いできますか？メールください。',
  'このサイト好きです、また来ます～',
  'BBSに書き込みできませんでした…直ってますか？',
  'カウンター1000突破おめでとうございます！',
];
const GUESTBOOK_EERIE = [
  'ここ、前来た時と部屋の数が違う気がします',
  'だれか気づいてください',
  '文字が、かってに動いた',
  'うしろを見ないでください',
  '出口のリンクをクリックしても同じページに戻ります',
  '管理人さん、まだそこにいますか',
  'たす',
];

export function guestbook(hasCode, code) {
  const pool = [...GUESTBOOK_NORMAL].sort(() => Math.random() - 0.5).slice(0, 4);
  const eerie = [...GUESTBOOK_EERIE].sort(() => Math.random() - 0.5).slice(0, 3);
  const entries = [...pool, ...eerie];
  if (hasCode) {
    const idx = Math.min(entries.length - 1, 3 + Math.floor(Math.random() * 2));
    entries.splice(idx, 0, `合言葉、なくさないでね… ${codeReveal(code)} …だれかにおしえて`);
  }
  return entries
    .map((text, i) => {
      const name = GUESTBOOK_NAMES[i % GUESTBOOK_NAMES.length];
      const date = i < pool.length ? `2000/0${1 + (i % 9)}/1${i}` : '45月93日';
      return `<div class="guestbook-entry"><b>${name}</b> <span class="gb-date">[${date}]</span><p>${text}</p></div>`;
    })
    .join('');
}

export function webringBar(title) {
  return `<div class="webring-bar">&laquo;&laquo; 前のサイト | <b>${title}</b> WEBRING | 次のサイト &raquo;&raquo;<br/>ランダム | サイト一覧 | 登録する</div>`;
}
