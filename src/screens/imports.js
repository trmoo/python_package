/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ② 불러오기 — import 세 가지 꼴 · 패키지 속 모듈 부르기 · 오류 고치기 · 확인 문제
 */
import { h, fill, toast, modal } from '../ui/dom.js';
import { codeBlock, quickRun, head, treeBlock } from './common.js';
import { createIDE } from '../ui/ide.js';
import { slot, save } from '../lib/store.js';
import { FORMS, PKGFORMS, FIXES, QUIZ } from '../data/imports.js';
import { blankKit } from '../ui/blanks.js';

/* ── 예측 표 (import 꼴 × 부르는 방법) ──
 * 학생이 칸마다 ⭕ / ❌ 를 먼저 예측하고, [실행해서 확인] 을 누르면 칸마다 진짜로 실행해 답을 맞춘다. */
function predictGrid(body, api, { key, data, title, lead, side }) {
  const S = slot(key, () => ({ guess: {}, shown: false }));
  // 📝 정리 빈칸 — 「실행해서 확인」 한 다음에만 연다. 먼저 열면 빈칸 채점이 예측의 답을 알려 주기 때문이다
  // (예전의 「정리 (확인한 다음 열어 보세요)」 펼침 상자를 이 카드가 대신한다)
  const kit = blankKit(`import/${key}`);
  const note = () => (S.shown ? kit.card()
    : h('div', { class: 'note small', html: '📝 <b>「실행해서 확인」</b> 을 하면 여기에 <b>정리 빈칸</b>이 열려요.' }));
  let pick = null;
  const runs = {};
  data.rows.forEach((r, i) => data.cols.forEach((c, j) => {
    const main = `${r}\n${c}\n`;
    runs[`${i}-${j}`] = { main, ...quickRun({ ...data.files, 'main.py': main }) };
  }));
  const table = h('table', { class: 'grid-tbl' });
  const detail = h('div', { class: 'col', style: { gap: '8px' } });
  const score = h('div', { class: 'row' });

  function paint() {
    let right = 0;
    // 칸 너비를 고르게 (2026-11-10 사용자 지시 「칸 사이즈가 들쭉날쭉」) — 왼쪽 import 칸만 정해 두고
    // 나머지는 똑같이 나눈다(table-layout:fixed). 긴 머리글은 점(.) 뒤에서 줄을 바꿀 수 있게 <wbr> 을 넣는다.
    const wrapDots = (t) => t.split('.').flatMap((part, i) => (i ? [h('wbr'), '.' + part] : [part]));
    fill(table,
      h('colgroup', {}, h('col', { style: { width: '27%' } }), data.cols.map(() => h('col'))),
      h('tr', {}, h('th', { class: 'corner' }, 'import ↓ / 부르기 →'), data.cols.map((c) => h('th', {}, wrapDots(c)))),
      data.rows.map((r, i) => h('tr', {}, h('th', { class: 'rowh' }, r), data.cols.map((c, j) => {
        const k = `${i}-${j}`, g = S.guess[k], run = runs[k];
        const truth = run.ok ? 'o' : 'x';
        if (S.shown && g === truth) right++;
        const cls = 'cell' + (S.shown && g ? (g === truth ? ' right' : ' wrong') : '') + (pick === k ? ' pick' : '');
        return h('td', {}, h('button', { class: cls, title: '눌러서 ⭕ / ❌ 바꾸기', onClick: () => {
          pick = k;
          if (!S.shown) { S.guess[k] = g === 'o' ? 'x' : g === 'x' ? undefined : 'o'; if (!S.guess[k]) delete S.guess[k]; save(); }
          paint();
        } }, h('span', {}, g === 'o' ? '⭕' : g === 'x' ? '❌' : '?'),
        S.shown ? h('span', { class: 'res' }, run.ok ? `→ ${run.text}` : `→ ${run.type}`) : null));
      }))));
    fill(score,
      h('button', { class: 'btn primary', onClick: () => {
        const total = data.rows.length * data.cols.length;
        if (Object.keys(S.guess).length < total) { toast(`${total - Object.keys(S.guess).length}칸이 아직 「?」 예요. 먼저 예측해 보세요`); return; }
        S.shown = true; save(); paint(); api.refreshNav();
      } }, '▶ 실행해서 확인'),
      h('button', { class: 'btn', onClick: () => { S.guess = {}; S.shown = false; pick = null; save(); paint(); } }, '↺ 다시 예측'),
      S.shown ? h('b', {}, `${data.rows.length * data.cols.length}칸 가운데 ${right}칸 예측 성공`) : h('span', { class: 'small muted' }, '칸을 눌러 ⭕(된다) / ❌(오류) 를 먼저 예측하세요.'));
    if (pick && S.shown) {
      const run = runs[pick];
      fill(detail, h('b', {}, '이 칸의 main.py 를 실행하면'), codeBlock(run.main.trim(), true),
        h('pre', { class: 'code sm', style: { background: '#181818', color: run.ok ? '#e6e6e6' : '#f48771', whiteSpace: 'pre-wrap' } }, run.ok ? run.r.stdout : run.r.stderr.split('\n').slice(-1)[0]),
        note());
    } else fill(detail, side(), note());
  }
  fill(body, h('div', { class: 'cols' },
    h('div', { class: 'col grow' }, head(title, lead), table, score),
    h('div', { class: 'col', style: { width: '370px', flex: 'none' } }, detail)));
  paint();
}

