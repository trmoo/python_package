/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  화면 자료가 앞뒤가 맞는지 — 「화면에 적어 둔 답」 과 「진짜로 실행한 결과」 가 어긋나지 않는가.
 */
import { 묶음, 확인, 참 } from './harness.mjs';
import { runProject } from '../src/lib/pymini.js';
import { WHY, SORT_CARDS, BINS, ANATOMY, ROLES, LEVELS, PANDAS, NUMPY_BOOK, INIT_INFO, treeLines, numpyBookAsNode, PUBLISH, SORT_HINTS, isAnswer } from '../src/data/concept.js';
import { FORMS, PKGFORMS, FIXES, QUIZ, MODULE1 } from '../src/data/imports.js';
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

묶음('import 문 읽기 — 문항마다 💡 힌트 그림');
for (const [i, a] of ANATOMY.entries()) {
  const word = a.parts.find((p) => typeof p === 'object').t;
  const rows = (a.hint && a.hint.tree) || [];
  const marked = rows.filter((r) => r[3]);
  확인(`힌트 ${i + 1} — 노랗게 칠한 줄은 하나`, marked.length, 1);
  참(`힌트 ${i + 1} — 칠한 줄에 「${word}」 가 있다`, marked.length === 1 && marked[0][1].includes(word));
  참(`힌트 ${i + 1} — 아는 갈래만 쓴다`, rows.every((r) => 'rdifnac'.includes(r[0])));
  // 힌트가 답을 말해 버리면 안 된다 — 물음과 # 설명에 정답 이름(모듈·패키지…)이 없어야 한다
  // 함께 받는 정답(also)도 적지 않는다 (2026-11-10 복수 정답)
  for (const id of [a.ans, ...(a.also || [])]) {
    const answer = ROLES.find((r) => r.id === id).label.split(' ').slice(1).join(' ');
    참(`힌트 ${i + 1} — 정답 「${answer}」 를 적지 않는다`, !!a.hint.ask && ![a.hint.ask, ...rows.map((r) => r[2])].some((t) => t.includes(answer)));
  }
}

묶음('분류해 보기 — 카드마다 💡 힌트 그림 (2026-11-10)');
확인('힌트가 있는 카드 = 모든 카드', Object.keys(SORT_HINTS).sort(), SORT_CARDS.map((c) => c.id).sort());
for (const c of SORT_CARDS) {
  const hint = SORT_HINTS[c.id];
  const rows = (hint && hint.tree) || [];
  const marked = rows.filter((r) => r[3]);
  확인(`「${c.nm}」 노랗게 칠한 줄은 하나`, marked.length, 1);
  참(`「${c.nm}」 칠한 줄에 카드 이름이 있다`, marked.length === 1 && marked[0][1].includes(c.nm.replace(/\.py$/, '')));
  참(`「${c.nm}」 아는 갈래만 쓴다`, rows.every((r) => 'rdifnac'.includes(r[0])));
  참(`「${c.nm}」 물음이 있다`, !!hint && !!hint.ask);
  // 답을 말하면 안 된다 — 정답 바구니 이름(함께 받는 정답 포함)이 물음·# 설명에 없어야 한다
  for (const id of [c.ans, ...(c.also || [])]) {
    const name = BINS.find((b) => b.id === id).name;
    참(`「${c.nm}」 힌트가 정답 「${name}」 를 적지 않는다`, ![hint.ask, ...rows.map((r) => r[2])].some((t) => t.includes(name)));
  }
}

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

