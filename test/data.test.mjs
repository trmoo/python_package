/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  화면 자료가 앞뒤가 맞는지 — 「화면에 적어 둔 답」 과 「진짜로 실행한 결과」 가 어긋나지 않는가.
 */
import { 묶음, 확인, 참 } from './harness.mjs';
import { runProject } from '../src/lib/pymini.js';
import { WHY, SORT_CARDS, BINS, ANATOMY, ROLES, LEVELS, PANDAS, NUMPY_BOOK, INIT_INFO, treeLines, numpyBookAsNode } from '../src/data/concept.js';
import { FORMS, PKGFORMS, FIXES, QUIZ } from '../src/data/imports.js';
import { MISSIONS } from '../src/data/missions.js';
import { fixPassedForTest } from './helpers.mjs';

묶음('왜 나눌까 — 고치기 전후의 값');
{
  const run = (fn, call) => runProject({ files: { 'main.py': `${fn}\n\nprint(${call})` } }).stdout;
  확인('버그 — 내 것은 틀린 값', run(WHY.buggy, WHY.mine.call), '113.33333333333333');
  확인('버그 — 친구 것도 틀린 값', run(WHY.buggy, WHY.friend.call), '11.333333333333334');
  확인('고침 — 내 것 85.0', run(WHY.fixed, WHY.mine.call), '85.0');
  확인('고침 — 친구 것 8.5', run(WHY.fixed, WHY.friend.call), '8.5');
}

묶음('분류·import 문 읽기 — 정답이 실재하는 칸을 가리킨다');
for (const c of SORT_CARDS) 참(`${c.nm} 의 정답 바구니가 있다`, BINS.some((b) => b.id === c.ans));
확인('분류 카드 10장', SORT_CARDS.length, 10);
for (const b of BINS) 참(`바구니 「${b.name}」 에 들어갈 카드가 하나 이상`, SORT_CARDS.some((c) => c.ans === b.id));
for (const [i, a] of ANATOMY.entries()) {
  참(`import 문 ${i + 1} — 정답 역할이 있다`, ROLES.some((r) => r.id === a.ans));
  확인(`import 문 ${i + 1} — 밑줄 친 곳은 하나`, a.parts.filter((p) => typeof p === 'object' && p.mark).length, 1);
  // 문장 자체가 파이썬 문법에 맞아야 한다 (화면에 틀린 문법을 보여 주지 않게)
  const src = a.parts.map((p) => (typeof p === 'string' ? p : p.t)).join('');
  const r = runProject({ files: { 'main.py': src, 'mypackage/__init__.py': '', 'mypackage/module1.py': 'def hello():\n    pass\n', 'mypackage/module2.py': '' } });
  참(`import 문 ${i + 1} 「${src}」 — 문법 오류가 아니다`, !['SyntaxError', 'IndentationError'].includes(r.errorType));
}
확인('개념 네 가지', LEVELS.map((l) => l.id), ['lib', 'pkg', 'mod', 'fn']);

묶음('폴더 나무 그림 — 상자 그림과 같은 자료에서 나온다');
{
  const pd = treeLines(PANDAS);
  확인('pandas 나무 — 11줄', pd.length, 11);
  확인('pandas 나무 — 맨 윗줄은 라이브러리', pd[0].slice(0, 2), ['d', 'pandas/']);
  참('pandas 나무 — 폴더(패키지) 줄 바로 다음은 언제나 __init__.py', pd.every(([k, , , id], i) => id !== 'pkg' || /__init__\.py$/.test(pd[i + 1][1])));
  확인('pandas 나무 — 맨 깊은 줄', pd.at(-1).slice(0, 3), ['f', '        └── readers.py', 'def read_csv()']);
  확인('pandas 나무 — class 와 def 를 가른다', pd.filter((r) => r[0] === 'f').map((r) => r[2]), ['class DataFrame', 'class Series', 'def read_csv()']);
  확인('pandas 나무 — 맨 위 __init__.py 에 설명이 붙는다', pd[1][2], PANDAS.init);
  const np = treeLines(numpyBookAsNode());
  확인('NumPy 나무 — 교과서 그림처럼 맨 위에 __init__.py 가 없다', np[1].slice(0, 2), ['d', '├── core/']);
  확인('NumPy 나무 — 모듈 셋', np.filter((r) => r[0] === 'f').map((r) => r[1].trim().split(' ').pop()), NUMPY_BOOK.pkgs.flatMap((p) => p.mods.map((m) => m.name)));
  참('나무 글자에 빈칸 맞춤이 없다 (설명 칸은 화면 격자가 맞춘다)', [...pd, ...np].every((r) => r[1] === r[1].trimEnd()));
  참('__init__.py 설명 — pandas 두 줄이 있다', INIT_INFO.code.includes('from pandas.io.api import read_csv') && INIT_INFO.code.includes('from pandas.core.api import DataFrame'));
}

