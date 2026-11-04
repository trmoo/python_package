/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ④ 수행평가 준비 — 자료.
 *  문항은 선생님이 주신 것을 그대로 옮겼다(2026-11-05, 「1. IDLE·압축 제출 5점 / 2. 사용자 정의 패키지 제작 10점」).
 *  2026-11-04 의 「조건 여섯 가지 + 5단계 루브릭(5점)」 은 이 문항으로 바꾸면서 뺐다.
 *  앱이 확인하는 조건은 lib/checker.js 의 CONDITIONS · SPEC.
 *  ⚠ 정답 코드(start.py 의 답)는 두지 않는다 — 앱 번들에 들어가 학생이 읽을 수 있다.
 *  ⚠ node 로 불러다 시험하므로 DOM 을 만들지 말 것.
 */
import { SPEC } from '../lib/checker.js';

/** 문항 — 화면에 그대로 싣는다 */
export const QUESTION = {
  title: '모듈과 패키지',
  lead: '제시된 조건에 따른 프로그래밍 코드를 작성하여 제출하시오.',
  parts: [
    {
      no: 1, points: 5, title: 'IDLE 프로그램 사용 환경',
      lines: ['IDLE 프로그램 사용 환경을 설정하고, 작성된 소스 코드의 모든 파일은 하나의 파일로 압축해서 제출합니다.',
        '압축 파일명 예: <b>모듈패키지30101홍길동.zip</b> 와 같은 형식으로 저장하여 제출합니다.'],
    },
    {
      no: 2, points: 10, title: '사용자 정의 패키지 제작',
      lines: ['<b>다운로드</b> 폴더에 <code>foods</code> 폴더를 만들고, <code>foods</code> 하위에 <code>drinks</code>, <code>fruits</code> 폴더를 만든다.',
        ...SPEC.map((s) => `<code>${s.sub}</code> 폴더에 ${s.mods.map(([m]) => `<code>${m}.py</code>`).join(', ')} 파일을 생성한다. 각각의 파일은 사용자 정의 함수(함수명 <code>${s.fn}</code>)를 사용하며, 각각 아래와 같이 출력하도록 프로그래밍한다.`),
        '<b>다운로드</b> 폴더에 <code>start.py</code> 파일을 만들고, 위 패키지를 import 하고, 함수 호출로 결과를 아래와 같이 출력하도록 프로그래밍한다.'],
    },
  ],
};

/** 완성했을 때의 폴더 모습 — 문항에 적힌 것을 그림으로 옮긴 것 (코드는 없다) */
export const GOAL_TREE = [
  ['d', '다운로드/', '실제 경로 C:\\Users\\(내 이름)\\Downloads'],
  ['f', '├── start.py', 'foods 와 나란히'],
  ['d', '└── foods/', ''],
  ['d', '    ├── drinks/', 'def drink( )'],
  ...SPEC[0].mods.map(([m, t], i, a) => ['f', `    │   ${i === a.length - 1 ? '└──' : '├──'} ${m}.py`, t]),
  ['d', '    └── fruits/', 'def eat( )'],
  ...SPEC[1].mods.map(([m, t], i, a) => ['f', `        ${i === a.length - 1 ? '└──' : '├──'} ${m}.py`, t]),
];

/** 연습 과제의 처음 모습 — 다운로드 폴더에 빈 start.py 하나 */
export const PRACTICE_START = {
  files: { 'start.py': '# start.py — 다운로드 폴더(맨 위)에 둡니다.\n# foods 패키지를 import 하고, 함수를 불러 여섯 줄을 출력해 보세요.\n' },
  dirs: [],
};
