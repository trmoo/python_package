/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ③ 패키지 만들기 — 미션 네 개. 앞 미션의 모범 답안이 다음 미션의 출발점이다.
 *  단계(step)마다 check(p, runs) 가 「스스로 채워지는 체크리스트」 를 만든다.
 *    p    — 지금 프로젝트 { files, dirs }
 *    runs — 파일마다 마지막 실행 { 'main.py': { r: 실행 결과, p: 그때의 프로젝트 } }
 *  ⚠ node 로 불러다 시험하므로 DOM 을 만들지 말 것.
 */
import { defsOf, importsOf, allDirs, parse } from './_deps.js';
import { importForms } from '../lib/checker.js';

const has = (p, f) => p.files[f] !== undefined;
const imports = (src, pred) => (importsOf(src || '') || []).some(pred);
const ranOk = (runs, entry) => runs[entry] && runs[entry].r.ok;
const called = (runs, entry, file) => runs[entry] && runs[entry].r.calls.some((c) => c.file === file);
/** 맨 위에 if __name__ == "__main__": 이 있는가 */
export function hasMainGuard(src) {
  try {
    return parse(src).body.some((st) => st.type === 'If' && st.test.type === 'Compare'
      && [st.test.left, st.test.ops[0].right].some((n) => n.type === 'Name' && n.id === '__name__')
      && [st.test.left, st.test.ops[0].right].some((n) => n.type === 'Str' && n.v === '__main__'));
  } catch (e) { return false; }
}
/** mytools 안의 모듈들 (__init__ 빼고) */
const modsIn = (p, dir) => Object.keys(p.files).filter((f) => f.startsWith(dir + '/') && f.endsWith('.py') && !f.endsWith('/__init__.py'));

const GREET = 'def hello(name):\n    print(f"{name}님, 안녕하세요!")\n';
const M1_ANSWER = { files: { 'main.py': 'import greet\n\ngreet.hello("민지")\n', 'greet.py': GREET }, dirs: [] };
const M2_ANSWER = { files: { 'main.py': 'from mytools import greet\n\ngreet.hello("민지")\n', 'mytools/__init__.py': '', 'mytools/greet.py': GREET }, dirs: [] };
const M3_ANSWER = { files: { ...M2_ANSWER.files, 'mytools/calc.py': 'def add(a, b):\n    return a + b\n',
  'main.py': 'from mytools import greet\nfrom mytools.calc import add\n\ngreet.hello("민지")\nprint("2 + 3 =", add(2, 3))\n' }, dirs: [] };
const M4_ANSWER = { files: { ...M3_ANSWER.files,
  'mytools/__init__.py': 'print("📦 mytools 패키지를 불러왔어요")\n',
  'mytools/greet.py': GREET + '\n\n# 이 파일을 직접 실행할 때만 도는 「시험 코드」\nif __name__ == "__main__":\n    hello("시험용")\n',
  'main.py': 'from mytools import greet\nfrom mytools.calc import add\nimport mytools.greet\n\ngreet.hello("민지")\nprint("2 + 3 =", add(2, 3))\n' }, dirs: [] };