묶음('예측 표 — 칸마다 결과가 수업 의도와 같다');
{
  const grid = (data) => data.rows.map((r) => data.cols.map((c) => (runProject({ files: { ...data.files, 'main.py': `${r}\n${c}\n` } }).ok ? 'o' : 'x')).join('')).join('/');
  // 대각선만 된다 — 「import 문이 만든 이름만 쓸 수 있다」
  확인('import 세 가지 꼴', grid(FORMS), 'oxx/xox/xxo');
  // 마지막 줄 import mypackage 는 아무것도 안 된다 (__init__.py 가 비어 있으므로)
  확인('패키지 속 모듈', grid(PKGFORMS), 'oxx/xox/xxo/xxx');
  const trap = runProject({ files: { ...PKGFORMS.files, 'main.py': 'import mypackage\nmypackage.module1.hello()\n' } });
  확인('import mypackage 함정은 AttributeError', trap.errorType, 'AttributeError');
}

묶음('오류 고치기 — 처음엔 막히고, 고친 모습은 통과한다');
for (const f of FIXES) {
  const first = runProject({ files: f.project.files, entry: f.active || 'main.py' });
  참(`${f.id} — 처음 모습은 오류가 난다`, !first.ok);
  확인(`${f.id} — 힌트 세 단계`, f.hints.length, 3);
  const fixedR = runProject({ files: f.fixed.files, entry: 'main.py' });
  참(`${f.id} — 고친 모습은 통과`, fixPassedForTest(f, fixedR, f.fixed));
  참(`${f.id} — 처음 모습은 통과하지 않는다`, !fixPassedForTest(f, first, f.project));
  // print(5) 로 때우면 통과하지 않는다
  const cheat = runProject({ files: { ...f.project.files, 'main.py': `print(${JSON.stringify(f.goal)})\n` }, entry: 'main.py' });
  참(`${f.id} — 답만 찍으면 통과 못 한다`, !fixPassedForTest(f, cheat, { files: { ...f.project.files, 'main.py': '' } }));
}
확인('오류 고치기 shadow 는 math.py 가 내장 math 에 가려진다', runProject({ files: FIXES.find((f) => f.id === 'shadow').project.files }).errorMsg, "module 'math' has no attribute 'add'");
확인('오류 고치기 where 는 실행한 폴더에서 못 찾는다', runProject({ files: FIXES.find((f) => f.id === 'where').project.files, entry: 'mypackage/main.py' }).errorMsg, "No module named 'mypackage'");

묶음('확인 문제');
for (const [i, q] of QUIZ.entries()) {
  참(`${i + 1}번 — 정답 번호가 보기 안에 있다`, q.ans >= 0 && q.ans < q.choices.length);
  확인(`${i + 1}번 — 보기 네 개`, q.choices.length, 4);
  if (q.files) 확인(`${i + 1}번 — 정답 보기가 실제 실행 결과와 같다`, runProject({ files: q.files }).stdout, q.choices[q.ans]);
  if (q.code4) {
    const res = q.choices.map((c) => runProject({ files: { ...PKGFORMS.files, 'main.py': c } }).ok);
    확인(`${i + 1}번 — 오류가 나는 것은 정답 하나뿐`, res.map((ok) => (ok ? 'o' : 'x')).join(''), q.choices.map((_, k) => (k === q.ans ? 'x' : 'o')).join(''));
  }
}
확인('4번 — import calc.py 의 실제 문구', runProject({ files: { 'main.py': 'import calc.py\n', 'calc.py': 'x = 1\n' } }).stderr.split('\n').pop(), QUIZ[3].choices[QUIZ[3].ans]);

묶음('미션 — 모범 답안은 모든 단계를 통과하고, 시작 모습은 통과하지 않는다');
const runsFor = (p, entries) => Object.fromEntries(entries.map((e) => { const r = runProject({ files: p.files, dirs: p.dirs, entry: e }); return [e, { r, p }]; }));
for (const m of MISSIONS) {
  const entries = m.id === 'm4' ? ['main.py', 'mytools/greet.py'] : ['main.py'];
  const ans = m.steps.map((s) => s.check(m.answer, runsFor(m.answer, entries)));
  확인(`${m.id} — 모범 답안은 단계 모두 ✔`, ans, m.steps.map(() => true));
  const st = m.steps.map((s) => s.check(m.start, runsFor(m.start, ['main.py'])));
  참(`${m.id} — 시작 모습은 다 끝난 상태가 아니다`, st.some((x) => !x));
  확인(`${m.id} — 힌트 세 단계`, m.hints.length, 3);
}
{
  // 미션 2 — greet.py 를 옮기기만 하고 import 를 안 고치면 실행 단계는 꺼져 있다
  const m2 = MISSIONS.find((m) => m.id === 'm2');
  const half = { files: { 'main.py': 'import greet\n\ngreet.hello("민지")\n', 'mytools/__init__.py': '', 'mytools/greet.py': m2.start.files['greet.py'] }, dirs: [] };
  const marks = m2.steps.map((s) => s.check(half, runsFor(half, ['main.py'])));
  확인('미션 2 반쯤 — 앞 세 단계만 ✔', marks, [true, true, true, false, false]);
  확인('미션 2 반쯤 — 실행하면 ModuleNotFoundError', runProject({ files: half.files }).errorType, 'ModuleNotFoundError');
}
