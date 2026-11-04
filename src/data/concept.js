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
  { id: 'pandas', nm: 'pandas', ctx: 'pip install pandas · 안에 core/ · io/ 등 여러 폴더', ans: 'lib',
    why: '여러 패키지(core/ · io/ …)와 모듈을 묶어 내놓은 꾸러미 — 라이브러리예요.' },
  { id: 'pyplot', nm: 'pyplot', ctx: 'from matplotlib import pyplot', ans: 'mod',
    why: 'matplotlib 라이브러리 폴더 안의 pyplot.py 파일 — 모듈이에요. (교과서 143쪽)' },
  { id: 'module1', nm: 'module1.py', ctx: 'mypackage 폴더 안의 파일', ans: 'mod',
    why: '패키지 안에 들어 있어도 파일 하나는 모듈이에요.' },
  { id: 'add', nm: 'add', ctx: 'calc.py 안의 def add(a, b):', ans: 'fn',
    why: '모듈 안에 정의한 함수 — 모듈 안의 이름이에요. calc.add( ) 로 불러요.' },
  { id: 'randint', nm: 'randint', ctx: 'from random import randint', ans: 'fn',
    why: 'random 모듈 안에 들어 있는 함수예요. from 으로 「이름」 을 꺼내 온 거예요.' },
  { id: 'random', nm: 'random', ctx: 'import random — 설치 없이 바로', ans: 'mod',
    why: '파이썬에 딸려 오는 random.py 파일 하나 — 모듈이에요. (표준 라이브러리 안의 모듈)' },
  { id: 'io', nm: 'io/', ctx: 'pandas 폴더 안 · __init__.py · parsers/ …', ans: 'pkg',
    why: '라이브러리 안에 든 폴더 + __init__.py — 패키지예요. 그 안에 또 parsers/ 같은 하위 패키지가 있어요.' },
  { id: 'pi', nm: 'pi', ctx: 'math.pi → 3.141592…', ans: 'fn',
    why: 'math 모듈 안에 담긴 변수 — 모듈 안의 이름이에요.' },
];

/* ── 4. import 문 읽기 — 밑줄 친 것은 무엇일까 ── */
// parts: 문장을 조각으로. mark 가 붙은 조각이 물어보는 곳.
export const ROLES = [
  { id: 'lib', label: '📚 라이브러리' }, { id: 'pkg', label: '📦 패키지' }, { id: 'mod', label: '📄 모듈' },
  { id: 'fn', label: 'ƒ 함수·클래스' }, { id: 'as', label: '🏷 별명' },
];
export const ANATOMY = [
  { parts: ['import ', { t: 'math', mark: true }], ans: 'mod',
    why: 'math 는 파이썬 안에 들어 있는 모듈이에요. 이제 math.sqrt(16) 처럼 「모듈.함수」 로 써요.' },
  { parts: ['from ', { t: 'matplotlib', mark: true }, ' import pyplot'], ans: 'lib',
    why: 'matplotlib 은 그래프를 그리는 라이브러리예요 (교과서 143쪽). 그 안에서 pyplot 모듈만 꺼내 와요.' },
  { parts: ['from matplotlib import ', { t: 'pyplot', mark: true }], ans: 'mod',
    why: 'pyplot 은 matplotlib 안의 pyplot.py — 모듈이에요. 이제 pyplot.plot( ) 처럼 써요.' },
  { parts: ['from random import ', { t: 'randint', mark: true }], ans: 'fn',
    why: 'randint 는 random 모듈 안의 함수예요. from 으로 꺼내 왔으니 앞에 random. 없이 randint(1, 6) 으로 바로 써요.' },
  { parts: ['import tkinter as ', { t: 'tk', mark: true }], ans: 'as',
    why: 'as 뒤는 별명이에요 (교과서 214쪽). 이제부터 tkinter 대신 tk 로 불러요 — tk.Tk( ).' },
  { parts: ['from pandas.', { t: 'plotting', mark: true }, ' import scatter_matrix'], ans: 'pkg',
    why: 'pandas 폴더 안의 plotting/ 폴더(__init__.py 있음) — 패키지예요. 그 안에서 scatter_matrix 함수를 꺼내 와요.' },
  { parts: ['from mypackage.module1 import ', { t: 'hello', mark: true }], ans: 'fn',
    why: 'hello 는 module1.py 안의 함수예요. 이제 hello( ) 로 바로 불러요.' },
  { parts: ['import mypackage.', { t: 'module2', mark: true }], ans: 'mod',
    why: '점(.)은 「폴더 안으로 들어간다」 는 뜻 — mypackage 폴더 안의 module2.py 모듈이에요. mypackage.module2.함수( ) 로 불러요.' },
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
