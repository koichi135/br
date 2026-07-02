import { codeReveal } from './common.js';

const USERS = ['heavy-user92', 'るる', 'sysop', 'ぽてち', 'anon_44', 'かえで', 'guest'];

function line(user, text, sys = false) {
  return `<div class="chat-line ${sys ? 'chat-sys' : ''}"><span class="chat-user">${sys ? '***' : '<' + user + '>'}</span> ${text}</div>`;
}

export function build(hasCode, code) {
  const lines = [];
  lines.push(line('', 'ROOM: #backroom_lv0 -- 現在の接続数: 1', true));
  lines.push(line(USERS[0], 'だれかいますか'));
  lines.push(line(USERS[1], 'います　さっきからずっといます'));
  lines.push(line(USERS[0], '出口の場所しってる人いますか'));
  lines.push(line(USERS[2], '端末を4つ集めればログオフ端末が使えるらしい'));
  if (hasCode) {
    lines.push(line(USERS[2], `キーはこれ → ${codeReveal(code)} 忘れる前にメモして`));
  }
  lines.push(line(USERS[1], 'さっきから同じ蛍光灯の音がする'));
  lines.push(line(USERS[3], '...'));
  lines.push(line(USERS[3], '...'));
  lines.push(line('', 'heavy-user92 has quit (Ping timeout: 240 seconds)', true));
  lines.push(line(USERS[1], 'いま何か通った？'));
  lines.push(line(USERS[3], '...'));
  lines.push(line('', 'るる has quit (Connection reset by peer)', true));
  lines.push(line(USERS[3], 'もしもし'));
  lines.push(line(USERS[3], 'もしもし'));
  lines.push(line(USERS[3], 'だれか'));
  lines.push(line('', 'guest has quit (Connection reset by peer)', true));

  return {
    title: '#backroom_lv0 - IRCチャット',
    theme: 'theme-chat',
    bodyHTML: `<div class="chat-log">${lines.join('')}</div><div class="chat-input">[入力できません -- 接続は読み取り専用です]</div>`,
  };
}
