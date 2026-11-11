/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ④ 수행평가 준비 — 자료.
 *  2026-11-11 사용자 지시 「5점짜리 수행평가로 훨씬 더 간단한 미션으로 간소화」 — foods 패키지 하나에 모듈 둘 + start.py.
 *  1번(IDLE·압축 제출) 1점 + 2번(사용자 정의 패키지 제작) 4점 = 5점. 2번의 4점은 조건 점검기의 칸 네 개와 하나씩 맞는다.
 *  (2026-11-05 의 「1. IDLE 5점 / 2. foods ⊃ drinks · fruits, 모듈 여섯 개 10점」 은 이 문항으로 바꾸면서 뺐다)
 *  앱이 확인하는 조건은 lib/checker.js 의 CONDITIONS · MODULES.
 *  ⚠ 정답 코드(start.py 의 답)는 두지 않는다 — 앱 번들에 들어가 학생이 읽을 수 있다.
 *  ⚠ node 로 불러다 시험하므로 DOM 을 만들지 말 것.
 */
import { MODULES, CONDITIONS, PKG, EXPECTED } from '../lib/checker.js';

const files = MODULES.map((m) => `<code>${m.mod}.py</code>`).join(', ');

/** 문항 — 화면에 그대로 싣는다. 줄이 { html, outs } 이면 그 아래에 「파일 → 출력」 을 함께 보여 준다 */
export const QUESTION = {
  title: '모듈과 패키지',
  lead: '제시된 조건에 따른 프로그래밍 코드를 작성하여 제출하시오.',
  points: 5,
  parts: [
    {
      no: 1, points: 1, title: 'IDLE 로 작성하고 압축해서 제출',
      lines: [`IDLE 로 작성한 모든 파일(<code>${PKG}</code> 폴더와 <code>start.py</code>)을 하나의 파일로 압축해서 제출합니다.`,
        '압축 파일명 예: <b>모듈패키지30101홍길동.zip</b> 와 같은 형식으로 저장하여 제출합니다.'],
    },
    {
      no: 2, points: 4, title: '사용자 정의 패키지 제작',
      lines: [`<b>다운로드</b> 폴더에 <code>${PKG}</code> 폴더를 만들고, 그 안에 ${files} 파일을 생성한다.`,
        { html: `각 파일에는 사용자 정의 함수(${MODULES.map((m) => `<code>${m.mod}.py</code> → <code>${m.fn}</code>`).join(' · ')})를 만들어, 각각 아래와 같이 출력하도록 프로그래밍한다.`,
          outs: MODULES.map((m) => [`${m.mod}.py`, m.text]) },
        { html: `<b>다운로드</b> 폴더에 <code>start.py</code> 파일을 만들고, <code>${PKG}</code> 패키지를 import 하여 두 함수를 호출해 결과를 아래와 같이 출력하도록 프로그래밍한다.`,
          run: EXPECTED }],   // 「아래와 같이」 — start.py 를 실행했을 때의 두 줄을 바로 아래에 보여 준다 (2026-11-11 사용자 지적)
    },
  ],
};

/** 채점 기준 — 칸 하나에 1점. 2번의 네 칸은 조건 점검기의 칸과 글자까지 같다 */
export const RUBRIC = [
  { no: 1, what: `IDLE 로 작성해 ${PKG} 폴더와 start.py 를 함께 압축 · 파일 이름 형식(모듈패키지 + 학번 + 이름)` },
  ...CONDITIONS.map((c) => ({ no: 2, what: c.title })),
].map((x) => ({ ...x, points: 1 }));

/** 완성했을 때의 폴더 모습 — 문항에 적힌 것을 그림으로 옮긴 것 (코드는 없다) */
export const GOAL_TREE = [
  ['d', '다운로드/', '실제 경로 C:\\Users\\(내 이름)\\Downloads'],
  ['f', '├── start.py', `${PKG} 와 나란히`],
  ['d', `└── ${PKG}/`, ''],
  ...MODULES.map((m, i, a) => ['f', `    ${i === a.length - 1 ? '└──' : '├──'} ${m.mod}.py`, `def ${m.fn}( )`]),
];

/** 연습 과제의 처음 모습 — 다운로드 폴더에 빈 start.py 하나 */
export const PRACTICE_START = {
  files: { 'start.py': `# start.py — 다운로드 폴더(맨 위)에 둡니다.\n# ${PKG} 패키지를 import 하고, 함수를 불러 두 줄을 출력해 보세요.\n` },
  dirs: [],
};
