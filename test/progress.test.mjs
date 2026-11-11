/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  탭 잠금(앞 탭의 활동을 다 끝내야 다음 탭) · 활동 기록 HTML.
 */
import { 묶음, 확인, 참 } from './harness.mjs';
import { ACTIVITIES, blockers, progressOf, isDone, TAB_ORDER } from '../src/lib/progress.js';
import { buildReport, reportFileName, safeName } from '../src/lib/report.js';
import { SORT_CARDS, ANATOMY, LEVELS, PUBLISH } from '../src/data/concept.js';
import { FIXES, QUIZ } from '../src/data/imports.js';
import { MISSIONS } from '../src/data/missions.js';
import { EXAM } from './golden-cases.mjs';
import { PRACTICE_START } from '../src/data/assess.js';
import { migrate, QUIZ_V } from '../src/lib/store.js';

/* ④ 연습 과제의 모범 답은 정답이라 test/local/ 에만 있다(깃허브에 안 올림). 없으면 처음 모습으로 대신한다 */
const EXAM_PROJECT = EXAM ? EXAM.ANSWER : PRACTICE_START;

/** 모든 필수 활동을 끝낸 기록 */
function fullState() {
  return {
    why: { copy: true, mod: true },
    layers: { seen: LEVELS.map((l) => l.id) },
    sort: { graded: true, put: Object.fromEntries(SORT_CARDS.map((c) => [c.id, c.ans])) },
    anatomy: Object.fromEntries(ANATOMY.map((a, i) => [i, a.ans])),
    pip: { installed: ['gtts'], ok: true },
    forms: { shown: true, guess: {} },
    pkgforms: { shown: true, guess: {} },
    fix: { done: Object.fromEntries(FIXES.map((f) => [f.id, true])), proj: {} },
    quiz: { ans: Object.fromEntries(QUIZ.map((q, k) => [k, q.ans])) },
    'mission:m1': { done: true, project: MISSIONS[0].answer, runs: {} },
    'mission:m2': { done: true, project: MISSIONS[1].answer, runs: {} },
    'mission:m3': { done: true, project: MISSIONS[2].answer, runs: {} },
    exam: { passed: true, project: EXAM_PROJECT },
  };
}

묶음('탭 잠금');
{
  참('예전 mytools 연습을 통과한 기록(practice)으로는 ④ 연습 과제가 끝난 것이 아니다', !isDone('assess/practice', { practice: { passed: true } }));
  const keys = (l) => l.map((x) => x.key);
  확인('첫 탭은 언제나 열려 있다', blockers('concept', {}), []);
  확인('처음에는 ② 탭이 ① 의 활동 다섯 가지에 막힌다', keys(blockers('import', {})), ['concept/why', 'concept/layers', 'concept/sort', 'concept/anatomy', 'concept/where']);
  확인('④ 탭을 막는 활동 수 (미션 4 ⭐ 심화는 빼고)', blockers('assess', {}).length, 12);
  참('⭐ 심화(미션 4)는 막지 않는다', !blockers('assess', {}).some((x) => x.key === 'build/m4'));
  확인('다 끝내면 모든 탭이 열린다', TAB_ORDER.map((t) => blockers(t, fullState()).length), [0, 0, 0, 0]);
  const S = fullState(); delete S.quiz;
  확인('확인 문제 하나만 남으면 ③ 탭이 그것 하나에 막힌다', keys(blockers('build', S)), ['import/quiz']);
  const half = fullState(); half.sort.put.pyplot = 'lib';
  확인('분류 카드 하나만 틀려도 ② 탭이 막힌다', keys(blockers('import', half)), ['concept/sort']);
  확인('선생님 코드로 열면 막지 않는다', blockers('assess', { unlock: true }), []);
  확인('진행 정도', [progressOf({}).done, progressOf(fullState()).done, progressOf(fullState()).total], [0, 13, 13]);
  for (const key of Object.keys(ACTIVITIES)) 참(`「${key}」 는 실재하는 탭에 있다`, TAB_ORDER.includes(key.split('/')[0]));
  // ⭐ 내 꾸러미도 pip 로 — 선택이라 잠그지 않는다 (이미 ② 로 넘어간 학생이 다시 잠기지 않게)
  참('⭐ 내 꾸러미도 pip 로 는 선택', ACTIVITIES['concept/publish'].optional === true);
  참('⭐ 내 꾸러미도 pip 로 를 안 해도 ② 탭이 열린다', !blockers('import', fullState()).length && !isDone('concept/publish', fullState()));
  const pubAll = { seen: PUBLISH.steps.map((s) => s.id), ans: Object.fromEntries(PUBLISH.quiz.map((q, k) => [k, q.ans])) };
  참('⭐ 네 걸음을 다 보고 두 문제를 맞히면 끝', isDone('concept/publish', { publish: pubAll }));
  참('⭐ 한 걸음이라도 안 보면 아직', !isDone('concept/publish', { publish: { ...pubAll, seen: pubAll.seen.slice(0, 3) } }));
  참('⭐ 한 문제라도 틀리면 아직', !isDone('concept/publish', { publish: { ...pubAll, ans: { ...pubAll.ans, 1: 0 } } }));
  참('⭐ 끝내도 필수 활동 수는 그대로', progressOf({ ...fullState(), publish: pubAll }).total === 13);
  참('빈 기록에서 아무 활동도 끝난 것이 아니다', Object.keys(ACTIVITIES).every((k) => !isDone(k, {})));
}

