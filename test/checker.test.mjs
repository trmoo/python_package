/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ④ 수행평가 문항(foods 패키지에 milk · apple + start.py — 2026-11-11 5점짜리로 줄임) 조건 점검기
 *  — 학생이 흔히 하는 실수를 넣어 칸마다 ✅ / 🟨 / ⬜ 가 맞게 켜지는지.
 *  모범 답·실수 사례는 정답이 들어 있어 깃허브에 올리지 않는 test/local/exam-projects.mjs 에 있다(2026-11-05 사용자 지시).
 *  그 파일이 없는 곳(깃허브 Actions)에서는 그 부분만 건너뛴다.
 */
import { readFileSync } from 'node:fs';
import { 묶음, 확인, 참 } from './harness.mjs';
import { check, importForms, CONDITIONS, EXPECTED, MODULES } from '../src/lib/checker.js';
import { fixPassedForTest } from './helpers.mjs';
import { PRACTICE_START, QUESTION, RUBRIC, GOAL_TREE } from '../src/data/assess.js';
import { EXAM } from './golden-cases.mjs';

const mark = (x) => (x.state === 'ok' ? 'O' : x.state === 'part' ? 'P' : '.');
const states = (p) => check(p).items.map(mark).join('');

묶음('조건 점검기 — 처음 모습');
확인('조건은 네 칸', CONDITIONS.length, 4);
확인('처음(빈 start.py) — 칸 모두 비어 있음', states(PRACTICE_START), '....');
참('처음 — 「아직 시작하지 않았어요」', check(PRACTICE_START).summary.startsWith('아직 시작하지'));
확인('빈 foods 폴더만 — ① 🟨 나머지 ⬜', states({ files: { 'start.py': PRACTICE_START.files['start.py'] }, dirs: ['foods'] }), 'P...');
참('빈 foods 폴더만 — 「foods/ 는 좋아요」', /foods\/ 는 좋아요/.test(check({ files: { 'start.py': '' }, dirs: ['foods'] }).items[0].detail));
참('빈 폴더만 — 「⬜ · 🟨 칸을 채워」', check({ files: { 'start.py': '' }, dirs: ['foods'] }).summary.includes('칸을 채워'));
확인('출력 예 두 줄 (문항 그대로)', EXPECTED, ['신선한 우유', '새콤한 사과']);
확인('모듈 두 개 — foods 바로 아래', MODULES.map((m) => m.path), ['foods/milk.py', 'foods/apple.py']);

if (EXAM) {
  const { EXAM_CASES, ANSWER, START } = EXAM;

  묶음('조건 점검기 — 모범 답 (이 컴퓨터에만)');
  {
    const r = check(ANSWER);
    확인('모범 답 — 네 칸 모두 ✅', states(ANSWER), 'OOOO');
    참('모범 답 — allOk', r.allOk && r.okCount === 4 && r.total === 4);
    확인('모범 답 — start.py 출력이 출력 예와 같다', r.run.stdout, EXPECTED.join('\n'));
  }

  묶음('조건 점검기 — 흔한 실수 (이 컴퓨터에만)');
  for (const [name, proj, , want, wantX] of EXAM_CASES) {
    const r = check(proj);
    확인(`${name} — 칸`, r.items.map(mark).join('') + ' ' + mark(r.extra), `${want} ${wantX}`);
    참(`${name} — 🟨 · ⬜ 칸마다 설명이 있다`, [...r.items, r.extra].every((it) => it.state === 'ok' || (it.detail && it.detail.length > 4)));
  }
  {
    const find = (n) => check(EXAM_CASES.find((c) => c[0] === n)[1]);
    참('모듈 맨 아래에서도 부름 — 「두 번씩」', /두 번씩/.test(find('모듈 맨 아래에서도 부름').items[3].detail) && /맨 아래/.test(find('모듈 맨 아래에서도 부름').items[1].detail));
    참('print 로 감쌈 — None 을 짚는다', /None/.test(find('print( ) 로 한 번 더 감쌈').items[3].detail));
    참('문구를 직접 print — 「부르지 않은 함수」', /부르지 않은 함수/.test(find('문구를 직접 print').items[3].detail));
    참('start.py 를 foods 안에 — 옮기라고 한다', /맨 위\(다운로드\)로 옮겨/.test(find('start.py 를 foods 안에').items[3].detail));
    참('Start.py — 이름을 짚는다', /Start\.py」 → start\.py/.test(find('start.py 이름 Start.py').items[3].detail));
    참('Foods — 소문자로', /소문자 foods/.test(find('폴더 이름 Foods').items[0].detail));
    참('다른 폴더 안의 foods — 맨 위로 옮기라고 한다', /foods\/ 가 수행평가\/ 안에 있어요/.test(find('foods 를 다른 폴더 안에').items[0].detail));
    참('foods 밖의 milk.py — foods 안으로 옮기라고 한다', /milk\.py 가 맨 위\(다운로드\)에 있어요 — foods\/ 안으로/.test(find('milk.py 가 foods 밖').items[0].detail));
    참('milk.py.txt — .txt 를 짚는다', /\.txt/.test(find('milk.py.txt').items[0].detail));
    참('Drink — 대소문자', /Drink → drink/.test(find('함수 이름 Drink').items[1].detail));
    참('milk 에 eat — 함수 이름을 짚는다', /함수 이름은 drink\( \) — 지금은 eat\( \)/.test(find('milk 에 eat').items[1].detail));
    참('함수 없이 print 만 — def 를 만들라고 한다', /def drink/.test(find('함수 없이 print 만').items[1].detail));
    참('return — print 로', /return 이 아니라 print/.test(find('print 대신 return').items[1].detail));
    참('문법 오류 — milk.py 를 짚는다', /milk\.py 에 문법 오류/.test(find('milk.py 에 문법 오류').items[1].detail));
    참('foods.py 가림 — 그 파일을 짚는다', /foods\.py 가 foods 폴더를 가렸어요/.test(find('다운로드에 foods.py · __init__ 없음').items[3].detail) && /가렸어요/.test(find('다운로드에 foods.py · __init__ 없음').items[1].detail));
  }
  {
    const p = { files: { ...ANSWER.files, 'foods/milk.py': "def drink():\n    print('신선한 우유 ')\n" } };
    확인('줄 끝 빈칸은 같은 것으로 본다', states(p), 'OOOO');
    const q = { files: { ...ANSWER.files, 'foods/apple.py': "def say(t):\n    print(t)\n\ndef eat():\n    say('새콤한 사과')\n" } };
    확인('함수 안에서 다른 함수를 거쳐도 된다', states(q), 'OOOO');
  }
  {
    // ⚠ 앱 번들에 정답이 들어가면 학생이 읽을 수 있다 — 모범 답 start.py 의 줄이 앱 소스 어디에도 없어야 한다
    const srcs = ['../src/data/assess.js', '../src/lib/checker.js', '../src/screens/assess.js'].map((f) => readFileSync(new URL(f, import.meta.url), 'utf-8'));
    const answerLines = START.split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('#'));
    참('⚠ 앱 소스에 모범 답 start.py 의 줄이 들어 있지 않다', answerLines.every((ln) => srcs.every((s) => !s.includes(ln))));
  }
} else console.log('  (test/local/ 이 없어 모범 답·흔한 실수 시험은 건너뜁니다)');

