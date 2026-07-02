// The exit terminal -- a barebones dial-up "log off" utility. Whether it
// works depends on how many access codes the player has already found.

export function buildLocked(have, need) {
  return {
    title: 'ログオフ端末',
    theme: 'theme-logoff',
    bodyHTML: `
      <h1>接続を終了する</h1>
      <p>このセッションを終了するには、各部屋の端末からアクセスコードを集めてください。</p>
      <div class="logoff-status">コード: ${have} / ${need}</div>
      <p class="err-flicker">コードが不足しています。回線を切断できません。</p>
      <button class="fake-btn" disabled>ログオフする</button>
    `,
  };
}

export function buildReady() {
  return {
    title: 'ログオフ端末',
    theme: 'theme-logoff',
    bodyHTML: `
      <h1>接続を終了する</h1>
      <p>すべてのアクセスコードを確認しました。</p>
      <button id="logoff-btn" class="fake-btn logoff-ready">ログオフする</button>
      <p class="err-small">この接続を切断すると元のページには戻れません。</p>
    `,
  };
}
