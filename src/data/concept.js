/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ① 개념 잡기 — 자료.
 *  범위: 「프로그래밍」(씨마스) 교과서 141쪽 「모듈 사용 방법」 · 143쪽 「정보 더하기 — 모듈, 패키지, 라이브러리」 ·
 *        209쪽 「모듈과 패키지」 Tip. 교과서 문장을 옮기지 않고 같은 내용을 새로 썼다.
 *  ⚠ node 로 불러다 시험하므로 DOM 을 만들지 말 것.
 */

/* ── 1. 왜 나눌까 — 같은 함수를 두 프로그램에서 쓰기 ── */
// 평균을 내는 함수에 「언제나 3으로 나누는」 실수가 숨어 있다. 점수가 4개면 틀린 값이 나온다.
export const WHY = {
  buggy: 'def 평균(점수들):\n    return sum(점수들) / 3',
  fixed: 'def 평균(점수들):\n    return sum(점수들) / len(점수들)',
  mine: { title: '내 프로그램 — 우리 반 성적', call: '평균([80, 90, 70, 100])' },
  friend: { title: '친구 프로그램 — 동아리 출석 점수', call: '평균([10, 8, 9, 7])' },
};

/* ── 2. 모듈 ⊂ 패키지 ⊂ 라이브러리 ── */
export const LEVELS = [
  { id: 'lib', icon: '📚', name: '라이브러리', en: 'library', cls: 'c-lib',
    def: '여러 패키지와 모듈을 모아 놓은 것. 남이 쓰라고 묶어 내놓은 「코드 꾸러미」 를 부르는 말이다.',
    ex: 'pandas · numpy · gtts — pip 로 설치 (코랩에는 pandas·numpy 가 미리 깔려 있다)' },
  { id: 'pkg', icon: '📦', name: '패키지', en: 'package', cls: 'c-pkg',
    def: '모듈들을 모아 체계적으로 관리하는 폴더. 안에 __init__.py 를 두어 「이 폴더는 패키지」 라고 밝힌다. 패키지 안에 또 패키지(하위 패키지)를 둘 수도 있다.',
    ex: 'pandas 안의 core/ · io/ (io/ 안에 또 parsers/) · 내가 만든 mypackage/' },
  { id: 'mod', icon: '📄', name: '모듈', en: 'module', cls: 'c-mod',
    def: '변수·함수(·클래스)를 담아 둔 .py 파일 하나. 특정 기능을 하는 코드의 묶음이다.',
    ex: 'pandas 의 frame.py · readers.py · random.py · 내가 만든 calc.py' },
  { id: 'fn', icon: 'ƒ', name: '모듈 안의 이름', en: 'name', cls: 'c-nm',
    def: '모듈 안에 들어 있는 함수·클래스·변수. import 로 불러와 「모듈.이름」 으로 쓴다.',
    ex: 'pd.read_csv( ) · pd.DataFrame · random.randint( ) · math.pi' },
];

/** __init__.py 설명 카드 (2026-11-05 사용자 요청) — 「꼭 있어야 하는 부품」이 아니라 「표지판」 으로 가르친다.
 *  pandas/__init__.py 의 두 줄은 설치된 pandas 3.0.5 에서 확인했다(58·151행의 괄호 목록을 간추림).
 *  pd.io.parsers.readers.read_csv is pd.read_csv → True */
export const INIT_INFO = {
  sub: '패키지의 표지판 · 안내 데스크',
  points: [
    ['🪧 표지판', '폴더 안에 이 파일이 있으면 「이 폴더는 패키지예요」 하고 알려요.'],
    ['🚪 먼저 실행', 'import pandas 를 하면 pandas/__init__.py 가 먼저 한 번 실행돼요.'],
    ['📭 비워 둬도 돼요', '내가 만드는 패키지는 빈 파일 하나면 충분해요.'],
    ['🛎️ 안내 데스크', '깊숙한 곳의 이름을 여기서 미리 불러 두면 짧게 부를 수 있어요.'],
  ],
  code: '# pandas/__init__.py 안 (간추림)\nfrom pandas.core.api import DataFrame\nfrom pandas.io.api import read_csv',
  long: 'pd.io.parsers.readers.read_csv( )',
  short: 'pd.read_csv( )',
  note: '파이썬 3.3 부터는 없어도 import 는 되지만, 넣어 두는 것이 약속이에요. 미션 4 에서 직접 만들어 봐요.',
};