묶음('문항 자료');
확인('문항 두 부분 — 1점 · 4점', QUESTION.parts.map((x) => x.points), [1, 4]);
확인('문항 전체 5점 = 두 부분의 합', QUESTION.points, QUESTION.parts.reduce((a, x) => a + x.points, 0));
확인('문항 전체 5점', QUESTION.points, 5);
확인('채점 기준의 합 = 문항 점수', RUBRIC.reduce((a, x) => a + x.points, 0), QUESTION.points);
확인('채점 기준 — 2번 칸은 점검기 칸과 같은 글자', RUBRIC.filter((x) => x.no === 2).map((x) => x.what), CONDITIONS.map((c) => c.title));
확인('채점 기준 — 2번 칸 수 = 2번의 점수', RUBRIC.filter((x) => x.no === 2).length, QUESTION.parts[1].points);
참('압축 파일 이름 예가 그대로 있다', QUESTION.parts[0].lines.join(' ').includes('모듈패키지30101홍길동.zip'));
참('문항 글에 모듈·함수 이름이 다 있다', MODULES.every((m) => JSON.stringify(QUESTION.parts[1].lines).includes(`${m.mod}.py`) && JSON.stringify(QUESTION.parts[1].lines).includes(`<code>${m.fn}</code>`)));
참('폴더 그림에 모듈 두 개가 다 있다', MODULES.every((m) => GOAL_TREE.some(([, t]) => t.includes(`${m.mod}.py`))));

묶음('import 꼴 가려내기 (③ 탭 미션 3 이 쓴다)');
확인('세 가지 꼴', importForms('import p.a\nfrom p import b\nfrom p.c import f\n', 'p').forms, ['A', 'B', 'C']);
확인('as 를 붙여도 같은 꼴', importForms('import p.a as x\n', 'p').forms, ['A']);
확인('import 패키지 만은 꼴로 세지 않는다', importForms('import p\n', 'p'), { forms: [], usesPkg: true });
확인('다른 패키지는 세지 않는다', importForms('from q import a\nimport math\n', 'p').forms, []);
확인('문법 오류면 빈 목록', importForms('import p.a\nfrom', 'p').forms, []);

묶음('화면의 오류 고치기 판정과 시험의 판정이 같은 글자');
{
  const src = readFileSync(new URL('../src/screens/imports.js', import.meta.url), 'utf-8');
  const body = (s) => s.slice(s.indexOf('{', s.indexOf('(fx, r, p)')), s.indexOf('\n}', s.indexOf('(fx, r, p)')) + 2);
  const helper = readFileSync(new URL('./helpers.mjs', import.meta.url), 'utf-8');
  확인('fixPassed 본문이 같다', body(src).trim(), body(helper).trim());
  참('fixPassedForTest 를 쓰고 있다', typeof fixPassedForTest === 'function');
}
