/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  수행평가 조건 점검기 — 여러 모습의 프로젝트를 넣어 칸마다 ✅ / 🟨 / ⬜ 가 맞게 켜지는지.
 */
import { readFileSync } from 'node:fs';
import { 묶음, 확인, 참 } from './harness.mjs';
import { check, importForms } from '../src/lib/checker.js';
import { fixPassedForTest } from './helpers.mjs';
import { MISSIONS } from '../src/data/missions.js';
import { PRACTICE_START } from '../src/data/assess.js';

const states = (p) => check(p).items.map((x) => (x.state === 'ok' ? 'O' : x.state === 'part' ? 'P' : '.')).join('');
const M = (id) => MISSIONS.find((m) => m.id === id).answer;

묶음('조건 점검기 — 대표 모습');
확인('처음(빈 main.py) — 1점 수준', check(PRACTICE_START).level, 1);
확인('처음 — 칸 모두 비어 있음', states(PRACTICE_START), '......');
확인('미션 3 답 — 여섯 칸 모두 ✅', states(M('m3')), 'OOOOOO');
확인('미션 3 답 — 5점 수준', check(M('m3')).level, 5);
확인('미션 2 답 — 모듈이 하나·꼴이 하나', states(M('m2')), 'OOPOPO');
확인('미션 2 답 — 3점 수준', check(M('m2')).level, 3);
{
  const p = { files: { ...M('m3').files } }; delete p.files['mytools/__init__.py'];
  확인('__init__.py 를 빼면 ② 만 ⬜ — 실행은 그대로 된다', states(p), 'O.OOOO');
  확인('__init__.py 를 빼면 3점 수준 (조건 일부)', check(p).level, 3);
  p.files['mytools/_init_.py'] = '';
  확인('밑줄을 하나씩만 쓴 _init_.py 는 🟨 로 알려 준다', states(p).slice(1, 2), 'P');
}
{
  const p = { files: { ...M('m3').files, 'main.py': 'from mytools import greet\nfrom mytools.calc import add\n\ngreet.hello("민지")\n' } };
  확인('calc 모듈 함수를 안 부르면 ⑥ 🟨', states(p), 'OOOOOP');
  확인('그때는 4점 수준', check(p).level, 4);
}
{
  const p = { files: { ...M('m3').files, 'main.py': 'from mytools import greet\nfrom mytools.calc import add\n\ngreet.hello("민지")\nprint(add(2, "3"))\n' } };
  확인('실행 중간에 오류 — ⑥ 🟨, 4점 수준', [states(p), check(p).level], ['OOOOOP', 4]);
}
{
  const files = {};
  for (const [k, v] of Object.entries(M('m3').files)) files[k.replace(/^mytools\//, 'MyTools/')] = v;
  files['main.py'] = files['main.py'].replace(/mytools/g, 'MyTools');
  확인('대문자 패키지 이름은 ① 🟨', states({ files }).slice(0, 1), 'P');
}
{
  const p = { files: { ...M('m3').files } };
  p.files['mytools/main.py'] = p.files['main.py']; delete p.files['main.py'];
  확인('main.py 가 패키지 안에 있으면 ④ 🟨', states(p).slice(3, 4), 'P');
}
{
  const p = { files: { ...M('m3').files, 'mytools/empty.py': '# 아직 비어 있음\n' } };
  확인('함수 없는 모듈이 섞이면 ③ 🟨', states(p).slice(2, 3), 'P');
}
확인('폴더만 만들면 2점 수준', check({ files: { 'main.py': '' }, dirs: ['mytools'] }).level, 2);

묶음('import 꼴 가려내기');
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