/** pandas — 데이터 과학 수업에서 써 본 라이브러리로 짜임을 보여 준다 (2026-11-05 사용자 요청)
 *  설치된 pandas 3.0.5 를 열어 확인했다 (2.x 도 같은 짜임):
 *    pandas/__init__.py · core/frame.py(class DataFrame) · core/series.py(class Series)
 *    io/parsers/readers.py(def read_csv) · io/excel/_base.py(def read_excel)
 *  pd.read_csv 처럼 「pd.」 바로 뒤에 쓸 수 있는 것은 pandas/__init__.py 가 io.api 를 거쳐 미리 불러 두기 때문이다.
 *  kind: lib(맨 위) · pkg(폴더, __init__.py 를 함께 그린다) · mod(.py 파일) — kids 로 아래층을 담는다 */
export const PANDAS = {
  kind: 'lib', name: 'pandas/', note: '데이터 분석 라이브러리 · pip install pandas',
  init: 'pd.read_csv 처럼 바로 쓰게 미리 불러 둔다',
  kids: [
    { kind: 'pkg', name: 'core/', note: '표·열 같은 핵심 자료', kids: [
      { kind: 'mod', name: 'frame.py', fns: ['DataFrame'] },
      { kind: 'mod', name: 'series.py', fns: ['Series'] }] },
    { kind: 'pkg', name: 'io/', note: '파일 읽기·쓰기 — 안에 하위 패키지', kids: [
      { kind: 'pkg', name: 'parsers/', kids: [{ kind: 'mod', name: 'readers.py', fns: ['read_csv( )'] }] }] },
  ],
};

/** 폴더 나무 그림 (2026-11-05 사용자 요청 — 미션 화면의 mypackage/ 그림과 같은 꼴로 pandas·NumPy 도 보여 준다)
 *  상자 그림과 같은 자료(PANDAS · NUMPY_BOOK)에서 줄을 뽑으므로 두 그림이 어긋날 수 없다.
 *  돌려주는 줄: [갈래 d·i·f, 나무 글자, # 설명, 누르면 켜질 개념(lib·pkg·init·mod)]
 *  ⚠ 설명 칸을 빈칸으로 맞추지 않는다 — │├└─ 가 글꼴에 따라 한 칸 너비가 아니라 줄마다 어긋난다. 화면이 두 칸 격자로 맞춘다 */
export function treeLines(root) {
  const sig = (f) => (f.endsWith('( )') ? `def ${f.replace('( )', '()')}` : `class ${f}`);
  const rows = [['d', root.name, root.note || '', 'lib']];
  const walk = (n, prefix) => {
    const kids = [];
    if (n.kind === 'pkg' || n.init) kids.push({ kind: 'init', note: n.kind === 'lib' ? n.init : '' });
    kids.push(...(n.kids || []));
    kids.forEach((k, i) => {
      const last = i === kids.length - 1;
      const branch = prefix + (last ? '└── ' : '├── ');
      if (k.kind === 'init') rows.push(['i', `${branch}__init__.py`, k.note, 'init']);
      else if (k.kind === 'mod') rows.push(['f', branch + k.name, k.fns.map(sig).join(' · '), 'mod']);
      else { rows.push(['d', branch + k.name, k.note || '', 'pkg']); walk(k, prefix + (last ? '    ' : '│   ')); }
    });
  };
  walk(root, '');
  return rows;
}

/** 교과서 143쪽 그림의 NumPy 를 PANDAS 와 같은 꼴로 (폴더 나무 그림용) */
export const numpyBookAsNode = () => ({
  kind: 'lib', name: NUMPY_BOOK.name, note: '교과서 그림 · pip install numpy',
  kids: NUMPY_BOOK.pkgs.map((pk) => ({ kind: 'pkg', name: pk.name, note: pk.note, kids: pk.mods.map((m) => ({ kind: 'mod', ...m })) })),
});