export function renderForms(body, api) {
  predictGrid(body, api, {
    key: 'forms', data: FORMS, title: 'import 세 가지 꼴',
    lead: 'calc.py 를 불러오는 줄(왼쪽)과 add 를 부르는 줄(위)을 짝지어 실행하면 될까요? 칸마다 예측해 보세요.',
    side: () => [h('b', {}, '📄 calc.py'), codeBlock(FORMS.files['calc.py'].trim(), true),
      h('div', { class: 'note small', html: '<b>규칙 하나</b> — import 문이 <b>만들어 준 이름</b>만 쓸 수 있어요. 어떤 이름이 생기는지 생각해 보세요.' })],
  });
}

export function renderPkgForms(body, api) {
  predictGrid(body, api, {
    key: 'pkgforms', data: PKGFORMS, title: '패키지 속 모듈 부르기',
    lead: '점(.)은 「폴더 안으로 들어간다」 는 뜻이에요. mypackage 폴더 안 module1.py 의 hello( ) 를 불러 봐요.',
    side: () => [treeBlock([['d', 'mypackage/'], ['i', '├── __init__.py', '빈 파일'], ['f', '├── module1.py', 'def hello()'], ['f', '└── module2.py', 'def bye()']]),
      h('div', { class: 'note small', html: '씨마스 교과서 209쪽 Tip — 다른 모듈에서 패키지 안의 모듈을 쓰려면 <code>패키지명.모듈명</code> 꼴로 import 한다.' }),
      h('div', { class: 'note warn small', html: '마지막 줄 <code>import mypackage</code> 는 함정이에요. 폴더(패키지)만 불러오면 그 안의 파일도 따라올까요? <span class="tiny muted">(__init__.py 가 불러 주면 따라와요 — 미션 4)</span>' })],
  });
}

/* ── 오류 고치기 ── */
export function fixPassed(fx, r, p) {
  if (!r || !r.ok || r.entry !== 'main.py') return false;
  if (r.stdout.trim() !== fx.goal) return false;
  if (fx.mustRoot && p.files[fx.mustRoot] === undefined) return false;
  return r.calls.some((c) => c.name === fx.need.name && (!fx.need.file || c.file === fx.need.file));
}
export function renderFix(body, api) {
  const S = slot('fix', () => ({ cur: FIXES[0].id, done: {}, proj: {}, hint: {} }));
  const listEl = h('div', { class: 'col', style: { gap: '4px' } });
  const info = h('div', { class: 'col', style: { gap: '7px' } });
  const ideHost = h('div', { style: { flex: 1, minWidth: 0, height: '100%' } });
  let ide = null;
  const fx = () => FIXES.find((f) => f.id === S.cur);

  function paintList() {
    fill(listEl, FIXES.map((f, i) => h('button', { class: 'btn small' + (f.id === S.cur ? ' primary' : ''), style: { textAlign: 'left', display: 'flex', gap: '6px', fontSize: '14px', padding: '4px 10px' }, onClick: () => { S.cur = f.id; save(); mount(); } },
      h('span', {}, `${i + 1}. ${f.icon} ${f.title}`), h('span', { class: 'grow' }), S.done[f.id] ? '✅' : '')));
  }
  function paintInfo() {
    const f = fx();
    const n = S.hint[f.id] || 0;
    fill(info,
      h('div', { class: 'card col', style: { gap: '6px', padding: '9px 12px' } },
        h('b', {}, `${f.icon} ${f.title}`), h('div', { class: 'small' }, f.story),
        h('div', { class: 'small' }, '🎯 main.py 를 실행하면 이렇게 나와야 해요'),
        h('pre', { class: 'code sm', style: { background: '#181818' } }, f.goal),
        S.done[f.id] ? h('div', { class: 'bigok' }, '✅ 고쳤어요!') : h('div', { class: 'tiny muted' }, '고친 다음 main.py 를 열고 ▶ — 맞으면 저절로 ✅')),
      h('div', { class: 'hintbox' },
        h('div', { class: 'row' }, h('button', { class: 'btn small', disabled: n >= f.hints.length, onClick: () => { S.hint[f.id] = n + 1; save(); paintInfo(); } }, `💡 힌트 ${Math.min(n + 1, f.hints.length)}/${f.hints.length}`),
          h('button', { class: 'btn small ghost', onClick: async () => { if (await modal('처음 상태로', '고친 것을 지우고 오류가 난 처음 모습으로 되돌릴까요?', { ok: '되돌리기', cancel: '그만두기' })) { delete S.proj[f.id]; save(); mount(); } } }, '↺ 처음 상태로')),
        f.hints.slice(0, n).map((t, i) => h('div', { class: 'h' }, `${i + 1}. ${t}`))));
  }
  function mount() {
    const f = fx();
    paintList(); paintInfo();
    ide = createIDE(ideHost, {
      project: S.proj[f.id] || f.project, active: f.active || 'main.py',
      onChange: (p) => { S.proj[f.id] = p; save(); },
      onRun: (r, p) => {
        if (fixPassed(f, r, p) && !S.done[f.id]) { S.done[f.id] = true; save(); toast('✅ 고쳤어요!', 'good'); paintList(); paintInfo(); api.refreshNav(); }
      },
    });
    // 아직 못 고친 문제는 열 때마다 한 번 실행해서 지금 상태(오류)를 보여 준다
    if (!S.done[f.id]) ide.run(f.active || 'main.py');
  }
  fill(body, h('div', { class: 'cols' },
    h('div', { class: 'col', style: { width: '330px', flex: 'none', gap: '7px' } }, h('h2', {}, '오류 고치기 — 자주 겪는 여섯 가지'), listEl, info),
    ideHost));
  mount();
}

