/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  탭 잠금(앞 탭의 활동을 다 끝내야 다음 탭) · 활동 기록 HTML.
 */
import { 묶음, 확인, 참 } from './harness.mjs';
import { ACTIVITIES, blockers, progressOf, isDone, TAB_ORDER } from '../src/lib/progress.js';
import { buildReport, reportFileName, safeName } from '../src/lib/report.js';
import { SORT_CARDS, ANATOMY, LEVELS } from '../src/data/concept.js';
import { FIXES, QUIZ } from '../src/data/imports.js';
import { MISSIONS } from '../src/data/missions.js';
import { EXAM } from './golden-cases.mjs';
import { PRACTICE_START } from '../src/data/assess.js';

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
  참('빈 기록에서 아무 활동도 끝난 것이 아니다', Object.keys(ACTIVITIES).every((k) => !isDone(k, {})));
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
  참('연습 과제 자기 점검 칸이 있다', html.includes(EXAM ? '자기 점검: 6 / 6' : '자기 점검: 0 / 6'));
  참('start.py 실행 결과 칸이 있다', html.includes('python start.py 실행 결과'));
  if (EXAM) 참('(이 컴퓨터에만) 모범 답의 실행 결과가 들어 있다', html.includes('새콤한 사과') && html.includes('foods/drinks/milk.py'));
  참('예전 mytools 연습 기록(practice)은 ④ 에 쓰지 않는다', !buildReport({ practice: { passed: true, project: MISSIONS[2].answer } }, { id: '1', name: 'x' }).includes('자기 점검:'));
  참('만든 코드가 들어 있다', html.includes('from mytools.calc import add'));
  참('저작권 표시', html.includes('© 2026 티쳐무'));
  const empty = buildReport({}, { id: '20102', name: '김철수' });
  참('빈 기록도 만들어진다', empty.includes('<b>0 / 13</b>') && empty.includes('아직 시작하지 않았어요'));
  const evil = buildReport({ exam: { project: { files: { 'start.py': '</pre><script>alert(1)</script>' } } } }, { id: '1', name: 'x' });
  참('학생 코드 속 태그도 글자 그대로', !evil.includes('<script>alert(1)</script>'));
}
