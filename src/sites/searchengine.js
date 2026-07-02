import { codeReveal } from './common.js';

const QUERIES = ['バックルーム 出口 方法', 'でていきかた', 'ここ どこ', '助けて 部屋 黄色い壁'];

export function build(hasCode, code) {
  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const results = [
    { t: '結果が見つかりませんでした もう一度おさがしください', u: 'search.example.co.jp/404', d: '...' },
    { t: 'あなたを探しています - 個人ホームページ', u: 'geocities.co.jp/looking_for_you/', d: 'このページはあなたのことを書いています。' },
    hasCode
      ? { t: `裏口 - ROOM #3391 exit key`, u: `backroom-exit.geocities.co.jp/room-${code}/index.html`, d: `アクセスキー: ${codeReveal(code)} これでログオフ端末が使えます。` }
      : { t: 'このページは存在しません', u: 'deadlink.example.net/~user/', d: '404 Not Found が繰り返し表示されます。' },
    { t: '検索結果: 約 1 件 (0.00 秒) 前と同じです', u: 'search.example.co.jp/again', d: '同じ結果しか出てきません。' },
  ].sort(() => Math.random() - 0.5);

  return {
    title: '検索エンジン - Yellow!サーチ',
    theme: 'theme-search',
    bodyHTML: `
      <div class="search-bar">検索: <input class="fake-input" value="${query}" readonly/> <button class="fake-btn" disabled>検索する</button></div>
      <div class="search-results">
        ${results.map((r) => `<div class="search-result"><a class="search-title">${r.t}</a><div class="search-url">${r.u}</div><div class="search-desc">${r.d}</div></div>`).join('')}
      </div>
      <div class="search-footer">おなじキーワードでもういちど検索する &nbsp;|&nbsp; もどる (リンク切れ)</div>
    `,
  };
}