/** 교과서 143쪽 그림의 NumPy (구조를 보여 주려는 예시) */
export const NUMPY_BOOK = {
  name: 'NumPy/',
  pkgs: [
    { name: 'core/', note: '배열 처리', mods: [{ name: 'array.py', fns: ['array( )'] }] },
    { name: 'linalg/', note: '선형 대수', mods: [{ name: 'solve.py', fns: ['solve( )'] }] },
    { name: 'random/', note: '난수 생성', mods: [{ name: 'generator.py', fns: ['random( )'] }] },
  ],
};

/* ── 3. 분류해 보기 ── */
export const BINS = [
  { id: 'mod', icon: '📄', name: '모듈', hint: '.py 파일 하나', color: 'var(--mod)' },
  { id: 'pkg', icon: '📦', name: '패키지', hint: '모듈을 담은 폴더', color: 'var(--pkg)' },
  { id: 'lib', icon: '📚', name: '라이브러리', hint: '패키지·모듈 꾸러미', color: 'var(--lib)' },
  { id: 'fn', icon: 'ƒ', name: '모듈 안의 이름', hint: '함수·클래스·변수', color: 'var(--nm)' },
];
export const SORT_CARDS = [
  { id: 'calc', nm: 'calc.py', ctx: 'def add(a, b): 가 들어 있는 파일', ans: 'mod',
    why: '함수를 담아 둔 .py 파일 하나 — 모듈이에요.' },
  { id: 'mypkg', nm: 'mypackage/', ctx: '안에 __init__.py, module1.py, module2.py', ans: 'pkg',
    why: '모듈 파일들을 담은 폴더이고 __init__.py 가 있어요 — 패키지예요.' },
  { id: 'pandas', nm: 'pandas', ctx: 'pip install pandas · 안에 core/ · io/ 등 여러 폴더', ans: 'lib', also: ['pkg'],
    why: '여러 패키지(core/ · io/ …)와 모듈을 묶어 내놓은 꾸러미 — 라이브러리예요.',
    whyAlso: '맨 위 폴더에 __init__.py 가 있어 문법으로는 패키지예요. 큰 꾸러미라 교과서는 라이브러리라고 불러요.' },
  { id: 'pyplot', nm: 'pyplot', ctx: 'from matplotlib import pyplot', ans: 'mod',
    why: 'matplotlib 라이브러리 폴더 안의 pyplot.py 파일 — 모듈이에요. (교과서 143쪽)' },
  { id: 'module1', nm: 'module1.py', ctx: 'mypackage 폴더 안의 파일', ans: 'mod',
    why: '패키지 안에 들어 있어도 파일 하나는 모듈이에요.' },
  { id: 'add', nm: 'add', ctx: 'calc.py 안의 def add(a, b):', ans: 'fn',
    why: '모듈 안에 정의한 함수 — 모듈 안의 이름이에요. calc.add( ) 로 불러요.' },
  { id: 'randint', nm: 'randint', ctx: 'from random import randint', ans: 'fn',
    why: 'random 모듈 안에 들어 있는 함수예요. from 으로 「이름」 을 꺼내 온 거예요.' },
  { id: 'random', nm: 'random', ctx: 'import random — 설치 없이 바로', ans: 'mod', also: ['lib'],
    why: '파이썬에 딸려 오는 random.py 파일 하나 — 모듈이에요. (표준 라이브러리 안의 모듈)',
    whyAlso: '파이썬에 딸려 오는 표준 라이브러리라 「random 라이브러리」 라고도 불러요. 파일로 보면 random.py 하나 — 모듈이에요.' },
  { id: 'io', nm: 'io/', ctx: 'pandas 폴더 안 · __init__.py · parsers/ …', ans: 'pkg',
    why: '라이브러리 안에 든 폴더 + __init__.py — 패키지예요. 그 안에 또 parsers/ 같은 하위 패키지가 있어요.' },
  { id: 'pi', nm: 'pi', ctx: 'math.pi → 3.141592…', ans: 'fn',
    why: 'math 모듈 안에 담긴 변수 — 모듈 안의 이름이에요.' },
];

