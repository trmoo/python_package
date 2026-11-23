/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  활동 완료 판정 · 옛 기록 옮기기 · 복수 정답.
 *  (탭 잠금과 활동 기록 HTML 은 2026-11-23 에 없앴다 — 💾 저장은 test/savefile.test.mjs)
 */
import { 묶음, 확인, 참 } from './harness.mjs';
import { ACTIVITIES, progressOf, isDone } from '../src/lib/progress.js';
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

묶음('활동 완료 판정');
{
  참('예전 mytools 연습을 통과한 기록(practice)으로는 ④ 연습 과제가 끝난 것이 아니다', !isDone('assess/practice', { practice: { passed: true } }));
  참('다 끝낸 기록에서는 필수 활동이 모두 끝', Object.entries(ACTIVITIES).filter(([, a]) => !a.optional).every(([k]) => isDone(k, fullState())));
  const S = fullState(); delete S.quiz;
  참('확인 문제 기록이 없으면 확인 문제만 아직', !isDone('import/quiz', S) && isDone('import/fix', S));
  const half = fullState(); half.sort.put.pyplot = 'lib';
  참('분류 카드 하나만 틀려도 분류해 보기는 아직', !isDone('concept/sort', half));
  확인('진행 정도', [progressOf({}).done, progressOf(fullState()).done, progressOf(fullState()).total], [0, 13, 13]);
  확인('필수가 아닌 활동 — ⭐ 미션 4 · ⭐ 내 꾸러미도 pip 로', Object.entries(ACTIVITIES).filter(([, a]) => a.optional).map(([k]) => k).sort(), ['build/m4', 'concept/publish']);
  for (const key of Object.keys(ACTIVITIES)) 참(`「${key}」 는 실재하는 탭에 있다`, ['concept', 'import', 'build', 'assess'].includes(key.split('/')[0]));
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
  참('옮기지 않으면 — 다 맞혔던 옛 기록이 「아직」 이 된다(옮기기가 왜 필요한지)', !isDone('import/quiz', old()));
  const moved = migrate(old());
  확인('옛 8문항을 다 맞힌 기록 → 새 5문항도 다 맞힘', QUIZ.map((q, k) => moved.quiz.ans[k] === q.ans), [true, true, true, true, true]);
  확인('빠진 문항(옛 3·6·8번)의 답은 버린다', Object.keys(moved.quiz.ans), ['0', '1', '2', '3', '4']);
  확인('보던 문항(옛 8번)이 빠졌으면 마지막 문항으로', moved.quiz.cur, 4);
  확인('옮긴 기록에는 판 표시가 붙는다', moved.quiz.v, QUIZ_V);
  참('확인 문제가 끝난 그대로', isDone('import/quiz', moved));
  const once = migrate(JSON.parse(JSON.stringify(moved)));
  확인('두 번 옮기지 않는다(판 표시가 있으면 그대로)', once.quiz, moved.quiz);
  확인('옛 4번 답만 있던 기록 → 새 3번 답', migrate({ quiz: { ans: { 3: 1 }, cur: 3 } }).quiz, { ans: { 2: 1 }, cur: 2, v: QUIZ_V });
  확인('확인 문제 기록이 없으면 손대지 않는다', migrate({ why: { copy: true } }), { why: { copy: true } });
  확인('옛 「선생님 코드로 모두 열기」 표시는 걷어 낸다(탭 잠금을 없앴다)', migrate({ unlock: true, why: { copy: true } }), { why: { copy: true } });
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
  // 다른 이름을 골라도 활동이 끝난다 (알약의 ✔)
  const S = fullState();
  S.sort.put.random = 'lib'; S.sort.put.pandas = 'pkg';
  S.anatomy[ANATOMY.indexOf(ana('math'))] = 'lib'; S.anatomy[ANATOMY.indexOf(ana('matplotlib'))] = 'pkg';
  참('다른 이름으로 넣어도 분류해 보기가 끝난다', isDone('concept/sort', S));
  참('다른 이름으로 골라도 import 문 읽기가 끝난다', isDone('concept/anatomy', S));
}
