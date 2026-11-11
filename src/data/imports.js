/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ② 불러오기 — 자료. 예측 표 두 개 · 오류 고치기 여섯 개 · 확인 문제.
 *  예측 표의 「정답」 은 손으로 적지 않는다 — 화면이 진짜로 실행해서 얻는다(시험이 진짜 파이썬과 대조한다).
 *  ⚠ node 로 불러다 시험하므로 DOM 을 만들지 말 것.
 */

export const CALC = 'def add(a, b):\n    return a + b\n\ndef sub(a, b):\n    return a - b\n';
export const MODULE1 = 'def hello():\n    print("안녕! module1 이에요")\n';
export const MODULE2 = 'def bye():\n    print("잘 가! module2 예요")\n';

/* ── 1. import 세 가지 꼴 (모듈 하나) ── */
export const FORMS = {
  files: { 'calc.py': CALC },
  rows: ['import calc', 'from calc import add', 'import calc as c'],
  cols: ['print(calc.add(2, 3))', 'print(add(2, 3))', 'print(c.add(2, 3))'],
  rule: [
    ['import calc', 'calc 라는 이름이 생긴다', 'calc.add(2, 3)'],
    ['from calc import add', 'add 라는 이름이 생긴다 (calc 는 안 생김)', 'add(2, 3)'],
    ['import calc as c', 'c 라는 이름만 생긴다 (calc 는 안 생김)', 'c.add(2, 3)'],
  ],
};

/* ── 2. 패키지 속 모듈 부르기 ── */
export const PKGFORMS = {
  files: { 'mypackage/__init__.py': '', 'mypackage/module1.py': MODULE1, 'mypackage/module2.py': MODULE2 },
  rows: ['import mypackage.module1', 'from mypackage import module1', 'from mypackage.module1 import hello', 'import mypackage'],
  cols: ['mypackage.module1.hello()', 'module1.hello()', 'hello()'],
  rule: [
    ['import mypackage.module1', 'mypackage.module1.hello( )', '전체 경로를 다 적는다'],
    ['from mypackage import module1', 'module1.hello( )', '모듈 이름부터 적는다'],
    ['from mypackage.module1 import hello', 'hello( )', '함수 이름만 적는다'],
  ],
};

/* ── 3. 오류 고치기 ──
 * project: 처음 모습(오류가 난다) · active: 처음 열어 둘 파일
 * goal: main.py 를 실행했을 때 나와야 할 출력 · need: 반드시 불려야 하는 함수(파일·이름) — print(5) 로 때우지 못하게
 * fixed: 고친 모습 하나(시험이 이것으로 「고칠 수 있는 문제인가」 를 확인한다) */