/* ── 4. import 문 읽기 — 밑줄 친 것은 무엇일까 ── */
// parts: 문장을 조각으로. mark 가 붙은 조각이 물어보는 곳.
/** import 문 읽기 — 문항마다 💡 힌트 그림 (2026-11-05 사용자 요청 「힌트는 mypackage/ 같은 그림으로」).
 *  줄: [갈래, 나무 글자, # 설명, 노랗게 칠할 줄인가]
 *  갈래 — r 묶음 이름 · d 폴더 · i __init__.py · f 파일 · n 파일 안의 이름 · a 별명 · c 줄임
 *  답(라이브러리·패키지·모듈…)을 적지 않고, 이름 끝이 「/ 인가 .py 인가 ( ) 인가」 를 그림에서 스스로 읽게 한다.
 *  2026-11-05 파이썬 3.12.3 에서 확인: math 는 __file__ 이 없는 내장 모듈 · matplotlib 3.11 에 pyplot.py · axes/ 가 있고 .py 가 248개 ·
 *  pandas/plotting/__init__.py 가 _misc.py 의 scatter_matrix 를 꺼내 둔다 · tkinter/__init__.py 에 class Tk · tkinter/ttk.py */
const HINT_MPL = (mark) => [
  ['d', 'matplotlib/', 'pip install matplotlib · .py 파일이 200개 넘게', mark === 'matplotlib'],
  ['i', '├── __init__.py', ''],
  ['f', '├── pyplot.py', 'plot() · bar() · show() …', mark === 'pyplot'],
  ['d', '├── axes/', '폴더 안에 또 폴더'],
  ['c', '└── …', ''],
];
const HINT_MYPKG = (mark) => [
  ['d', 'mypackage/', ''],
  ['i', '├── __init__.py', '빈 파일'],
  ['f', '├── module1.py', ''],
  ['n', '│   └── hello()', '', mark === 'hello'],
  ['f', '└── module2.py', '', mark === 'module2'],
  ['n', '    └── bye()', ''],
];

/** 「분류해 보기」 카드마다 💡 힌트 그림 (2026-11-10 사용자 요청 — 「import 문 읽기」 의 나무 힌트를 여기에도).
 *  꼴은 ANATOMY 의 hint 와 같다 — { ask, tree:[갈래, 나무 글자, # 설명, 칠할 줄인가] }. 노란 줄이 그 카드의 이름이다.
 *  ⚠ 답을 말하지 않는다 — 물음과 # 설명에 정답 바구니 이름(함께 받는 정답 포함)을 쓰지 않는다. 시험이 막는다.
 *  사실은 ANATOMY 힌트와 같은 확인을 따른다(math 는 __file__ 없는 내장 · pandas 3.0.5 의 io/parsers/readers.py). */