묶음('⭐ 내 꾸러미도 pip 로 — 네 걸음과 확인 문제가 앞뒤가 맞는다');
{
  const P = PUBLISH;
  확인('네 걸음 — 꾸리기·포장·올리기·받기', P.steps.map((s) => s.id), ['pack', 'build', 'upload', 'get']);
  for (const s of P.steps) 참(`「${s.title}」 — 한 줄 설명과 도움말이 있다`, !!s.say && s.tips.length > 0);
  const step = (id) => P.steps.find((s) => s.id === id);
  // 이름표의 name·version 이 화면 곳곳의 이름과 같아야 한다 (하나만 고치면 어긋난다)
  참('이름표 — name 이 pip 이름', step('pack').code.includes(`name = "${P.pipName}"`) && step('pack').full.includes(`name = "${P.pipName}"`));
  참('이름표 — version', step('pack').code.includes(`version = "${P.version}"`) && step('pack').full.includes(`version = "${P.version}"`));
  참('상자 그림 — 맨 위 폴더가 pip 이름', step('pack').tree[0][1] === `${P.pipName}/`);
  참('상자 그림 — 안의 폴더가 import 이름', step('pack').tree.some(([k, t]) => k === 'd' && t.endsWith(`${P.importName}/`)));
  // 포장한 파일 이름 — 붙임표는 밑줄로 바뀐다 (2026-11-05 setuptools 83 으로 실제 포장해 확인한 이름)
  const wheel = `${P.pipName.replace(/-/g, '_')}-${P.version}-py3-none-any.whl`;
  참(`포장 — dist 에 ${wheel}`, step('build').tree.some(([, t]) => t.endsWith(wheel)));
  참('포장 — 명령은 py -m build', step('build').term.some(([k, t]) => k === 'cmd' && t === 'py -m build'));
  참('받기 — pip install 에 쓰는 이름', step('get').term.some(([k, t]) => k === 'cmd' && t === `pip install ${P.pipName}`));
  참('받기 — 설치 문구의 판 번호', step('get').term.some(([, t]) => t === `Successfully installed ${P.pipName}-${P.version}`));
  // 친구의 main.py — 설치된 꾸러미는 폴더와 똑같이 불린다 (화면이 이 결과를 그대로 보여 준다)
  const files = { 'mypackage/__init__.py': '', 'mypackage/module1.py': MODULE1 };
  확인('받기 — 친구의 main.py 실행 결과', runProject({ files: { ...files, 'main.py': step('get').code } }).stdout, '안녕! module1 이에요');
  // 📝 한눈에 정리 (2026-11-10) — 걸음이 아니라 따로 둔다. 걸음에 섞이면 이미 끝낸 학생의 ✔ 가 사라진다
  const SUM = P.summary;
  확인('정리 — 네 낱말 차례', SUM.rows.map((r) => r.name), ['모듈', '패키지', '라이브러리', '배포 패키지']);
  참('정리 — 칸마다 누가·무엇·예가 채워져 있다', SUM.head.length === 4 && SUM.rows.every((r) => r.ic && r.who && r.what && r.ex));
  참('정리 — 걸음 칸에 섞이지 않는다', !P.steps.some((s) => s.id === 'sum' || s.title === SUM.title));
  참('정리 — 배포 패키지의 예는 이름표의 pip 이름', SUM.rows[3].ex.includes(P.pipName));
  참('정리 — 4단계 이름 짝(설치 이름 → 폴더 이름)이 화면과 같다', SUM.tips.some(([, t]) => t.includes(P.pipName) && t.includes(P.importName)));
  // 「random 은 분류해 보기에서 두 답을 다 받는다」 는 도움말이 실제 채점과 맞아야 한다
  const rnd = SORT_CARDS.find((c) => c.id === 'random');
  참('정리 — random 도움말 = 분류해 보기에서 모듈·라이브러리 모두 정답', SUM.tips.some(([, t]) => t.includes('분류해 보기')) && isAnswer(rnd, 'mod') && isAnswer(rnd, 'lib'));
  // 확인 문제
  for (const [k, q] of P.quiz.entries()) {
    참(`확인 문제 ${k + 1} — 정답 칸이 있다`, q.ans >= 0 && q.ans < q.choices.length);
    확인(`확인 문제 ${k + 1} — 칸마다 풀이가 있다`, q.why.length, q.choices.length);
  }
  const q1 = P.quiz[0];
  확인('확인 문제 1 — 붙임표 이름으로 import 하면 정말 SyntaxError', runProject({ files: { ...files, 'main.py': q1.choices[0] } }).errorType, 'SyntaxError');
  참('확인 문제 1 — 정답(폴더 이름)은 정말 불린다', runProject({ files: { ...files, 'main.py': q1.choices[q1.ans] } }).ok);
  확인('확인 문제 1 — 정답은 import 이름으로 시작한다', q1.choices[q1.ans].split(' ')[1].split('.')[0], P.importName);
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
  // 2026-11-11 실행 결과·폴더 그림 문항을 빼며 화면에서도 그 갈래를 지웠다 — 되살리려면 화면(renderQuiz)도 함께
  확인(`${i + 1}번 — 화면이 그리지 않는 갈래(files·output·tree·code4)가 없다`, ['files', 'output', 'tree', 'code4'].filter((k) => k in q), []);
}
{
  const q = QUIZ.find((x) => x.q.startsWith('import calc.py'));
  확인('import calc.py 문항 — 보기가 실제 오류 문구와 같다', runProject({ files: { 'main.py': 'import calc.py\n', 'calc.py': 'x = 1\n' } }).stderr.split('\n').pop(), q.choices[q.ans]);
}

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
