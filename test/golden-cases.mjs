/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  진짜 파이썬과 견줄 「프로젝트」 들. `npm run golden` 이 진짜 파이썬으로 돌려 test/golden.json 을 만든다.
 *  ⚠ 여기 사례나 화면 자료(src/data)를 고치면 golden 을 다시 돌릴 것.
 *
 *  사례 = { name, files: {경로: 내용}, dirs?: [빈 폴더], entry?: 실행할 파일 }
 */
import { goldenFromData } from '../src/data/golden-from-data.js';

const calc = 'def add(a, b):\n    return a + b\n\ndef sub(a, b):\n    return a - b\n';
const pkg = {
  'mypackage/__init__.py': '',
  'mypackage/module1.py': 'def hello():\n    print("module1 의 hello 입니다")\n',
  'mypackage/module2.py': 'def bye():\n    print("module2 의 bye 입니다")\n',
};

const SNIPPETS = [
  // ── 모듈 하나 ──
  ['import 모듈', { 'main.py': 'import calc\nprint(calc.add(2, 3))\nprint(calc.sub(5, 1))\n', 'calc.py': calc }],
  ['from 모듈 import 이름', { 'main.py': 'from calc import add\nprint(add(2, 3))\n', 'calc.py': calc }],
  ['import 모듈 as 별명', { 'main.py': 'import calc as c\nprint(c.add(2, 3))\n', 'calc.py': calc }],
  ['from 모듈 import *', { 'main.py': 'from calc import *\nprint(add(1, 1), sub(1, 1))\n', 'calc.py': calc }],
  ['별명 다음에 원래 이름', { 'main.py': 'import calc as c\nprint(calc.add(2, 3))\n', 'calc.py': calc }],
  ['from 다음에 모듈 이름', { 'main.py': 'from calc import add\nprint(calc.add(2, 3))\n', 'calc.py': calc }],
  ['import 다음에 함수만', { 'main.py': 'import calc\nprint(add(2, 3))\n', 'calc.py': calc }],
  ['모듈 이름 오타', { 'main.py': 'import clac\nprint(clac.add(2, 3))\n', 'calc.py': calc }],
  ['함수 이름 오타 (점)', { 'main.py': 'import calc\nprint(calc.ad(2, 3))\n', 'calc.py': calc }],
  ['함수 이름 오타 (from)', { 'main.py': 'from calc import ad\n', 'calc.py': calc }],
  ['import 에 .py', { 'main.py': 'import calc.py\n', 'calc.py': calc }],
  ['from 에 .py', { 'main.py': 'from calc.py import add\n', 'calc.py': calc }],
  ['붙임표 이름', { 'main.py': 'import my-calc\n', 'my-calc.py': calc }],
  ['따옴표 이름', { 'main.py': 'import "calc"\n', 'calc.py': calc }],
  ['슬래시 경로', { 'main.py': 'import mypackage/module1\n', ...pkg }],
  ['코드 속 pip', { 'main.py': 'pip install gtts\n' }],
  ['math 가림 실패', { 'main.py': 'import math\nprint(math.add(2, 3))\n', 'math.py': calc }],
  ['random 가림', { 'main.py': 'import random\nprint(random.randint(1, 6))\n', 'random.py': 'def roll():\n    return 3\n' }],
  ['두 번 import', { 'main.py': 'import hello\nimport hello\nprint("끝")\n', 'hello.py': 'print("hello.py 가 실행되었습니다")\n' }],
  ['__name__', { 'main.py': 'import greet\nprint("main:", __name__)\ngreet.hi()\n', 'greet.py': 'def hi():\n    print("안녕")\n\nprint("greet:", __name__)\nif __name__ == "__main__":\n    hi()\n' }],
  ['__name__ 직접 실행', { 'main.py': 'import greet\n', 'greet.py': 'def hi():\n    print("안녕")\n\nprint("greet:", __name__)\nif __name__ == "__main__":\n    hi()\n' }, [], 'greet.py'],
  ['모듈 출력', { 'main.py': 'import calc\nimport math\nimport random\nprint(calc)\nprint(math)\nprint(random)\n', 'calc.py': calc }],
  ['모듈 속 변수', { 'main.py': 'import info\nprint(info.SCHOOL, info.year)\n', 'info.py': 'SCHOOL = "와우고"\nyear = 2026\n' }],
  ['dir', { 'main.py': 'import calc\nprint(dir(calc))\n', 'calc.py': calc }],
  ['NameError 제안', { 'main.py': 'print(ad(1,2))\n' }],
  ['import 잊음', { 'main.py': 'print(math.pi)\n' }],
  ['한글 오타', { 'main.py': 'def f():\n    합계 = 1\n    print(합게)\nf()\n' }],
  ['모듈 함수 속 오류', { 'main.py': "import calc\nprint(calc.add(1, 'a'))\n", 'calc.py': calc }],
  ['여러 줄 호출', { 'main.py': "import calc\nx = calc.add(1,\n  'a')\n", 'calc.py': calc }],
  ['인수 부족', { 'main.py': 'import calc\ncalc.add(1)\n', 'calc.py': calc }],
  ['인수 넘침', { 'main.py': 'import calc\nprint(calc.add(1, 2, 3))\n', 'calc.py': calc }],
  ['모듈 실행 중 오류', { 'main.py': 'from mypackage import m2\n', 'mypackage/__init__.py': '', 'mypackage/m2.py': 'x = 1\nprint(10 / 0)\n' }],
  ['모듈 문법 오류', { 'main.py': 'from bad import x\n', 'bad.py': 'def f(:\n    pass\n' }],
  ['모듈 콜론 빠짐', { 'main.py': 'import bad\n', 'bad.py': 'def hi()\n    print(1)\n' }],
  ['모듈 들여쓰기', { 'main.py': 'import bad\n', 'bad.py': 'def hi():\nprint(1)\n' }],
  // ── 패키지 ──
  ['import 패키지.모듈', { 'main.py': 'import mypackage.module1\nmypackage.module1.hello()\n', ...pkg }],
  ['from 패키지 import 모듈', { 'main.py': 'from mypackage import module1\nmodule1.hello()\n', ...pkg }],
  ['from 패키지.모듈 import 함수', { 'main.py': 'from mypackage.module1 import hello\nhello()\n', ...pkg }],
  ['import 패키지.모듈 as', { 'main.py': 'import mypackage.module1 as m1\nm1.hello()\n', ...pkg }],
  ['패키지만 import', { 'main.py': 'import mypackage\nmypackage.module1.hello()\n', ...pkg }],
  ['패키지.모듈 다음에 모듈만', { 'main.py': 'import mypackage.module1\nmodule1.hello()\n', ...pkg }],
  ['from 패키지 다음에 전체 경로', { 'main.py': 'from mypackage import module1\nmypackage.module1.hello()\n', ...pkg }],
  ['from 패키지.모듈 다음에 모듈', { 'main.py': 'from mypackage.module1 import hello\nmodule1.hello()\n', ...pkg }],
  ['없는 하위 모듈 import', { 'main.py': 'import mypackage.module3\n', ...pkg }],
  ['없는 하위 모듈 from', { 'main.py': 'from mypackage import module3\n', ...pkg }],
  ['from 패키지 import 함수', { 'main.py': 'from mypackage import hello\n', ...pkg }],
  ['패키지 둘 다', { 'main.py': 'from mypackage import module1, module2\nmodule1.hello()\nmodule2.bye()\n', ...pkg }],
  ['__init__ 은 한 번', { 'main.py': 'import mypackage.module1\nimport mypackage.module2\nfrom mypackage import module1\nprint("끝")\n', ...pkg, 'mypackage/__init__.py': 'print("패키지를 불러왔어요")\n' }],
  ['__init__ 에서 불러 두기', { 'main.py': 'import mypackage\nmypackage.module1.hello()\nmypackage.hello()\n', ...pkg, 'mypackage/__init__.py': 'from . import module1\nfrom .module1 import hello\n' }],
  ['__init__ 없는 패키지', { 'main.py': 'from mypackage import module1\nmodule1.hello()\nimport mypackage\nprint(mypackage)\n', 'mypackage/module1.py': pkg['mypackage/module1.py'] }],
  ['__init__ 없는 패키지 from 실패', { 'main.py': 'from mypackage import nothing\n', 'mypackage/module1.py': pkg['mypackage/module1.py'] }],
  ['main 이 패키지 안', { 'main.py': '', 'mypackage/main.py': 'from mypackage import module1\nmodule1.hello()\n', ...pkg }, [], 'mypackage/main.py'],
  ['모듈 파일을 직접 실행', { 'main.py': 'from mypackage import module1\nmodule1.hello()\n', ...pkg }, [], 'mypackage/module1.py'],
  ['main.py 에서 점 import', { 'main.py': 'from . import calc\n', 'calc.py': calc }],
  ['패키지 안 모듈끼리', { 'main.py': 'from shop import order\norder.buy("떡볶이")\n', 'shop/__init__.py': '', 'shop/menu.py': 'PRICE = {"떡볶이": 3000, "김밥": 2500}\n', 'shop/order.py': 'from shop import menu\n\ndef buy(name):\n    print(f"{name} {menu.PRICE[name]}원")\n' }],
  ['패키지 안 모듈끼리 점', { 'main.py': 'from shop import order\norder.buy("김밥")\n', 'shop/__init__.py': '', 'shop/menu.py': 'PRICE = {"떡볶이": 3000, "김밥": 2500}\n', 'shop/order.py': 'from .menu import PRICE\n\ndef buy(name):\n    print(f"{name} {PRICE[name]}원")\n' }],
  ['패키지 안 키 오류', { 'main.py': 'from shop import order\norder.buy("라면")\n', 'shop/__init__.py': '', 'shop/menu.py': 'PRICE = {"떡볶이": 3000, "김밥": 2500}\n', 'shop/order.py': 'from shop import menu\n\ndef buy(name):\n    print(f"{name} {menu.PRICE[name]}원")\n' }],
  ['하위 패키지', { 'main.py': 'from game.items import sword\nsword.swing()\nimport game.items.sword as s\ns.swing()\n', 'game/__init__.py': '', 'game/items/__init__.py': '', 'game/items/sword.py': 'def swing():\n    print("휘익!")\n' }],
  ['클래스 모듈', { 'main.py': 'from menu import Menu\nm = Menu(["김밥", "라면"])\nprint(m.choose("라면"))\nprint(m.choose("피자"))\n', 'menu.py': 'class Menu:\n    def __init__(self, items):\n        self.items = items\n\n    def choose(self, name):\n        if name in self.items:\n            return name + " 선택"\n        return "없는 메뉴"\n' }],
  ['메소드 인수', { 'main.py': 'from menu import Menu\nm = Menu([])\nm.choose()\n', 'menu.py': 'class Menu:\n    def __init__(self, items):\n        self.items = items\n\n    def choose(self, name):\n        return name\n' }],
  ['f-string 소수', { 'main.py': 'import stats\nprint(f"평균 {stats.mean([1, 2, 4]):.2f}")\n', 'stats.py': 'def mean(xs):\n    return sum(xs) / len(xs)\n' }],
  // ── 문법 오류 ──
  ['콜론 빠짐', { 'main.py': 'def hi()\n    pass\n' }],
  ['들여쓰기 없음', { 'main.py': 'def hi():\nprint(1)\n' }],
  ['들여쓰기 없음 if', { 'main.py': 'x = 1\nif x > 0:\nprint(x)\n' }],
  ['쓸데없는 들여쓰기', { 'main.py': 'print(1)\n  print(2)\n' }],
  ['들여쓰기 어긋남', { 'main.py': 'def f():\n        x = 1\n    return x\n' }],
  ['괄호 안 닫음', { 'main.py': 'print("안녕"\n' }],
  ['쉼표 빠짐', { 'main.py': 'x = 1\nprint("값" x)\n' }],
  ['따옴표 안 닫음', { 'main.py': 'print("안녕)\n' }],
  ['else 홀로', { 'main.py': 'else:\n    pass\n' }],
];

export function cases() {
  const out = SNIPPETS.map(([name, files, dirs, entry]) => ({ name, files, dirs: dirs || [], entry: entry || 'main.py' }));
  return out.concat(goldenFromData());
}