export const SORT_HINTS = {
  calc: { ask: 'calc.py 끝에는 .py 가 붙었어요. 폴더(/)일까요, 파일 하나일까요?', tree: [
    ['d', '내프로젝트/', ''],
    ['f', '├── main.py', 'import calc'],
    ['f', '└── calc.py', 'def add(a, b) · def sub(a, b)', true],
  ] },
  mypkg: { ask: 'mypackage 끝에는 / 가 붙었어요. 그 안에 무엇이 들어 있고, __init__.py 는 어떤 표지판이었나요?', tree: [
    ['d', 'mypackage/', '', true],
    ['i', '├── __init__.py', '빈 파일 — 표지판'],
    ['f', '├── module1.py', 'def hello()'],
    ['f', '└── module2.py', 'def bye()'],
  ] },
  pandas: { ask: 'pandas 는 파일 하나일까요? 그 안에 폴더가 몇 겹이나 들어 있나요?', tree: [
    ['d', 'pandas/', 'pip install pandas', true],
    ['i', '├── __init__.py', ''],
    ['d', '├── core/', 'frame.py · series.py …'],
    ['d', '├── io/', ''],
    ['d', '│   └── parsers/', '폴더 안에 또 폴더'],
    ['c', '└── …', '그 밖에도 아주 많음'],
  ] },
  pyplot: { ask: 'pyplot 은 폴더(/)일까요, 파일(.py)일까요?', tree: HINT_MPL('pyplot') },
  module1: { ask: 'module1.py 는 폴더 안에 들어 있어요. 그래도 그 자신은 폴더일까요, 파일 하나일까요?', tree: [
    ['d', 'mypackage/', ''],
    ['i', '├── __init__.py', '빈 파일'],
    ['f', '├── module1.py', 'def hello()', true],
    ['f', '└── module2.py', 'def bye()'],
  ] },
  add: { ask: 'add 는 calc.py 파일 안에 def 로 만든 것이에요. 뒤에 ( ) 를 붙여 부르는 것은 무엇이었나요?', tree: [
    ['f', 'calc.py', ''],
    ['n', '├── add(a, b)', '두 수를 더해 돌려줌', true],
    ['n', '└── sub(a, b)', '두 수를 빼서 돌려줌'],
  ] },
  randint: { ask: 'randint 는 random.py 파일 안에 있어요. 뒤에 ( ) 를 붙여 부르는 것은 무엇이었나요?', tree: [
    ['f', 'random.py', ''],
    ['n', '├── randint(a, b)', 'a 이상 b 이하 정수 하나', true],
    ['n', '├── choice(seq)', '하나 골라 줌'],
    ['n', '└── shuffle(x)', '섞어 줌'],
  ] },
  random: { ask: 'random 은 폴더(/)일까요, 파일(.py)일까요? 설치하지 않아도 바로 쓸 수 있는 까닭은?', tree: [
    ['r', '🐍 파이썬 (설치할 때 함께 들어옴)', ''],
    ['f', '├── random.py', 'randint() · choice()', true],
    ['f', '├── math', 'sqrt() · pi — 파일 없이 파이썬 안에 넣어 둠'],
    ['d', '└── tkinter/', '창 만들기'],
  ] },
  io: { ask: 'io 끝에는 / 가 붙었어요. 그 안에 __init__.py 가 있나요?', tree: [
    ['d', 'pandas/', ''],
    ['i', '├── __init__.py', ''],
    ['d', '└── io/', '', true],
    ['i', '    ├── __init__.py', ''],
    ['d', '    └── parsers/', '폴더 안에 또 폴더'],
    ['f', '        └── readers.py', 'def read_csv()'],
  ] },
  pi: { ask: 'pi 는 math 안에 담긴 값이에요. 폴더도 파일도 아니라면 무엇일까요?', tree: [
    ['f', 'math', '파일 없이 파이썬 안에 넣어 둠'],
    ['n', '├── pi', '3.141592…', true],
    ['n', '└── sqrt(x)', '제곱근'],
  ] },
};

/** 정답인가 — 부르는 관점에 따라 두 이름이 다 맞는 것이 있다 (2026-11-10 사용자 결정 「둘 다 정답으로」).
 *  matplotlib·pandas 는 라이브러리이면서 문법으로는 맨 위 패키지, math·random 같은 표준(내장) 라이브러리는 모듈이면서 라이브러리.
 *  ans 는 교과서가 부르는 이름(대표 정답), also 는 함께 받는 정답, whyAlso 는 also 를 골랐을 때의 풀이다.
 *  분류 카드·import 문 읽기 문항 모두 이것으로 채점한다 — 화면 · 탭 잠금(progress.js) · 활동 기록(report.js) */
export const isAnswer = (item, pick) => pick != null && (pick === item.ans || (item.also || []).includes(pick));
/** 맞힌 답에 붙일 풀이 */
export const whyOf = (item, pick) => (pick !== item.ans && item.whyAlso ? item.whyAlso : item.why);