/* ── 확인 문제 ── */
export function renderQuiz(body, api) {
  const S = slot('quiz', () => ({ ans: {}, cur: 0 }));
  const wrap = h('div', { class: 'cols' });
  function paint() {
    const i = S.cur, q = QUIZ[i], a = S.ans[i];
    const got = Object.keys(S.ans).filter((k) => S.ans[k] === QUIZ[k].ans).length;
    const filesBox = q.files ? h('div', { class: 'row', style: { alignItems: 'flex-start' } }, Object.entries(q.files).map(([f, src]) => h('div', { class: 'col', style: { gap: '3px' } }, h('b', { class: 'small' }, `📄 ${f}`), codeBlock(src, true)))) : null;
    fill(wrap,
      h('div', { class: 'col grow' },
        h('div', { class: 'row' }, h('h2', { style: { margin: 0 } }, '확인 문제'),
          h('div', { class: 'qnav' }, QUIZ.map((qq, k) => h('button', { class: 'qdot' + (k === i ? ' on' : '') + (S.ans[k] !== undefined ? (S.ans[k] === qq.ans ? ' right' : ' wrong') : ''), onClick: () => { S.cur = k; save(); paint(); } }, k + 1))),
          h('span', { class: 'small muted' }, `고르면 바로 알려 줘요 · 지금 ${got}/${QUIZ.length} 맞음`)),
        h('div', { class: 'card col', style: { gap: '8px' } },
          h('div', { class: 'quiz-q' }, `${i + 1}. ${q.q}`),
          q.code ? codeBlock(q.code, true) : null,
          filesBox,
          h('div', { class: 'row', style: { alignItems: 'flex-start', flexWrap: 'nowrap', gap: '14px' } },
            h('div', { class: 'choices grow' }, q.choices.map((c, k) => h('button', {
              class: 'choice' + (a === k ? (k === q.ans ? ' right' : ' wrong') : '') + (a !== undefined && k === q.ans && a !== k ? ' right' : ''),
              onClick: () => { S.ans[i] = k; save(); paint(); api.refreshNav(); },
            }, q.code4 || q.output ? h('pre', { class: 'code sm', style: { background: 'transparent', color: 'inherit', padding: 0, fontSize: '14.5px' } }, `${'①②③④'[k]} ${c}`) : `${'①②③④'[k]} ${c}`))),
            q.tree ? h('div', { class: 'tree', style: { fontSize: '14px' } }, q.tree) : null),
          a !== undefined ? h('div', { class: 'note ' + (a === q.ans ? 'good' : 'bad'), html: (a === q.ans ? '✔ 맞았어요. ' : `✘ 정답은 ${'①②③④'[q.ans]}. `) + q.why }) : null),
        h('div', { class: 'row' },
          h('button', { class: 'btn', disabled: i === 0, onClick: () => { S.cur = i - 1; save(); paint(); } }, '◀ 앞 문제'),
          h('button', { class: 'btn primary', disabled: i === QUIZ.length - 1, onClick: () => { S.cur = i + 1; save(); paint(); } }, '다음 문제 ▶'),
          h('span', { class: 'grow' }),
          h('button', { class: 'btn small ghost', onClick: () => { S.ans = {}; S.cur = 0; save(); paint(); api.refreshNav(); } }, '↺ 처음부터'))));
  }
  fill(body, wrap);
  paint();
}
