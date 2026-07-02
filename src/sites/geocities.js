import { marquee, blink, underConstruction, hitCounter, webringBar } from './common.js';

const TITLES = [
  'ゆうこのおへや', 'たけしのホームページ☆', "MISAKI'S ROOM", '幽霊屋敷探検隊',
];

export function build(hasCode, code) {
  const title = TITLES[Math.floor(Math.random() * TITLES.length)];
  const visitorNumber = hasCode ? code : Math.floor(Math.random() * 900 + 100);
  return {
    title,
    theme: 'theme-geocities',
    bodyHTML: `
      ${marquee(`ようこそ！ ${title} へ！！ ★ Best viewed in Netscape Navigator 4.0 ★ 800x600 ★`)}
      <h1>${title}</h1>
      ${underConstruction()}
      <p>このホームページはリンクフリーです。無断転載禁止。</p>
      <p>${blink('相互リンク募集中！！')} メールはこちらまで → webmaster@geocities.co.jp</p>
      <hr/>
      <table border="4" cellpadding="6" bordercolor="#8f7c1e">
        <tr><td>自己紹介</td><td>16さい、へやにいます。ずっといます。だれもきません。</td></tr>
        <tr><td>すきなもの</td><td>インターネット、チャット、だれかとはなすこと</td></tr>
        <tr><td>きらいなもの</td><td>しずかなろうか</td></tr>
      </table>
      <hr/>
      <p>あなたは ${hitCounter(visitorNumber)} 人目のお客さんです！</p>
      <p class="retro-blink">日記を更新しました：「またおなじろうかにでた。もう４かいめ。」</p>
      ${webringBar('少女の部屋')}
    `,
  };
}
