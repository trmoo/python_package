/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  「지금까지 한 활동」 을 HTML 한 파일로 — 학생이 바탕 화면에 저장해 선생님께 낸다 (2026-11-05 사용자 지시).
 *  파일 이름: 학번_이름_패키지 공작소.html
 *  ⚠ 학번·이름은 이 파일 안에만 들어간다. 브라우저 저장소(localStorage)에는 남기지 않는다.
 *  ⚠ node 로 불러다 시험하므로 DOM 을 만지지 말 것. 돌려주는 것은 HTML 글자다.
 */
import { ACTIVITIES, isDone, progressOf } from './progress.js';
import { check, CONDITIONS } from './checker.js';
import { SORT_CARDS, BINS, ANATOMY, ROLES } from '../data/concept.js';
import { FORMS, PKGFORMS, FIXES, QUIZ } from '../data/imports.js';
import { MISSIONS, stepsDone } from '../data/missions.js';
import { runProject } from './pymini.js';

export const ACTIVITY_NAME = '패키지 공작소';
/** 파일 이름에 쓸 수 없는 글자를 걷어 낸다 (윈도우: \ / : * ? " < > |) */
export const safeName = (s) => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim();
export const reportFileName = (id, name) => safeName(`${id}_${name}_${ACTIVITY_NAME}.html`);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mark = (ok) => (ok ? '<span class="ok">✔</span>' : '<span class="no">✘</span>');
const stamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** 프로젝트를 폴더 그림 + 파일별 코드로 */
function projectHtml(p) {
  if (!p || !p.files) return '<p class="muted">아직 만든 것이 없어요.</p>';
  const paths = Object.keys(p.files).filter((f) => !/\.mp3$/i.test(f)).sort();
  const tree = paths.map((f) => `<div style="padding-left:${(f.split('/').length - 1) * 18}px">${f.endsWith('__init__.py') ? '📦' : '📄'} ${esc(f.split('/').pop())}${f.includes('/') ? ` <span class="muted">(${esc(f.split('/').slice(0, -1).join('/'))}/)</span>` : ''}</div>`).join('');
  const code = paths.map((f) => `<div class="file"><div class="fname">📄 ${esc(f)}</div><pre>${esc(p.files[f]) || '<span class="muted">(빈 파일)</span>'}</pre></div>`).join('');
  return `<div class="tree">${tree}</div>${code}`;
}

/**
 * S: 기록 묶음(store.js 의 S) · who: { id: 학번, name: 이름 } · now: 저장한 때(Date)
 */
