# 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
# 진짜 파이썬(CPython)으로 test/golden-cases.mjs 의 「프로젝트」 들을 돌려 test/golden.json 을 만든다.
#
#   PYTHONUTF8=1 python tools/golden.py
#
# 프로젝트마다 임시 폴더에 파일·폴더를 진짜로 만들고, 그 폴더에서 `python main.py` 를 실행한다.
# (VS Code 의 ▶ 가 하는 일과 같다 — 작업 폴더는 프로젝트 맨 위, 실행할 파일은 경로로 넘긴다)
# 화면 출력(stdout)과 오류(stderr) 를 따로 받아 둔다. 임시 폴더 경로는 C:\project 로 바꿔 적는다.
#
# ④ 수행평가 문항의 모범 답·흔한 실수(test/local/exam-projects.mjs)가 있으면 그것도 돌려
# test/local/golden-exam.json 에 따로 담는다. ⚠ test/local/ 은 깃허브에 올리지 않는다(정답이 들어 있다 —
# 오류 문구의 Traceback 에도 start.py 의 줄이 찍힌다). 없으면 건너뛴다.
import json, os, pathlib, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
dump = subprocess.run(
    ['node', '-e', "import('./test/golden-cases.mjs').then(m => process.stdout.write(JSON.stringify({ cases: m.cases(), exam: m.examCases() })))"],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8', check=True)
data = json.loads(dump.stdout)

PREFIX = sys.base_prefix  # 예) C:\Program Files\Python 3.12.3


def run_all(cases):
    out = []
    for c in cases:
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
            for d in c.get('dirs') or []:
                pathlib.Path(tmp, d).mkdir(parents=True, exist_ok=True)
            for name, text in (c.get('files') or {}).items():
                p = pathlib.Path(tmp, name)
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(text, encoding='utf-8')
            entry = c.get('entry') or 'main.py'
            r = subprocess.run([sys.executable, entry.replace('/', os.sep)], cwd=tmp, capture_output=True,
                               text=True, encoding='utf-8', input='\n'.join(c.get('inputs') or []),
                               env={**os.environ, 'PYTHONUTF8': '1', 'PYTHONDONTWRITEBYTECODE': '1'})
            real = str(pathlib.Path(tmp).resolve())
            fix = lambda s: (s.replace(real, 'C:\\project').replace(real.replace('\\', '\\\\'), 'C:\\\\project')
                             .replace(PREFIX, 'C:\\Python312').replace(PREFIX.replace('\\', '\\\\'), 'C:\\\\Python312')
                             .replace('\r\n', '\n').rstrip('\n'))
            out.append({'name': c['name'], 'stdout': fix(r.stdout), 'stderr': fix(r.stderr), 'code': r.returncode})
    return out


def save(path, out):
    path.write_text(json.dumps({'python': sys.version.split()[0], 'cases': out}, ensure_ascii=False, indent=1), encoding='utf-8')


out = run_all(data['cases'])
save(ROOT / 'test' / 'golden.json', out)
print(f'{len(out)}개 프로젝트를 진짜 파이썬 {sys.version.split()[0]} 로 돌려 test/golden.json 에 담았습니다.')

if data['exam']:
    exam = run_all(data['exam'])
    save(ROOT / 'test' / 'local' / 'golden-exam.json', exam)
    print(f'수행평가 사례 {len(exam)}개는 test/local/golden-exam.json 에 따로 담았습니다 (깃허브에 올리지 않음).')
else:
    print('test/local/exam-projects.mjs 가 없어 수행평가 사례는 건너뛰었습니다.')
