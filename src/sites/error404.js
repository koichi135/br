import { codeReveal } from './common.js';

const ASCII_SKULL = ` .ooo.
(  x x )
 \\  ~  /
  '---'`;

export function build(hasCode, code) {
  return {
    title: '404 Not Found',
    theme: 'theme-404',
    bodyHTML: `
      <div class="err-bar">http://127.0.0.1/room/index.html にアクセスできません</div>
      <h1 class="err-code">404 NOT FOUND</h1>
      <pre class="ascii-skull">${ASCII_SKULL}</pre>
      <p>お探しのページは移動または削除された可能性があります。</p>
      <p class="err-flicker">このサーバーには誰もいません。あなた以外は。</p>
      ${hasCode ? `<p class="err-meta">サーバー管理者に連絡する場合はこのエラーコードをお伝えください: ${codeReveal(code)}</p>` : ''}
      <!-- あなたはまだここにいる -->
      <p class="err-small">Apache/1.3.9 Server at localhost Port 80</p>
    `,
  };
}