export const ROLES = [
  { id: 'lib', label: '📚 라이브러리' }, { id: 'pkg', label: '📦 패키지' }, { id: 'mod', label: '📄 모듈' },
  { id: 'fn', label: 'ƒ 함수·클래스' }, { id: 'as', label: '🏷 별명' },
];
export const ANATOMY = [
  { parts: ['import ', { t: 'math', mark: true }], ans: 'mod', also: ['lib'],
    why: 'math 는 파이썬 안에 들어 있는 모듈이에요. 이제 math.sqrt(16) 처럼 「모듈.함수」 로 써요.',
    whyAlso: '파이썬에 딸려 오는 표준 라이브러리라 그렇게도 불러요. 정확히는 모듈 하나 — math.sqrt(16) 처럼 써요.',
    hint: { ask: 'math 는 random.py 와 같은 갈래예요. random.py 는 무엇이었나요?', tree: [
      ['r', '🐍 파이썬 (설치할 때 함께 들어옴)', ''],
      ['f', '├── math', 'sqrt() · pi — 파일 없이 파이썬 안에 넣어 둠', true],
      ['f', '├── random.py', 'randint() · choice()'],
      ['d', '└── tkinter/', '창 만들기'],
    ] } },
  { parts: ['from ', { t: 'matplotlib', mark: true }, ' import pyplot'], ans: 'lib', also: ['pkg'],
    why: 'matplotlib 은 그래프를 그리는 라이브러리예요 (교과서 143쪽). 그 안에서 pyplot 모듈만 꺼내 와요.',
    whyAlso: '맨 위 폴더에 __init__.py 가 있어 문법으로는 패키지예요. 큰 꾸러미라 교과서는 라이브러리라고 불러요.',
    hint: { ask: 'matplotlib 은 파일 하나일까요? 안에 무엇이 얼마나 들어 있나요?', tree: HINT_MPL('matplotlib') } },
  { parts: ['from matplotlib import ', { t: 'pyplot', mark: true }], ans: 'mod',
    why: 'pyplot 은 matplotlib 안의 pyplot.py — 모듈이에요. 이제 pyplot.plot( ) 처럼 써요.',
    hint: { ask: 'pyplot 은 폴더(/)일까요, 파일(.py)일까요?', tree: HINT_MPL('pyplot') } },
  { parts: ['from random import ', { t: 'randint', mark: true }], ans: 'fn',
    why: 'randint 는 random 모듈 안의 함수예요. from 으로 꺼내 왔으니 앞에 random. 없이 randint(1, 6) 으로 바로 써요.',
    hint: { ask: 'randint 는 random.py 파일 안에 있어요. 뒤에 ( ) 를 붙여 부르는 것은 무엇이었나요?', tree: [
      ['f', 'random.py', ''],
      ['n', '├── randint(a, b)', 'a 이상 b 이하 정수 하나', true],
      ['n', '├── choice(seq)', '하나 골라 줌'],
      ['n', '└── shuffle(x)', '섞어 줌'],
    ] } },
  { parts: ['import tkinter as ', { t: 'tk', mark: true }], ans: 'as',
    why: 'as 뒤는 별명이에요 (교과서 214쪽). 이제부터 tkinter 대신 tk 로 불러요 — tk.Tk( ).',
    hint: { ask: '그림 어디에 tk 라는 폴더나 파일이 있나요? 없다면 tk 는 무엇일까요?', tree: [
      ['d', 'tkinter/', '파이썬에 들어 있음 · 창 만들기'],
      ['i', '├── __init__.py', 'Tk · Button · Label 이 여기에'],
      ['f', '└── ttk.py', ''],
      ['a', 'tk', 'import tkinter as tk — 이 파일 안에서만 쓰는 짧은 이름', true],
    ] } },
  { parts: ['from pandas.', { t: 'plotting', mark: true }, ' import scatter_matrix'], ans: 'pkg',
    why: 'pandas 폴더 안의 plotting/ 폴더(__init__.py 있음) — 패키지예요. 그 안에서 scatter_matrix 함수를 꺼내 와요.',
    hint: { ask: 'plotting 끝에는 / 가 붙었나요, .py 가 붙었나요? 그 안에 __init__.py 가 있나요?', tree: [
      ['d', 'pandas/', ''],
      ['i', '├── __init__.py', ''],
      ['d', '└── plotting/', '', true],
      ['i', '    ├── __init__.py', 'scatter_matrix 를 여기서 꺼내 둠'],
      ['f', '    └── _misc.py', 'def scatter_matrix()'],
    ] } },
  { parts: ['from mypackage.module1 import ', { t: 'hello', mark: true }], ans: 'fn',
    why: 'hello 는 module1.py 안의 함수예요. 이제 hello( ) 로 바로 불러요.',
    hint: { ask: 'hello 는 어느 파일 안에 들어 있나요? 끝에 ( ) 가 붙은 것은 무엇이었나요?', tree: HINT_MYPKG('hello') } },
  { parts: ['import mypackage.', { t: 'module2', mark: true }], ans: 'mod',
    why: '점(.)은 「폴더 안으로 들어간다」 는 뜻 — mypackage 폴더 안의 module2.py 모듈이에요. mypackage.module2.함수( ) 로 불러요.',
    hint: { ask: 'module2 끝에는 / 가 붙었나요, .py 가 붙었나요?', tree: HINT_MYPKG('module2') } },
];

