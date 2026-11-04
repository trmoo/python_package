/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ④ 수행평가 준비 — 자료.
 *  평가 기준표는 선생님이 주신 것을 그대로 옮겼다(2026-11-04). 조건 여섯 가지는 lib/checker.js 의 CONDITIONS.
 *  ⚠ node 로 불러다 시험하므로 DOM 을 만들지 말 것.
 */

export const RUBRIC = {
  title: '사용자 정의 패키지 제작 (5점)',
  rows: [
    [5, '조건을 모두 준수하여 패키지를 제작하고, 모듈을 올바르게 실행시킴.'],
    [4, '조건을 모두 준수하여 패키지를 제작하였으나, 모듈을 부분적으로 올바르게 실행시킴.'],
    [3, '조건을 부분적으로 준수하여 패키지를 제작함.'],
    [2, '폴더 및 파일 생성을 시도함.'],
    [1, '패키지 제작을 시도하지 않음.'],
  ],
};

/** 조건을 다 지킨 예 (이 앱의 미션 3 답과 같은 꼴) */
export const EXAMPLE_TREE = [
  ['d', '내프로젝트/', ''],
  ['f', '├── main.py', '④ 여기서 실행'],
  ['d', '└── mytools/', '① 패키지'],
  ['i', '    ├── __init__.py', '② 표지판'],
  ['f', '    ├── greet.py', '③ def hello'],
  ['f', '    └── calc.py', '③ def add'],
];
export const EXAMPLE_MAIN = 'from mytools import greet     # ⑤\nfrom mytools.calc import add  # ⑤\n\ngreet.hello("민지")           # ⑥\nprint("2 + 3 =", add(2, 3))   # ⑥';

/** 연습 주제 — 코드는 주지 않고 「무엇을 나눌지」 만 귀띔한다 */
export const TOPICS = [
  { icon: '🍚', name: '급식 도우미', pkg: 'lunch', mods: ['menu.py — 요일별 메뉴 알려 주기', 'kcal.py — 칼로리 더하기'], note: '교과서 144쪽 「급식 메뉴 알림」 을 떠올려 보세요.' },
  { icon: '🎲', name: '게임 도우미', pkg: 'gametools', mods: ['dice.py — 주사위 굴리기 (random)', 'score.py — 점수 더하기·등급 매기기'], note: '⚠ 파일 이름을 random.py 로 지으면 파이썬의 random 이 가려져요!' },
  { icon: '🧮', name: '계산 도우미', pkg: 'mathtools', mods: ['shape.py — 넓이·둘레', 'convert.py — 단위 바꾸기 (cm ↔ m)'], note: '⚠ 패키지 이름을 math 로 지으면 내장 모듈 math 에 가려져요.' },
];

export const PRACTICE_START = {
  files: { 'main.py': '# 수행평가 연습 — 조건 여섯 가지를 모두 채워 보세요.\n# 왼쪽 「조건 점검기」 가 실시간으로 알려 줍니다.\n' },
  dirs: [],
};