묶음('확인 문제 — 8문항이던 때의 기록을 5문항 번호로 옮긴다 (2026-11-11 옛 3·6·8번을 뺌)');
{
  const OLD_ANS = [1, 1, 3, 1, 1, 1, 1, 0]; // 옛 8문항의 정답
  const old = () => ({ ...fullState(), quiz: { ans: Object.fromEntries(OLD_ANS.map((a, k) => [k, a])), cur: 7 } });
  확인('지금 확인 문제는 5문항', QUIZ.length, 5);
  참('옮기지 않으면 — 옛 기록으로는 ③ 탭이 다시 잠긴다(옮기기가 왜 필요한지)', blockers('build', old()).some((x) => x.key === 'import/quiz'));
  const moved = migrate(old());
  확인('옛 8문항을 다 맞힌 기록 → 새 5문항도 다 맞힘', QUIZ.map((q, k) => moved.quiz.ans[k] === q.ans), [true, true, true, true, true]);
  확인('빠진 문항(옛 3·6·8번)의 답은 버린다', Object.keys(moved.quiz.ans), ['0', '1', '2', '3', '4']);
  확인('보던 문항(옛 8번)이 빠졌으면 마지막 문항으로', moved.quiz.cur, 4);
  확인('옮긴 기록에는 판 표시가 붙는다', moved.quiz.v, QUIZ_V);
  확인('③ 탭이 열린 그대로', blockers('build', moved), []);
  const once = migrate(JSON.parse(JSON.stringify(moved)));
  확인('두 번 옮기지 않는다(판 표시가 있으면 그대로)', once.quiz, moved.quiz);
  확인('옛 4번 답만 있던 기록 → 새 3번 답', migrate({ quiz: { ans: { 3: 1 }, cur: 3 } }).quiz, { ans: { 2: 1 }, cur: 2, v: QUIZ_V });
  확인('확인 문제 기록이 없으면 손대지 않는다', migrate({ why: { copy: true } }), { why: { copy: true } });
}

묶음('활동 기록 HTML');
{
  확인('파일 이름 — 학번_이름_활동명', reportFileName('20101', '홍길동'), '20101_홍길동_패키지 공작소.html');
  확인('파일 이름에 쓸 수 없는 글자는 뺀다', safeName('20101_홍/길*동?.html'), '20101_홍길동.html');
  const html = buildReport(fullState(), { id: '20101', name: '<b>홍길동</b>' }, new Date(2026, 10, 5, 9, 30));
  참('학번이 들어 있다', html.includes('학번 <b>20101</b>'));
  참('이름은 글자 그대로(태그가 먹지 않게)', html.includes('&lt;b&gt;홍길동&lt;/b&gt;') && !html.includes('<b><b>홍길동'));
  참('저장한 때', html.includes('2026-11-05 09:30'));
  참('진행 13 / 13', html.includes('<b>13 / 13</b>'));
  참('네 탭이 모두 있다', ['① 개념 잡기', '② 불러오기', '③ 패키지 만들기', '④ 수행평가 준비'].every((t) => html.includes(t)));
  참('⭐ 내 꾸러미도 pip 로 칸이 (선택) 으로 있다', html.includes('⭐ 내 꾸러미도 pip 로 <span class="muted">(선택)</span>'));
  const pubHtml = buildReport({ publish: { seen: ['pack', 'build'], ans: { 0: 1 } } }, { id: '1', name: 'x' });
  참('⭐ 넘겨 본 걸음과 고른 답이 들어간다', pubHtml.includes('✔ 📦 상자 꾸리기') && pubHtml.includes('— 🚚 올리기') && pubHtml.includes('import mypackage.module1'));
  참('⭐ 확인 문제 글에서 태그를 걷어 낸다', pubHtml.includes('1. 친구가 pip install hong-mypackage 로 설치했어요'));
  참('연습 과제 자기 점검 칸이 있다', html.includes(EXAM ? '자기 점검: 4 / 4' : '자기 점검: 0 / 4'));
  참('start.py 실행 결과 칸이 있다', html.includes('python start.py 실행 결과'));
  if (EXAM) 참('(이 컴퓨터에만) 모범 답의 실행 결과가 들어 있다', html.includes('새콤한 사과') && html.includes('foods/milk.py'));
  참('예전 mytools 연습 기록(practice)은 ④ 에 쓰지 않는다', !buildReport({ practice: { passed: true, project: MISSIONS[2].answer } }, { id: '1', name: 'x' }).includes('자기 점검:'));
  참('만든 코드가 들어 있다', html.includes('from mytools.calc import add'));
  참('저작권 표시', html.includes('© 2026 티쳐무'));
  const empty = buildReport({}, { id: '20102', name: '김철수' });
  참('빈 기록도 만들어진다', empty.includes('<b>0 / 13</b>') && empty.includes('아직 시작하지 않았어요'));
  const evil = buildReport({ exam: { project: { files: { 'start.py': '</pre><script>alert(1)</script>' } } } }, { id: '1', name: 'x' });
  참('학생 코드 속 태그도 글자 그대로', !evil.includes('<script>alert(1)</script>'));
}