export const FIXES = [
  {
    id: 'typo', title: '이름 오타', icon: '🔤',
    story: '계산 모듈 calc.py 를 불러오려는데 오류가 나요.',
    project: { files: { 'main.py': 'import clac\nprint(clac.add(2, 3))\n', 'calc.py': CALC }, dirs: [] },
    goal: '5', need: { file: 'calc.py', name: 'add' },
    hints: ['오류 문구의 No module named 뒤의 이름을 탐색기의 파일 이름과 견줘 보세요.', 'import 뒤의 이름은 파일 이름에서 .py 만 뺀 것과 똑같아야 해요.', 'clac → calc 로 두 군데(import 줄과 print 줄)를 고치세요.'],
    fixed: { files: { 'main.py': 'import calc\nprint(calc.add(2, 3))\n', 'calc.py': CALC }, dirs: [] },
  },
  {
    id: 'prefix', title: '점 앞의 이름', icon: '🏷',
    story: 'import 는 잘 됐는데 add 를 부르는 줄에서 오류가 나요.',
    project: { files: { 'main.py': 'import calc\nprint(add(2, 3))\n', 'calc.py': CALC }, dirs: [] },
    goal: '5', need: { file: 'calc.py', name: 'add' },
    hints: ['import calc 는 「calc」 라는 이름 하나만 만들어요. add 라는 이름은 아직 없어요.', '방법 ① 부를 때 앞에 모듈 이름을 붙인다. 방법 ② import 줄을 from … import … 꼴로 바꾼다.', 'print(calc.add(2, 3)) 또는 첫 줄을 from calc import add 로.'],
    fixed: { files: { 'main.py': 'from calc import add\nprint(add(2, 3))\n', 'calc.py': CALC }, dirs: [] },
  },
  {
    id: 'dotpy', title: '.py 는 빼고', icon: '✂️',
    story: '파일 이름을 그대로 적었는데 「is not a package」 라고 해요.',
    project: { files: { 'main.py': 'import calc.py\nprint(calc.add(2, 3))\n', 'calc.py': CALC }, dirs: [] },
    goal: '5', need: { file: 'calc.py', name: 'add' },
    hints: ['파이썬에게 점(.)은 「폴더 안으로 들어가라」 는 뜻이에요. calc.py 를 「calc 폴더 안의 py」 로 읽었어요.', 'import 뒤에는 파일 이름에서 .py 를 뺀 「모듈 이름」 만 적어요.', 'import calc'],
    fixed: { files: { 'main.py': 'import calc\nprint(calc.add(2, 3))\n', 'calc.py': CALC }, dirs: [] },
  },
  {
    id: 'hyphen', title: '붙임표(-) 파일 이름', icon: '➖',
    story: '파일 이름을 my-calc.py 로 지었더니 import 줄부터 문법 오류예요.',
    project: { files: { 'main.py': 'import my-calc\nprint(my-calc.add(2, 3))\n', 'my-calc.py': CALC }, dirs: [] },
    goal: '5', need: { name: 'add' },
    hints: ['파이썬은 my-calc 를 「my 빼기 calc」 로 읽어요. 모듈 이름은 변수 이름 규칙(영문·숫자·밑줄)을 따라야 해요.', '탐색기에서 my-calc.py 에 마우스를 올리고 ✏️ 를 눌러 이름을 바꾸세요.', '파일 이름을 my_calc.py 로 바꾸고, main.py 의 두 줄도 my_calc 로 고치세요.'],
    fixed: { files: { 'main.py': 'import my_calc\nprint(my_calc.add(2, 3))\n', 'my_calc.py': CALC }, dirs: [] },
  },
  {
    id: 'shadow', title: 'math.py 의 함정', icon: '🪤',
    story: '교과서처럼 내 모듈 이름을 math.py 로 지었어요. 그런데 add 가 없대요!',
    project: { files: { 'main.py': 'import math\nprint(math.add(2, 3))\n', 'math.py': CALC }, dirs: [] },
    goal: '5', need: { name: 'add' },
    hints: ['math 는 파이썬 안에 처음부터 들어 있는 「내장 모듈」 이에요. 내 math.py 보다 언제나 먼저 불려 와요.', '내 파일 이름을 파이썬 모듈과 겹치지 않게 바꾸면 돼요. (탐색기에서 ✏️)', '예) math.py → mymath.py 로 바꾸고 main.py 도 import mymath, mymath.add(2, 3) 으로.'],
    fixed: { files: { 'main.py': 'import mymath\nprint(mymath.add(2, 3))\n', 'mymath.py': CALC }, dirs: [] },
  },
  {
    id: 'where', title: 'main.py 는 어디에?', icon: '🧭',
    story: '패키지를 만들고 main.py 도 그 안에 넣었어요. 그런데 mypackage 를 못 찾는대요.',
    project: { files: { 'mypackage/__init__.py': '', 'mypackage/module1.py': MODULE1, 'mypackage/main.py': 'from mypackage import module1\nmodule1.hello()\n' }, dirs: [] },
    active: 'mypackage/main.py', entryName: 'main.py',
    goal: '안녕! module1 이에요', need: { file: 'mypackage/module1.py', name: 'hello' }, mustRoot: 'main.py',
    hints: ['파이썬은 「실행한 파일이 있는 폴더」 에서 모듈을 찾아요. 지금 main.py 는 mypackage 폴더 안에 있어요.', 'main.py 를 패키지 폴더 밖, 맨 위로 꺼내야 해요. 탐색기에서 끌어다 빈 곳에 놓아 보세요.', 'main.py 를 끌어 탐색기 아래 빈 곳에 놓고(맨 위로 옮기기), main.py 를 연 채로 ▶.'],
    fixed: { files: { 'mypackage/__init__.py': '', 'mypackage/module1.py': MODULE1, 'main.py': 'from mypackage import module1\nmodule1.hello()\n' }, dirs: [] },
  },
];