export const MISSIONS = [
  {
    id: 'm1', short: '첫 모듈', title: '미션 1 · 첫 모듈 만들기',
    story: '인사하는 함수를 따로 파일에 담아 두고, main.py 에서 불러 써 봐요. 이 파일 하나가 바로 「모듈」 이에요.',
    start: { files: { 'main.py': '# 1) 왼쪽 탐색기 위의 📄 를 눌러 greet.py 를 만드세요.\n# 2) greet.py 에 def 로 함수를 하나 만들고,\n# 3) 여기 main.py 에서 import 해서 불러 보세요.\n' }, dirs: [] },
    steps: [
      { text: '📄 로 <code>greet.py</code> 파일 만들기', check: (p) => has(p, 'greet.py') },
      { text: '<code>greet.py</code> 에 <code>def</code> 로 함수 하나 만들기 — 예) <code>def hello(name):</code>', check: (p) => has(p, 'greet.py') && defsOf(p.files['greet.py']).length > 0 },
      { text: '<code>main.py</code> 에서 <code>import greet</code> 로 불러오기', check: (p) => imports(p.files['main.py'], (s) => (s.type === 'Import' && s.names.some((a) => a.name === 'greet')) || (s.type === 'FromImport' && s.mod === 'greet')) },
      { text: '<code>main.py</code> 탭을 연 채로 ▶ — greet 의 함수가 실행되어 글이 나오기', check: (p, runs) => ranOk(runs, 'main.py') && called(runs, 'main.py', 'greet.py') && !!runs['main.py'].r.stdout },
    ],
    hints: [
      'greet.py 에는 함수를 「정의」 만 해요. 부르는 것은 main.py 에서 합니다.',
      'main.py 에서는 import greet 다음 줄에 greet.hello("이름") 처럼 「모듈 이름.함수 이름」 으로 불러요.',
      '▶ 는 지금 열려 있는 파일을 실행해요. greet.py 탭이 열려 있으면 아무것도 안 나와요 — main.py 탭을 누르고 ▶.',
    ],
    answer: M1_ANSWER,
  },
  {
    id: 'm2', short: '패키지로 묶기', title: '미션 2 · 패키지로 묶기',
    story: '모듈이 늘어나면 폴더에 모아 관리해요. 폴더에 __init__.py 를 넣으면 「패키지」 가 됩니다. greet.py 를 mytools 패키지로 옮겨 봐요.',
    start: M1_ANSWER,
    steps: [
      { text: '📁 로 <code>mytools</code> 폴더 만들기 (영문 소문자)', check: (p) => allDirs(p).includes('mytools') },
      { text: '<code>mytools</code> 안에 <code>__init__.py</code> 만들기 — 빈 파일 그대로 두면 돼요', check: (p) => has(p, 'mytools/__init__.py') },
      { text: '<code>greet.py</code> 를 끌어서 <code>mytools</code> 폴더에 놓기', check: (p) => has(p, 'mytools/greet.py') && !has(p, 'greet.py') },
      { text: '<code>main.py</code> 의 import 고치기 — <code>from mytools import greet</code>', check: (p) => imports(p.files['main.py'], (s) => (s.type === 'FromImport' && (s.mod === 'mytools' || s.mod === 'mytools.greet')) || (s.type === 'Import' && s.names.some((a) => a.name === 'mytools.greet'))) },
      { text: '<code>main.py</code> 를 열고 ▶ — 패키지 속 greet 가 실행되기', check: (p, runs) => ranOk(runs, 'main.py') && called(runs, 'main.py', 'mytools/greet.py') },
    ],
    hints: [
      '폴더를 먼저 고른(누른) 다음 📄 를 누르면 그 폴더 안에 파일이 생겨요. 이름 칸에 mytools/__init__.py 라고 적으면 폴더와 파일이 한 번에 생겨요.',
      'greet.py 를 옮기고 바로 ▶ 를 눌러 보세요. 무슨 오류가 나나요? 파이썬은 이제 맨 위에서 greet 를 찾지 못해요.',
      '폴더 안의 모듈은 폴더(패키지) 이름부터 적어요 — from mytools import greet.',
    ],
    answer: M2_ANSWER,
  },
  {
    id: 'm3', short: '모듈 둘·두 꼴', title: '미션 3 · 모듈 하나 더, import 두 가지 꼴',
    story: 'mytools 에 계산 모듈을 하나 더 넣고, 두 모듈을 서로 다른 import 꼴로 불러 봐요. 수행평가 조건 ③ · ⑤ 와 같아요.',
    start: M2_ANSWER,
    steps: [
      { text: '<code>mytools</code> 안에 모듈 하나 더 — 예) <code>calc.py</code> 에 <code>def add(a, b):</code>', check: (p) => modsIn(p, 'mytools').filter((f) => f !== 'mytools/greet.py' && defsOf(p.files[f]).length).length > 0 },
      { text: '<code>main.py</code> 에서 새 모듈도 불러와 쓰기', check: (p) => modsIn(p, 'mytools').filter((f) => f !== 'mytools/greet.py').some((f) => { const m = f.slice(8, -3); return imports(p.files['main.py'], (s) => (s.type === 'Import' && s.names.some((a) => a.name === `mytools.${m}`)) || (s.type === 'FromImport' && (s.mod === `mytools.${m}` || (s.mod === 'mytools' && s.names.some((x) => x !== '*' && x.name === m))))); }) },
      { text: '두 모듈을 <b>서로 다른 꼴</b>로 — 예) <code>from mytools import greet</code> + <code>from mytools.calc import add</code>', check: (p) => importForms(p.files['main.py'] || '', 'mytools').forms.length >= 2 },
      { text: '<code>main.py</code> 를 열고 ▶ — 두 모듈의 함수가 모두 실행되기', check: (p, runs) => ranOk(runs, 'main.py') && modsIn(runs['main.py'].p, 'mytools').filter((f) => defsOf(runs['main.py'].p.files[f]).length).every((f) => called(runs, 'main.py', f)) && modsIn(runs['main.py'].p, 'mytools').length >= 2 },
    ],
    hints: [
      'mytools 폴더를 먼저 누르고 📄 → calc.py. 또는 맨 위에서 📄 → mytools/calc.py 라고 적어도 돼요.',
      'import 꼴 세 가지 — ① import mytools.calc → mytools.calc.add( ) ② from mytools import calc → calc.add( ) ③ from mytools.calc import add → add( ).',
      'add 처럼 값을 돌려주는(return) 함수는 print( ) 로 감싸야 결과가 보여요 — print(add(2, 3)).',
    ],
    answer: M3_ANSWER,
  },
  {
    id: 'm4', short: '⭐ __init__·__name__', title: '미션 4 · ⭐ 심화 — __init__.py 와 __name__',
    story: '__init__.py 는 언제 실행될까요? 모듈 파일을 직접 실행하면 무엇이 달라질까요? 두 가지를 실험해 봐요. (빨리 끝낸 사람용)',
    start: M3_ANSWER,
    steps: [
      { text: '<code>mytools/__init__.py</code> 에 <code>print("mytools 를 불러왔어요")</code> 한 줄 쓰기', check: (p) => /print\s*\(/.test(p.files['mytools/__init__.py'] || '') },
      { text: '<code>main.py</code> 에 mytools 를 부르는 import 문이 둘 이상 있는 채로 ▶ — 그 말이 <b>몇 번</b> 나오나요?', check: (p, runs) => ranOk(runs, 'main.py') && /print\s*\(/.test(runs['main.py'].p.files['mytools/__init__.py'] || '') && (importsOf(runs['main.py'].p.files['main.py']) || []).filter((s) => (s.type === 'Import' && s.names.some((a) => a.name.split('.')[0] === 'mytools')) || (s.type === 'FromImport' && s.mod.split('.')[0] === 'mytools')).length >= 2 },
      { text: '<code>greet.py</code> 맨 아래에 <code>if __name__ == "__main__":</code> 시험 코드 넣기', check: (p) => hasMainGuard(p.files['mytools/greet.py'] || '') },
      { text: '<code>greet.py</code> 탭을 열고 ▶ — 직접 실행하면 시험 코드가 돌아요', check: (p, runs) => ranOk(runs, 'mytools/greet.py') && hasMainGuard(runs['mytools/greet.py'].p.files['mytools/greet.py'] || '') && !!runs['mytools/greet.py'].r.stdout },
      { text: '<code>main.py</code> 탭에서 ▶ — 불려 갈 때는 시험 코드가 안 돌아요', check: (p, runs) => ranOk(runs, 'main.py') && hasMainGuard(runs['main.py'].p.files['mytools/greet.py'] || '') },
    ],
    hints: [
      '모듈(과 패키지의 __init__.py)은 처음 import 할 때 딱 한 번 실행돼요. 두 번째부터는 이미 불러온 것을 꺼내 써요.',
      '직접 실행한 파일의 __name__ 은 "__main__", import 로 불려 간 파일의 __name__ 은 자기 이름(mytools.greet)이에요.',
      '교과서 252쪽 정답 해설의 main.py 도 if __name__ == \'__main__\': 꼴로 되어 있어요.',
    ],
    answer: M4_ANSWER,
  },
];
