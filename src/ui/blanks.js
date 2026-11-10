/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  📝 개념 정리 빈칸 — 화면 조각 (2026-11-10 사용자 지시).
 *  화면마다 blankKit('탭/화면') 하나를 만들고, 문장 id 로 빈칸 문장을 꺼내 그 자리에 끼워 넣는다.
 *    kit.line(id)   — 문장 하나 (빈칸은 글자 칸)
 *    kit.head(제목) — 제목 · 맞힌 수 · 💡 힌트 단추 한 줄
 *    kit.card(ids)  — 제목 줄 + 문장들을 담은 카드
 *  채점 — 글자를 치는 동안 정답이 되면 바로 초록 ✔, 칸을 벗어날 때(또는 Enter) 틀렸으면 빨강 ✘.
 *  힌트 — 1단계 글자 수(○○○), 2단계 첫소리(ㅈㅅㅇ)·첫 글자. 정답을 통째로 보여 주는 단추는 두지 않는다.
 *  화면이 다시 그려져도(fill) 기록은 S.blanks 에 있으므로 칸을 새로 만들면 그대로 되살아난다.
 */
import { h, toast } from './dom.js';
import { S, save } from '../lib/store.js';
import { parseLine, isRight, isCode, hintOf, blankKey, groupOf, lineById, blankStats } from '../lib/blanks.js';

/** 정답 글자 수에 맞춘 칸 너비(em) — 한글은 넓게, 영문·기호는 좁게 */
function widthOf(answers) {
  const w = (s) => [...s].reduce((n, c) => n + (/[가-힣ㄱ-ㅎ]/.test(c) ? 1.02 : 0.62), 0);
  return Math.min(16, Math.max(2.4, Math.max(...answers.slice(0, 1).map(w)) + 1.3));
}

export function blankKit(screen) {
  const group = groupOf(screen);
  const rec = S.blanks || (S.blanks = {});
  let level = 0; // 힌트 단계 (화면을 열 때마다 처음부터)
  const inputs = new Set(); // 지금 화면에 있는 칸들 — 힌트를 바꿀 때 한꺼번에 고친다
  const counters = new Set();
  let wasAll = group ? blankStats(S, screen).right === blankStats(S, screen).total : false;

  const paintCounters = () => {
    const st = blankStats(S, screen);
    for (const c of counters) {
      if (!c.isConnected) { counters.delete(c); continue; }
      c.textContent = `${st.right}/${st.total}`;
      c.classList.toggle('all', st.right === st.total);
    }
    const all = st.right === st.total;
    if (all && !wasAll) toast('📝 이 화면의 개념 정리를 마쳤어요!', 'good');
    wasAll = all;
  };

  function blankInput(lineId, part) {
    const key = blankKey(lineId, part.k);
    const mark = h('span', { class: 'bk-m' });
    const input = h('input', {
      class: 'bk-in', type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': '빈칸',
      style: { width: `${widthOf(part.answers)}em` },
    });
    input.value = rec[key] || '';
    const wrap = h('span', { class: 'bk' + (isCode(part.v) ? ' code' : '') }, input, mark);
    const state = (wrong) => {
      const ok = isRight(part.answers, input.value);
      wrap.classList.toggle('right', ok);
      wrap.classList.toggle('wrong', !ok && wrong && input.value.trim() !== '');
      mark.textContent = ok ? '✔' : wrap.classList.contains('wrong') ? '✘' : '';
      input.title = ok ? '맞았어요' : wrap.classList.contains('wrong') ? '다시 생각해 봐요 — 💡 힌트를 눌러 보세요' : '';
    };
    input.addEventListener('input', () => {
      rec[key] = input.value; save();
      wrap.classList.remove('wrong');
      state(false); paintCounters();
    });
    // 칸을 벗어나거나 Enter — 틀렸으면 그때 빨갛게 (치는 도중에는 혼내지 않는다)
    input.addEventListener('change', () => state(true));
    input.addEventListener('blur', () => state(true));
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      state(true);
      // 다음 빈칸으로
      const all = [...inputs].filter((x) => x.isConnected);
      const next = all[all.indexOf(input) + 1];
      if (next) next.focus(); else input.blur();
    });
    input._answer = part.v;
    input.placeholder = hintOf(part.v, level);
    inputs.add(input);
    state(!!rec[key]);
    return wrap;
  }

  /** 문장 하나 — 보통 글자 · 코드 · 빈칸 */
  function line(id) {
    const l = lineById(id);
    if (!l) return h('span', {}, `(빈칸 문장 ${id} 없음)`);
    return h('span', { class: 'bk-line' }, parseLine(l.text).map((p) => (
      p.t === 'text' ? p.v : p.t === 'code' ? h('code', {}, p.v) : blankInput(id, p))));
  }
  /** 맞힌 수 */
  function counter() {
    const c = h('span', { class: 'bk-count', title: '맞힌 빈칸 / 모든 빈칸' });
    counters.add(c);
    const st = blankStats(S, screen);
    c.textContent = `${st.right}/${st.total}`;
    c.classList.toggle('all', st.right === st.total);
    return c;
  }
  /** 💡 힌트 단추 — 이 화면의 모든 빈칸에 한꺼번에 */
  function hintBtn() {
    const b = h('button', { class: 'btn small bk-hint', title: '1단계 글자 수 · 2단계 첫소리', onClick: () => {
      level = Math.min(2, level + 1);
      for (const x of inputs) { if (!x.isConnected) { inputs.delete(x); continue; } x.placeholder = hintOf(x._answer, level); }
      paint();
    } });
    const paint = () => { b.textContent = `💡 힌트 ${Math.min(level + 1, 2)}/2`; b.disabled = level >= 2; };
    paint();
    return b;
  }
  /** 제목 줄 */
  function head(title = group ? group.title : '📝 정리') {
    return h('div', { class: 'bk-head' }, h('b', {}, title), h('span', { class: 'grow' }), counter(), hintBtn());
  }
  /** 제목 줄 + 문장들 — 문장에 code 가 있으면(import 문) 문장 위에 함께 보여 준다 */
  function card(ids, { title, extraClass = '' } = {}) {
    const list = ids || (group ? group.lines.map((l) => l.id) : []);
    return h('div', { class: `card bk-card ${extraClass}` }, head(title), list.map((id) => {
      const l = lineById(id);
      return h('div', { class: 'bk-row' }, l && l.code ? h('span', { class: 'bk-code' }, l.code) : null, line(id));
    }));
  }
  return { line, head, card, counter, hintBtn, group, lineOf: lineById };
}