묶음('복수 정답 — 두 이름이 다 맞는 것 (2026-11-10 사용자 결정)');
{
  const { isAnswer, whyOf, BINS, ROLES } = await import('../src/data/concept.js');
  const card = (id) => SORT_CARDS.find((c) => c.id === id);
  const ana = (word) => ANATOMY.find((a) => a.parts.some((p) => typeof p === 'object' && p.t === word));
  확인('복수 정답인 분류 카드', SORT_CARDS.filter((c) => c.also).map((c) => [c.id, c.ans, ...c.also]), [['pandas', 'lib', 'pkg'], ['random', 'mod', 'lib']]);
  확인('복수 정답인 import 문', ANATOMY.filter((a) => a.also).map((a) => [a.parts.find((p) => typeof p === 'object').t, a.ans, ...a.also]), [['math', 'mod', 'lib'], ['matplotlib', 'lib', 'pkg']]);
  참('random — 모듈·라이브러리 모두 정답, 패키지는 틀림', isAnswer(card('random'), 'mod') && isAnswer(card('random'), 'lib') && !isAnswer(card('random'), 'pkg'));
  참('pandas — 라이브러리·패키지 모두 정답, 모듈은 틀림', isAnswer(card('pandas'), 'lib') && isAnswer(card('pandas'), 'pkg') && !isAnswer(card('pandas'), 'mod'));
  참('math — 모듈·라이브러리 모두 정답', isAnswer(ana('math'), 'mod') && isAnswer(ana('math'), 'lib') && !isAnswer(ana('math'), 'fn'));
  참('matplotlib — 라이브러리·패키지 모두 정답', isAnswer(ana('matplotlib'), 'lib') && isAnswer(ana('matplotlib'), 'pkg') && !isAnswer(ana('matplotlib'), 'mod'));
  참('pyplot 은 여전히 모듈 하나만', isAnswer(ana('pyplot'), 'mod') && !isAnswer(ana('pyplot'), 'lib'));
  참('아무것도 안 고르면 정답이 아니다', !isAnswer(card('random'), undefined) && !isAnswer(ana('math'), undefined));
  for (const it of [...SORT_CARDS, ...ANATOMY].filter((x) => x.also)) {
    참(`「${it.id || it.parts.join('')}」 함께 받는 정답이 실재하는 칸`, it.also.every((id) => BINS.some((b) => b.id === id) && ROLES.some((r) => r.id === id)));
    참(`「${it.id || it.ans}」 함께 받는 정답을 골랐을 때의 풀이가 따로 있다`, !!it.whyAlso && whyOf(it, it.also[0]) === it.whyAlso && whyOf(it, it.ans) === it.why);
  }
  // 다른 이름을 골라도 활동이 끝난다 (탭 잠금)
  const S = fullState();
  S.sort.put.random = 'lib'; S.sort.put.pandas = 'pkg';
  S.anatomy[ANATOMY.indexOf(ana('math'))] = 'lib'; S.anatomy[ANATOMY.indexOf(ana('matplotlib'))] = 'pkg';
  참('다른 이름으로 넣어도 분류해 보기가 끝난다', isDone('concept/sort', S));
  참('다른 이름으로 골라도 import 문 읽기가 끝난다', isDone('concept/anatomy', S));
  확인('② 탭이 열린다', blockers('import', S), []);
  const html = buildReport(S, { id: '1', name: 'x' });
  참('활동 기록 — 정답 칸에 두 이름을 함께 적는다', html.includes('<td>모듈 · 라이브러리</td>') && html.includes('<td>라이브러리 · 패키지</td>'));
  참('활동 기록 — 다른 이름도 ✔', !/<td><code>random<\/code><\/td><td>라이브러리<\/td><td>[^<]*<\/td><td><span class="no">/.test(html));
}