export function buildReport(S, who, now = new Date()) {
  const S0 = S || {};
  /** 활동 한 칸 — 제목 앞에 ✅/⬜, 아래에 완료 조건 */
  const section = (key, body) => {
    const a = ACTIVITIES[key];
    const done = a ? isDone(key, S0) : null;
    return `<section><h3>${done === null ? '' : done ? '✅ ' : '⬜ '}${esc(a ? a.title : key)}${a && a.optional ? ' <span class="muted">(선택)</span>' : ''}</h3>${a ? `<p class="how">완료 조건 — ${esc(a.how)}</p>` : ''}${body}</section>`;
  };
  const prog = progressOf(S0);
  const parts = [];

  // ── ① 개념 잡기 ──
  parts.push('<h2>① 개념 잡기</h2>');
  parts.push(section('concept/why', `<p>방법 A(복사해 붙이기) 고쳐 보기 ${mark(S0.why && S0.why.copy)} · 방법 B(모듈로 나누기) 고쳐 보기 ${mark(S0.why && S0.why.mod)}</p>`));
  const seen = (S0.layers && S0.layers.seen) || [];
  parts.push(section('concept/layers', `<p>눌러 본 개념: ${seen.length ? esc(seen.map((x) => ({ lib: '라이브러리', pkg: '패키지', mod: '모듈', fn: '모듈 안의 이름', init: '__init__.py' }[x] || x)).join(' · ')) : '없음'}</p>`));
  const sort = S0.sort || { put: {} };
  parts.push(section('concept/sort', `<table><tr><th>카드</th><th>내가 넣은 곳</th><th>정답</th><th></th></tr>${SORT_CARDS.map((c) => {
    const put = BINS.find((b) => b.id === sort.put[c.id]);
    return `<tr><td><code>${esc(c.nm)}</code></td><td>${put ? esc(put.name) : '<span class="muted">안 넣음</span>'}</td><td>${esc(BINS.find((b) => b.id === c.ans).name)}</td><td>${put ? mark(put.id === c.ans) : ''}</td></tr>`;
  }).join('')}</table>${sort.graded ? '' : '<p class="muted">아직 채점하지 않았어요.</p>'}`));
  const ana = S0.anatomy || {};
  parts.push(section('concept/anatomy', `<table><tr><th>import 문 (밑줄 = 물어본 곳)</th><th>내 답</th><th></th></tr>${ANATOMY.map((a, i) => {
    const src = a.parts.map((p) => (typeof p === 'string' ? esc(p) : `<u>${esc(p.t)}</u>`)).join('');
    const mine = ROLES.find((r) => r.id === ana[i]);
    return `<tr><td><code>${src}</code></td><td>${mine ? esc(mine.label) : '<span class="muted">안 고름</span>'}</td><td>${mine ? mark(ana[i] === a.ans) : ''}</td></tr>`;
  }).join('')}</table>`));
  const pip = S0.pip || {};
  parts.push(section('concept/where', `<p>설치한 외부 라이브러리: ${pip.installed && pip.installed.length ? esc(pip.installed.join(', ')) : '없음'} · gtts 로 소리 파일 만들기 ${mark(pip.ok)}</p>`));

  // ── ② 불러오기 ──
  parts.push('<h2>② 불러오기</h2>');
  for (const [key, data, slot] of [['import/forms', FORMS, 'forms'], ['import/pkgforms', PKGFORMS, 'pkgforms']]) {
    const st = S0[slot] || { guess: {} };
    let right = 0;
    const rows = data.rows.map((r, i) => `<tr><th><code>${esc(r)}</code></th>${data.cols.map((c, j) => {
      const g = st.guess && st.guess[`${i}-${j}`];
      const truth = runProject({ files: { ...data.files, 'main.py': `${r}\n${c}\n` } }).ok ? 'o' : 'x';
      if (st.shown && g === truth) right++;
      return `<td>${g === 'o' ? '⭕' : g === 'x' ? '❌' : '?'}${st.shown ? ` ${g === truth ? mark(true) : mark(false)}` : ''}</td>`;
    }).join('')}</tr>`).join('');
    parts.push(section(key, `<table><tr><th>import ↓ / 부르기 →</th>${data.cols.map((c) => `<th><code>${esc(c)}</code></th>`).join('')}</tr>${rows}</table>${st.shown ? `<p>예측 성공 ${right} / ${data.rows.length * data.cols.length}칸</p>` : '<p class="muted">아직 실행해서 확인하지 않았어요.</p>'}`));
  }
  const fix = S0.fix || { done: {}, proj: {} };
  parts.push(section('import/fix', FIXES.map((f) => `<div class="sub"><b>${fix.done && fix.done[f.id] ? '✅' : '⬜'} ${esc(f.title)}</b>${fix.proj && fix.proj[f.id] ? `<details><summary>내가 고친 코드</summary>${projectHtml(fix.proj[f.id])}</details>` : ''}</div>`).join('')));
  const quiz = S0.quiz || { ans: {} };
  parts.push(section('import/quiz', `<table><tr><th>문항</th><th>내 답</th><th></th></tr>${QUIZ.map((q, k) => {
    const a = quiz.ans ? quiz.ans[k] : undefined;
    return `<tr><td>${k + 1}. ${esc(q.q)}</td><td>${a === undefined ? '<span class="muted">안 풂</span>' : '①②③④'[a]}</td><td>${a === undefined ? '' : mark(a === q.ans)}</td></tr>`;
  }).join('')}</table>`));

  // ── ③ 패키지 만들기 ──
  parts.push('<h2>③ 패키지 만들기</h2>');
  for (const m of MISSIONS) {
    const st = S0[`mission:${m.id}`] || {};
    const p = st.project || null;
    const marks = p ? stepsDone(m, p, st.runs || {}) : m.steps.map(() => false);
    parts.push(section(`build/${m.id}`, `<ol class="steps">${m.steps.map((s, i) => `<li>${marks[i] ? '✅' : '⬜'} ${s.text}</li>`).join('')}</ol>${p ? `<details><summary>내가 만든 프로젝트</summary>${projectHtml(p)}</details>` : '<p class="muted">아직 시작하지 않았어요.</p>'}`));
  }

  // ── ④ 수행평가 연습 ──
  parts.push('<h2>④ 수행평가 준비</h2>');
  const pr = S0.practice || {};
  if (pr.project) {
    const res = check(pr.project);
    parts.push(section('assess/practice', `<table><tr><th>조건</th><th>상태</th><th>설명</th></tr>${res.items.map((it, i) => `<tr><td>${'①②③④⑤⑥'[i]} ${esc(CONDITIONS[i].title)}</td><td>${it.state === 'ok' ? '✅' : it.state === 'part' ? '🟨' : '⬜'}</td><td>${esc(it.detail)}</td></tr>`).join('')}</table>
<p><b>자기 점검: ${res.level}점 수준</b> — ${esc(res.levelText)} <span class="muted">(채점이 아니라 앱의 자기 점검이에요)</span></p>
${res.run ? `<div class="file"><div class="fname">▶ python main.py 실행 결과</div><pre>${esc(res.run.stdout)}${res.run.stderr ? `\n${esc(res.run.stderr)}` : ''}</pre></div>` : ''}
<details open><summary>내가 만든 프로젝트</summary>${projectHtml(pr.project)}</details>`));
  } else parts.push(section('assess/practice', '<p class="muted">아직 시작하지 않았어요.</p>'));

  return `<!doctype html>
<!-- ${ACTIVITY_NAME} — 활동 기록 · © 2026 티쳐무 · 모든 권리 보유 -->
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(who.id)} ${esc(who.name)} — ${ACTIVITY_NAME} 활동 기록</title>
<style>
body{font-family:'Pretendard','Malgun Gothic','맑은 고딕',sans-serif;color:#1d2433;background:#f4f6fb;margin:0;padding:24px;line-height:1.55}
main{max-width:960px;margin:0 auto;background:#fff;border:1px solid #dfe4ee;border-radius:14px;padding:24px 28px}
h1{margin:0 0 4px;font-size:26px} h2{margin:26px 0 8px;font-size:21px;border-bottom:2px solid #dfe4ee;padding-bottom:4px}
h3{margin:14px 0 4px;font-size:17px} .how{margin:0 0 6px;color:#5f6878;font-size:13px}
.who{display:flex;gap:18px;flex-wrap:wrap;background:#edf2ff;border-radius:10px;padding:10px 14px;margin:10px 0;font-size:16px}
.who b{font-size:19px} table{border-collapse:collapse;width:100%;font-size:14px;margin:4px 0}
th,td{border:1px solid #dfe4ee;padding:4px 8px;text-align:left;vertical-align:top} th{background:#f1f3f8}
code{font-family:'D2Coding',Consolas,monospace;background:#f1f3f8;padding:0 4px;border-radius:4px}
pre{font-family:'D2Coding',Consolas,monospace;background:#1f2433;color:#e9ecf5;padding:8px 12px;border-radius:8px;white-space:pre-wrap;font-size:13.5px;margin:2px 0 8px}
.tree{font-family:'D2Coding',Consolas,monospace;background:#fff8ef;border:1px solid #f3d9b8;border-radius:8px;padding:6px 12px;margin:6px 0;font-size:14px}
.fname{font-weight:700;font-size:13px;margin-top:6px} .muted{color:#868e96} .ok{color:#2b8a3e;font-weight:900} .no{color:#e03131;font-weight:900}
.sub{margin:4px 0} details{margin:4px 0} summary{cursor:pointer;font-weight:700;color:#3b5bdb}
.steps{margin:4px 0;padding-left:20px;font-size:14px;list-style:none} .bar{height:12px;background:#eef1f8;border-radius:999px;overflow:hidden}
.bar i{display:block;height:100%;background:#2b8a3e} footer{margin-top:24px;font-size:12px;color:#868e96;text-align:center}
@media print{body{background:#fff;padding:0} main{border:0} details{display:block} details>*{display:block}}
</style></head><body><main>
<h1>📦 ${ACTIVITY_NAME} — 지금까지 한 활동</h1>
<div class="who"><span>학번 <b>${esc(who.id)}</b></span><span>이름 <b>${esc(who.name)}</b></span><span>저장한 때 <b>${stamp(now)}</b></span></div>
<p>필수 활동 <b>${prog.done} / ${prog.total}</b> 끝냄</p>
<div class="bar"><i style="width:${Math.round((prog.done / prog.total) * 100)}%"></i></div>
${parts.join('\n')}
<footer>📦 ${ACTIVITY_NAME} 에서 저장한 활동 기록입니다. 「○점 수준」 은 앱의 자기 점검이며 채점 결과가 아닙니다.<br>© 2026 티쳐무 · 모든 권리 보유</footer>
</main></body></html>`;
}
