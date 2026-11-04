/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  한국어 풀이 말풍선 — 오류마다 「무엇을 고쳐야 하는지」 를 짚는가.
 */
import { 묶음, 참 } from './harness.mjs';
import { runProject } from '../src/lib/pymini.js';
import { explain } from '../src/lib/explain.js';

const calc = 'def add(a, b):\n    return a + b\n';
const say = (files, entry = 'main.py', installed = []) => {
  const p = { files, dirs: [] };
  return explain(runProject({ files, entry, installed }), p).map((x) => x.html.replace(/<[^>]+>/g, '')).join(' / ');
};
const has = (설명, text, ...words) => 참(`${설명} — 「${words.join('」·「')}」`, words.every((w) => text.includes(w)));

묶음('풀이 — 모듈을 못 찾을 때');
has('오타', say({ 'main.py': 'import clac\n', 'calc.py': calc }), '혹시', 'calc');
has('.py 를 붙임', say({ 'main.py': 'import calc.py\n', 'calc.py': calc }), '.py', '빼고', 'import calc');
has('파일이 폴더 안에', say({ 'main.py': 'import greet\n', 'mytools/greet.py': calc }), 'mytools', 'from mytools import greet');
has('main.py 가 패키지 안', say({ 'mytools/main.py': 'from mytools import greet\n', 'mytools/greet.py': calc }, 'mytools/main.py'), '실행한 파일이 있는 폴더', '밖');
has('외부 라이브러리', say({ 'main.py': 'import numpy\n' }), 'pip install numpy', '터미널');
has('하위 모듈 없음', say({ 'main.py': 'import mytools.calk\n', 'mytools/__init__.py': '', 'mytools/calc.py': calc }), 'calk.py', '혹시', 'calc');
has('.py 로 안 끝나는 파일', say({ 'main.py': 'import calc\n', 'calc.txt': calc }), 'calc.txt', '.py');

묶음('풀이 — 이름이 없을 때');
has('모듈 이름을 안 붙임', say({ 'main.py': 'import calc\nprint(add(1, 2))\n', 'calc.py': calc }), 'calc.py 안에 있는', 'calc.add');
has('별명', say({ 'main.py': 'import calc as c\nprint(calc.add(1, 2))\n', 'calc.py': calc }), '별명', 'c.함수');
has('from 다음에 모듈 이름', say({ 'main.py': 'from calc import add\nprint(calc.add(1, 2))\n', 'calc.py': calc }), '이름 자체는 생기지 않아요');
has('import 패키지.모듈 다음에 모듈만', say({ 'main.py': 'import mytools.calc\nprint(calc.add(1, 2))\n', 'mytools/__init__.py': '', 'mytools/calc.py': calc }), 'mytools.calc.함수', 'from mytools import calc');
has('import 를 안 함', say({ 'main.py': 'print(calc.add(1, 2))\n', 'calc.py': calc }), 'import calc');
has('함수 이름 오타', say({ 'main.py': 'import calc\nprint(calc.ad(1, 2))\n', 'calc.py': calc }), 'calc.py 안에', 'ad');
has('패키지만 import', say({ 'main.py': 'import mytools\nmytools.calc.add(1, 2)\n', 'mytools/__init__.py': '', 'mytools/calc.py': calc }), '따라오지 않아요', 'import mytools.calc');
has('from 패키지 import 함수', say({ 'main.py': 'from mytools import add\n', 'mytools/__init__.py': '', 'mytools/calc.py': calc }), 'mytools/calc.py', 'from mytools.calc import add');

묶음('풀이 — 가림·문법');
has('math.py', say({ 'main.py': 'import math\nmath.add(1, 2)\n', 'math.py': calc }), '내장 모듈', 'mymath.py');
has('random.py', say({ 'main.py': 'import random\nrandom.randint(1, 6)\n', 'random.py': calc }), '가렸어요', 'myrandom.py');
has('붙임표', say({ 'main.py': 'import my-calc\n', 'my-calc.py': calc }), '붙임표', 'my_calc.py');
has('코드 속 pip', say({ 'main.py': 'pip install gtts\n' }), '터미널 명령');
has('점 import', say({ 'main.py': 'from . import calc\n', 'calc.py': calc }), '패키지 안의 파일끼리');
has('모듈 안 문법 오류', say({ 'main.py': 'import calc\n', 'calc.py': 'def add(a, b)\n    return a\n' }), '콜론', 'calc.py');
has('▶ 를 모듈에서', say({ 'main.py': 'import calc\n', 'calc.py': calc }, 'calc.py'), '지금 열려 있는 파일', 'main.py');
has('함수만 정의하고 안 부름', say({ 'main.py': calc }), '부르지 않았는지');
has('설치한 뒤 gtts', say({ 'main.py': 'from gtts import gTTS\ngTTS("안녕", lang="ko").save("a.mp3")\n' }, 'main.py', ['gtts']), '');