/* ── 5. 모듈은 어디서 올까 ── */
export const SOURCES = [
  { icon: '🏠', title: '내가 만든 모듈', color: 'var(--mod)', body: '내 프로젝트 폴더의 .py 파일', ex: 'import calc', how: '파일을 만들기만 하면 된다' },
  { icon: '🐍', title: '표준 라이브러리', color: 'var(--brand)', body: '파이썬을 깔 때 함께 딸려 온다', ex: 'import random · math · tkinter', how: '설치 없이 바로 import' },
  { icon: '🌐', title: '외부 라이브러리', color: 'var(--lib)', body: '다른 사람이 만들어 인터넷에 올려 둔 것', ex: 'gtts · numpy · pandas', how: '터미널에서 pip install 로 먼저 설치' },
];
export const PIP_PROJECT = {
  files: {
    'main.py': '# 교과서 141쪽의 TTS(글자 → 소리) 예제를 VS Code 꼴로 줄였어요\nfrom gtts import gTTS\n\ntts = gTTS("안녕하세요 저는 TTS입니다", lang="ko")\ntts.save("hello.mp3")\nprint("hello.mp3 를 만들었어요")\n',
  },
  dirs: [],
};

/* ── 6. ⭐ 내 꾸러미도 pip 로 나눠 주기 (2026-11-05 사용자 요청 — 「아주 쉽게, 최대한 간단하게」) ──
 *  택배 보내기 비유로 네 걸음: 📦 꾸리기 → 🎁 포장 → 🚚 올리기 → 🙌 친구가 받기.
 *  교과서 밖 내용이라 ⭐ 더 알아보기 — 탭 잠금에 쓰지 않는다(progress.js 의 optional).
 *  2026-11-05 파이썬 3.12.3 · setuptools 83 · build 로 실제로 포장하고 다른 환경에 설치해 확인했다:
 *    hong-mypackage/ (pyproject.toml + mypackage/) → py -m build
 *    → dist/hong_mypackage-0.1.0-py3-none-any.whl · dist/hong_mypackage-0.1.0.tar.gz
 *    → pip install ….whl → 다른 폴더에서 from mypackage.module1 import hello 가 되고, import hong-mypackage 는 SyntaxError.
 *  mypackage 는 ① 분류·import 문 읽기와 ② 불러오기에서 쓰는 그 패키지다(module1.py 는 imports.js 의 MODULE1 과 같다).
 *  ⚠ 바깥 주소(https 로 시작하는 링크)를 적지 말 것 — check:syntax 가 막는다. 사이트 이름은 pypi.org 처럼 글자로만. */
