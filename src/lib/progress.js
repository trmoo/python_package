/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  활동 완료 판정 · 탭 잠금 — 「앞에서부터 끝내지 않은 활동이 있으면 다음 탭으로 넘어갈 수 없다」 (2026-11-05 사용자 지시)
 *  화면마다 무엇을 하면 「완료」 인지를 한곳에 모아 둔다. 탭 잠금·알약의 ✔·활동 기록 HTML 이 모두 이것을 쓴다.
 *  ⚠ node 로 불러다 시험하므로 DOM 을 만지지 말 것. S 는 store.js 의 기록 묶음(그대로 넘겨받는다).
 */
import { SORT_CARDS, ANATOMY, LEVELS } from '../data/concept.js';
import { FIXES, QUIZ } from '../data/imports.js';

export const TAB_ORDER = ['concept', 'import', 'build', 'assess'];

/**
 * 화면 열쇠('탭/화면') → { title, how(완료 조건 설명), optional?, done(S) }
 * optional 은 잠금에 쓰지 않는다 — ⭐ 심화(미션 4)는 빨리 끝낸 학생용이라 막지 않는다.
 * 설명만 읽는 화면(평가 기준·VS Code 따라 하기)은 여기에 없다.
 */
export const ACTIVITIES = {
  'concept/why': { title: '왜 파일을 나눌까?', how: '방법 A·B 에서 각각 🐞 고치기 단추를 눌러 결과를 견줘 보기',
    done: (S) => !!(S.why && S.why.copy && S.why.mod) },
  'concept/layers': { title: '모듈 ⊂ 패키지 ⊂ 라이브러리', how: `라이브러리·패키지·모듈·이름 ${LEVELS.length}가지를 모두 눌러 보기`,
    done: (S) => !!(S.layers && LEVELS.every((l) => S.layers.seen && S.layers.seen.includes(l.id))) },
  'concept/sort': { title: '분류해 보기', how: `카드 ${SORT_CARDS.length}장을 모두 바르게 넣고 채점`,
    done: (S) => !!(S.sort && S.sort.graded && SORT_CARDS.every((c) => S.sort.put[c.id] === c.ans)) },
  'concept/anatomy': { title: 'import 문 읽기', how: `${ANATOMY.length}문항 모두 맞히기`,
    done: (S) => !!(S.anatomy && ANATOMY.every((a, i) => S.anatomy[i] === a.ans)) },
  'concept/where': { title: '모듈은 어디서 올까? (pip)', how: 'pip install gtts 로 설치하고 main.py 를 실행해 hello.mp3 만들기',
    done: (S) => !!(S.pip && S.pip.ok) },
  'import/forms': { title: 'import 세 가지 꼴', how: '9칸을 모두 예측하고 「실행해서 확인」',
    done: (S) => !!(S.forms && S.forms.shown) },
  'import/pkgforms': { title: '패키지 속 모듈 부르기', how: '12칸을 모두 예측하고 「실행해서 확인」',
    done: (S) => !!(S.pkgforms && S.pkgforms.shown) },
  'import/fix': { title: '오류 고치기', how: `${FIXES.length}가지를 모두 고치기`,
    done: (S) => !!(S.fix && FIXES.every((f) => S.fix.done && S.fix.done[f.id])) },
  'import/quiz': { title: '확인 문제', how: `${QUIZ.length}문항 모두 맞히기`,
    done: (S) => !!(S.quiz && QUIZ.every((q, k) => S.quiz.ans && S.quiz.ans[k] === q.ans)) },
  'build/m1': { title: '미션 1 · 첫 모듈 만들기', how: '체크리스트를 모두 채우기', done: (S) => !!(S['mission:m1'] && S['mission:m1'].done) },
  'build/m2': { title: '미션 2 · 패키지로 묶기', how: '체크리스트를 모두 채우기', done: (S) => !!(S['mission:m2'] && S['mission:m2'].done) },
  'build/m3': { title: '미션 3 · 모듈 하나 더, import 두 가지 꼴', how: '체크리스트를 모두 채우기', done: (S) => !!(S['mission:m3'] && S['mission:m3'].done) },
  'build/m4': { title: '미션 4 · ⭐ 심화', how: '체크리스트를 모두 채우기 (선택)', optional: true, done: (S) => !!(S['mission:m4'] && S['mission:m4'].done) },
  'assess/practice': { title: '연습 과제 · 조건 점검기', how: '조건 여섯 가지를 모두 ✅ (5점 수준)', done: (S) => !!(S.practice && S.practice.passed) },
};

export const isDone = (key, S) => !!(ACTIVITIES[key] && ACTIVITIES[key].done(S));

/** 이 탭을 열려면 먼저 끝내야 할 활동들 (앞 탭들의 필수 활동 가운데 안 끝낸 것) — 비어 있으면 열린다 */
export function blockers(tab, S) {
  if (S.unlock) return [];
  const before = TAB_ORDER.slice(0, TAB_ORDER.indexOf(tab));
  return Object.entries(ACTIVITIES)
    .filter(([key, a]) => before.includes(key.split('/')[0]) && !a.optional && !a.done(S))
    .map(([key, a]) => ({ key, title: a.title, how: a.how }));
}

/** 진행 정도 — 필수 활동 가운데 끝낸 수 */
export function progressOf(S) {
  const req = Object.entries(ACTIVITIES).filter(([, a]) => !a.optional);
  return { done: req.filter(([, a]) => a.done(S)).length, total: req.length };
}

/** 선생님이 수업 시연용으로 모든 탭을 여는 코드 (부정행위 방지가 아니라 학습 장치 — 화면 코드에 그대로 보인다) */
export const TEACHER_CODE = '1105';