/* ── 4. 확인 문제 ── 보기 고르기 · code 가 있으면 그 코드를 함께 보여 준다
 * ⚠ 2026-11-11 옛 3번(폴더 구조에서 오류 나는 코드)·6번(두 번 import)·8번(__name__)을 뺐다(사용자 지시) — 8문항 → 5문항.
 *   그래서 실행 결과를 고르는 문항(files·output)과 폴더 그림(tree·code4)은 이제 없다. 화면도 그 갈래를 지웠다.
 *   학생 답은 번호(0부터)로 저장되므로, 문항을 빼거나 차례를 바꾸면 store.js 의 migrate( ) 에 옮기는 표를 더할 것. */
export const QUIZ = [
  {
    q: '모듈·패키지·라이브러리의 관계로 알맞은 것은?',
    choices: ['모듈 안에 패키지가 들어 있다', '패키지는 모듈들을 담은 폴더이고, 라이브러리는 여러 패키지·모듈을 모아 놓은 것이다', '라이브러리는 .py 파일 하나를 부르는 말이다', '패키지와 모듈은 같은 말이다'],
    ans: 1, why: '📄 모듈(.py 파일) ⊂ 📦 패키지(모듈을 담은 폴더) ⊂ 📚 라이브러리(꾸러미). 교과서 143쪽의 표와 같아요.',
  },
  {
    q: '다음 코드 다음 줄에 add 를 바르게 부른 것은?', code: 'from calc import add',
    choices: ['calc.add(2, 3)', 'add(2, 3)', 'calc(add(2, 3))', 'import.add(2, 3)'],
    ans: 1, why: 'from 으로 add 라는 이름을 꺼내 왔으니 앞에 calc. 없이 add( ) 로 불러요. calc 라는 이름은 생기지 않아요.',
  },
  {
    q: 'import calc.py 를 실행하면 어떻게 될까?',
    choices: ['calc.py 를 잘 불러온다', "ModuleNotFoundError: No module named 'calc.py'; 'calc' is not a package", 'SyntaxError 가 난다', '아무 일도 일어나지 않는다'],
    ans: 1, why: '점(.)은 「폴더 안으로」 라는 뜻이라 calc 안의 py 를 찾다 실패해요. import 뒤에는 .py 를 빼고 적어요.',
  },
  {
    q: '__init__.py 에 대한 설명으로 알맞은 것은?',
    choices: ['__init__.py 가 없으면 파이썬 3 에서는 무조건 import 오류가 난다', '패키지를 처음 불러올 때 한 번 실행되는 파일이고, 「이 폴더는 패키지」 라고 밝히는 표지판이다', '모듈을 실행할 때마다 매번 다시 실행된다', '반드시 함수를 하나 이상 담아야 한다'],
    ans: 1, why: '빈 파일이어도 돼요. 파이썬 3.3 부터는 없어도 불러오기는 되지만(이름공간 패키지), 교과서와 실제 라이브러리는 모두 넣어 둡니다.',
  },
  {
    q: 'gtts 라이브러리를 설치하려고 한다. VS Code 에서 pip install gtts 는 어디에 입력할까?',
    choices: ['main.py 의 맨 첫 줄', '아래쪽 터미널(명령 프롬프트)', '__init__.py 안', '어디에 써도 똑같다'],
    ans: 1, why: 'pip 는 파이썬 코드가 아니라 명령어예요. 코드 안에 쓰면 SyntaxError. (코랩·주피터 셀에서는 !pip install gtts — 교과서 141쪽 Tip)',
  },
];