export const PUBLISH = {
  pipName: 'hong-mypackage', // pip install 할 때 쓰는 이름 (이름표의 name)
  importName: 'mypackage', // import 할 때 쓰는 이름 (폴더 이름)
  version: '0.1.0',
  steps: [
    { id: 'pack', icon: '📦', title: '상자 꾸리기', cmd: '이름표 한 장',
      say: '지금까지 만든 패키지 폴더 옆에 <b>이름표 한 장</b>(<code>pyproject.toml</code>)만 더 두면 돼요.',
      tree: [
        ['d', 'hong-mypackage/', '꾸러미 상자'],
        ['f', '├── pyproject.toml', '📛 이름표 — 새로 만드는 파일'],
        ['d', '└── mypackage/', '지금까지 만든 패키지 그대로'],
        ['i', '    ├── __init__.py', ''],
        ['f', '    ├── module1.py', ''],
        ['f', '    └── module2.py', ''],
      ],
      codeTitle: '📛 pyproject.toml — 이름표',
      // 주석 자리를 빈칸으로 맞추지 않는다 — 코드 글꼴의 빈칸 너비가 글자와 달라 줄마다 어긋나 보인다
      code: '[project]\nname = "hong-mypackage"  # pip install 할 때 쓸 이름\nversion = "0.1.0"  # 꾸러미 판 번호',
      more: '맨 위 세 줄은 「무엇으로 포장할지」 예요. 늘 똑같으니 그대로 베껴 쓰면 돼요.',
      full: '[build-system]\nrequires = ["setuptools>=61"]\nbuild-backend = "setuptools.build_meta"\n\n[project]\nname = "hong-mypackage"\nversion = "0.1.0"',
      tips: [
        ['🏷️', '이름은 <b>세상에 하나뿐</b>이어야 해요. 흔한 이름은 이미 있으니 앞에 내 이름을 붙였어요.'],
        ['🔢', '판 번호는 고칠 때마다 <code>0.1.0 → 0.1.1</code> 처럼 올려요.'],
      ] },
    { id: 'build', icon: '🎁', title: '포장하기', cmd: 'py -m build',
      say: '터미널에 <b>명령 한 줄</b>. <code>dist/</code> 폴더에 꾸러미 파일이 생겨요.',
      term: [
        ['cmd', 'py -m pip install build', '처음 한 번만'],
        ['cmd', 'py -m build', ''],
      ],
      tree: [
        ['d', 'hong-mypackage/', ''],
        ['d', '└── dist/', '새로 생긴 폴더'],
        ['f', '    ├── hong_mypackage-0.1.0-py3-none-any.whl', '🎁 pip 가 설치하는 파일'],
        ['f', '    └── hong_mypackage-0.1.0.tar.gz', '원본 묶음'],
      ],
      tips: [
        ['💡', '<code>.whl</code>(휠)은 이름만 다른 <b>압축 파일</b>이에요. 수행평가에서 만드는 zip 과 닮았어요.'],
        ['🔤', '파일 이름에서는 붙임표(-)가 밑줄(_)로 바뀌어요.'],
      ] },
    { id: 'upload', icon: '🚚', title: '올리기', cmd: 'twine upload',
      say: '<b>PyPI</b>(파이파이) — 전 세계 파이썬 꾸러미가 모인 <b>창고</b>에 올려요.',
      list: [
        '<b>pypi.org</b> 에 가입하기',
        '<b>API 토큰</b>(올릴 때 쓰는 열쇠) 받기',
        '터미널에 명령 한 줄 — 토큰을 물으면 붙여 넣기',
      ],
      term: [
        ['cmd', 'py -m pip install twine', '처음 한 번만'],
        ['cmd', 'py -m twine upload dist/*', ''],
      ],
      tips: [
        ['🧪', '처음엔 연습용 창고 <b>test.pypi.org</b> 에 올려 보세요.'],
        ['🔁', '같은 판 번호로는 <b>두 번 못 올려요</b>. 고쳤으면 판 번호부터 올려요.'],
        ['👀', '올리면 <b>누구나</b> 내려받아 코드를 볼 수 있어요.'],
      ] },
    { id: 'get', icon: '🙌', title: '친구가 받기', cmd: 'pip install',
      say: '친구는 <b>명령 한 줄</b>이면 끝! 5번에서 gtts 를 받은 것과 똑같아요.',
      term: [
        ['cmd', 'pip install hong-mypackage', ''],
        ['out', 'Successfully installed hong-mypackage-0.1.0', ''],
      ],
      codeTitle: '📄 친구의 main.py',
      code: 'from mypackage.module1 import hello\nhello()',
      tips: [
        ['📨', 'PyPI 에 안 올려도 돼요. <code>.whl</code> 파일을 직접 건네면 <code>pip install 파일이름.whl</code> 로 설치해요.'],
      ] },
  ],
  /** 확인 문제 — ans 는 정답 칸 번호, why 는 고른 칸마다의 풀이 */
  quiz: [
    { q: '친구가 <code>pip install hong-mypackage</code> 로 설치했어요. 코드에서는 어떻게 불러올까요?',
      choices: ['import hong-mypackage', 'import mypackage.module1', 'import pyproject'], ans: 1,
      why: ['붙임표(-)는 빼기 기호라 이름에 못 써요 → SyntaxError.', '설치 이름과 상관없이 <b>폴더 이름</b>으로 불러요.', 'pyproject.toml 은 이름표일 뿐 모듈이 아니에요.'] },
    { q: 'module1.py 를 고쳐서 다시 올리려고 해요. 이름표에서 무엇을 바꿀까요?',
      choices: ['아무것도 안 바꾸고 그대로 올린다', 'version 을 "0.1.1" 로 올린다', 'name 을 새 이름으로 바꾼다'], ans: 1,
      why: ['같은 판 번호(0.1.0)로는 두 번 올릴 수 없어요.', '판 번호를 올리면 친구는 <code>pip install --upgrade hong-mypackage</code> 로 새 판을 받아요.', '이름을 바꾸면 아예 다른 꾸러미가 되어 친구가 새로 찾아야 해요.'] },
  ],
};
