import { webringBar, blink, codeReveal } from './common.js';

const MEMBERS = [
  '孤独の部屋', 'でていけないひとたちへ', 'だれもいないチャットルーム', '黄色い壁紙コレクション', 'まだ起きてる人へ',
];

export function build(hasCode, code) {
  return {
    title: '孤独 WEBRING',
    theme: 'theme-webring',
    bodyHTML: `
      ${webringBar('孤独')}
      <h2>このウェブリングについて</h2>
      <p>おなじ場所にいる人たちのホームページをつなげています。${blink('抜けられたらリンクを外してください。')}</p>
      <ul class="webring-list">
        ${MEMBERS.map((m) => `<li>&gt; <a class="webring-link">${m}</a> ${Math.random() < 0.3 ? '(リンク切れ)' : ''}</li>`).join('')}
      </ul>
      <hr/>
      ${hasCode ? `<p>会員番号をお持ちの方はログオフ端末に入力してください: ${codeReveal(code)}</p>` : `<p>このサイトはウェブリングのメンバーではありません。</p>`}
      <p class="webring-footer">加盟サイト数: 1 &nbsp;(変わりません)</p>
    `,
  };
}
