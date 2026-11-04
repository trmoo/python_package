/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  앱의 틀 — 1280×720 무대 · 위쪽 탭 · 알약(화면) · 아래쪽 이전/다음.
 *  ★ 화면은 언제나 1280×720 「무대」 하나다. 창 크기에 맞춰 통째로 키우거나 줄이므로
 *    교실 TV·노트북·태블릿 어디서나 스크롤이 생기지 않는다.
 *  주소 해시로 화면을 바로 열 수 있다 — 예) #build/m2
 */
import { h, fill, beginScreen, onWindow } from './dom.js';

export const W = 1280, H = 720;

/** 무대를 만들고 창 크기에 맞춰 늘이고 줄인다 */
export function createStage() {
  const stage = h('div', { class: 'stage' });
  const holder = h('div', { class: 'stage-holder' }, stage);
  const fit = () => {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.transform = `scale(${s})`;
    holder.style.width = `${W * s}px`;
    holder.style.height = `${H * s}px`;
  };
  window.addEventListener('resize', fit);
  fit();
  return { holder, stage };
}

/**
 * 탭과 화면을 세운다.
 *   tabs:    [{ id, label, color }]
 *   screens: [{ id, tab, title, short, render(body, api), done?() }]
 *   tools:   위쪽 오른쪽에 붙일 단추
 */
export function createShell(stage, { tabs, screens, tools, logo }) {
  const top = h('header', { class: 'top' });
  const sub = h('nav', { class: 'sub', 'aria-label': '화면' });
  const body = h('main', { class: 'body' });
  const foot = h('footer', { class: 'foot' });
  fill(stage, top, sub, body, foot);
  let cur = 0;

  const api = {
    go: (id) => { const k = screens.findIndex((s) => s.id === id || `${s.tab}/${s.id}` === id); if (k >= 0) show(k); },
    next: () => show(cur + 1),
    refreshNav: () => paintNav(),
    get current() { return screens[cur]; },
  };

  function paintNav() {
    const s = screens[cur];
    const tab = tabs.find((t) => t.id === s.tab);
    fill(top,
      h('div', { class: 'logo' }, logo),
      h('nav', { class: 'tabs', 'aria-label': '단원' }, tabs.map((t, i) => h('button', {
        class: 'tab' + (t.id === s.tab ? ' on' : ''), style: { '--c': t.color },
        onClick: () => show(screens.findIndex((x) => x.tab === t.id)),
      }, h('span', { class: 'n' }, `${i + 1}`), t.label))),
      tools ? tools() : null);
    fill(sub, screens.filter((x) => x.tab === s.tab).map((x, i) => {
      const k = screens.indexOf(x);
      const done = x.done && x.done();
      return h('button', { class: 'pill' + (k === cur ? ' on' : ''), style: { '--c': tab.color }, onClick: () => show(k) },
        `${i + 1}. ${x.short || x.title}`, done ? h('span', { class: 'done' }, ' ✔') : null);
    }));
    fill(foot,
      h('button', { class: 'nav prev', disabled: cur === 0, onClick: () => show(cur - 1) }, '◀ 이전'),
      h('div', { class: 'where' }, `${tabs.indexOf(tab) + 1}. ${tab.label} — ${s.title}`),
      h('span', { class: 'copy' }, '© 2026 티쳐무 · 모든 권리 보유'),
      h('button', { class: 'nav next', disabled: cur === screens.length - 1, onClick: () => show(cur + 1) }, '다음 ▶'));
  }

  function show(k) {
    if (k < 0 || k >= screens.length) return;
    cur = k;
    beginScreen();
    const s = screens[cur];
    const hash = `#${s.tab}/${s.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    paintNav();
    fill(body);
    s.render(body, api);
    // 화살표로 넘기기 — 글을 치는 칸·편집기 안에서는 커서를 움직여야 하므로 넘기지 않는다
    onWindow('keydown', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (document.querySelector('.overlay')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); show(cur + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(cur - 1); }
    });
  }

  const fromHash = () => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    const k = screens.findIndex((s) => `${s.tab}/${s.id}` === id || s.id === id);
    return k >= 0 ? k : 0;
  };
  window.addEventListener('hashchange', () => { const k = fromHash(); if (k !== cur) show(k); });
  show(fromHash());
  return api;
}
