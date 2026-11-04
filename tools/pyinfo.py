# 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
# 진짜 파이썬에서 「이름 목록」 을 받아 src/lib/pyinfo.js 로 적는다.
#
#   PYTHONUTF8=1 python tools/pyinfo.py
#
# 왜 필요한가 —
#   파이썬 3.12 는 오타를 내면 「Did you mean: 'add'?」 처럼 비슷한 이름을 골라 준다.
#   그 후보가 내장 함수 목록·dir(math) 같은 실제 이름 목록이라, 똑같이 고르려면 같은 목록이 있어야 한다.
#   또 「math 는 내장 모듈이라 내 math.py 보다 먼저 불린다」 같은 판단도 여기 목록을 따른다.
import builtins, json, math, pathlib, random, sys, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
info = {
    'python': sys.version.split()[0],
    # NameError 후보 — frame.f_builtins 의 차례 그대로 (같은 거리면 먼저 나온 이름이 이긴다)
    'builtins': list(builtins.__dict__),
    # 「Did you forget to import 'math'?」 를 붙일지 정하는 표준 라이브러리 이름들
    'stdlib': sorted(sys.stdlib_module_names),
    # 파이썬 안에 처음부터 들어 있는(컴파일된) 모듈 — 같은 이름의 .py 파일보다 먼저 불린다
    'builtinModules': sorted(sys.builtin_module_names),
    'dir': {
        'math': dir(math), 'random': dir(random), 'time': dir(time),
        'str': dir(str), 'list': dir(list), 'dict': dir(dict), 'int': dir(int), 'float': dir(float),
        'tuple': dir(tuple), 'bool': dir(bool), 'NoneType': dir(None), 'object': dir(object),
    },
}

head = ('/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유\n'
        ' *  ⚠ 손으로 고치지 말 것 — tools/pyinfo.py 가 진짜 파이썬 '
        + info['python'] + ' 에서 받아 만든다.\n */\n')
body = 'export const PYINFO = ' + json.dumps(info, ensure_ascii=False) + ';\n'
(ROOT / 'src' / 'lib' / 'pyinfo.js').write_text(head + body, encoding='utf-8')
print(f"src/lib/pyinfo.js — 내장 이름 {len(info['builtins'])}개, 표준 라이브러리 {len(info['stdlib'])}개, 내장 모듈 {len(info['builtinModules'])}개 (파이썬 {info['python']})")
