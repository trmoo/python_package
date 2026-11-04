/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  수행평가 「사용자 정의 패키지 제작」 조건 점검기.
 *  ⚠ 채점기가 아니라 자기 점검 도구다 — 규칙으로 훑어보는 것이라 사람처럼 읽지 못한다.
 *    최종 점수는 선생님이 실제 파일을 보고 정한다. (화면·README·LICENSE 에 밝혀 둔다)
 *  ⚠ node 로 불러다 시험하므로 여기서 DOM 을 만지지 말 것.
 */
import { runProject } from './pymini.js';
import { allDirs, parentOf, baseName, defsOf, importsOf, syntaxOk } from './project.js';

/** 수행평가 조건 여섯 가지 (2026-11-04 선생님과 정함) */
export const CONDITIONS = [
  { id: 'pkg', title: '패키지 폴더 1개', sub: '이름은 영문 소문자 (예: mytools)' },
  { id: 'init', title: '그 안에 __init__.py', sub: '「이 폴더는 패키지입니다」 표지판 (빈 파일이어도 된다)' },
  { id: 'mods', title: '모듈 2개 이상', sub: '모듈마다 함수(def) 1개 이상' },
  { id: 'main', title: '패키지 밖의 main.py 에서 불러오기', sub: 'main.py 는 맨 위, 패키지 폴더와 나란히' },
  { id: 'forms', title: '서로 다른 import 꼴 2가지 이상', sub: 'import 패키지.모듈 · from 패키지 import 모듈 · from 패키지.모듈 import 함수' },
  { id: 'run', title: 'main.py 를 실행하면 모든 모듈이 오류 없이', sub: '모듈마다 함수가 한 번 이상 불려 결과가 나온다' },
];

/** import 꼴 이름 */
export const FORM_NAMES = {
  A: 'import 패키지.모듈',
  B: 'from 패키지 import 모듈',
  C: 'from 패키지.모듈 import 함수',
};

const NEAR_INIT = /^(_?_?init_?_?(\.py)?(\.txt)?|__init__\.py\.txt|__init__\.txt|__init__|__Init__\.py|__INIT__\.py|init\.py)$/;

/** 패키지 후보 — 맨 위 폴더 가운데 .py 파일을 담은 것 (__pycache__ 는 뺀다) */
function packageCandidates(p) {
  return allDirs(p).filter((d) => !d.includes('/') && d !== '__pycache__').map((d) => {
    const inside = Object.keys(p.files).filter((f) => f.startsWith(d + '/'));
    const mods = inside.filter((f) => f.endsWith('.py') && baseName(f) !== '__init__.py');
    return { dir: d, init: p.files[`${d}/__init__.py`] !== undefined, mods, inside };
  }).filter((c) => c.mods.length || c.init)
    .sort((a, b) => (b.init - a.init) || (b.mods.length - a.mods.length));
}

/** main.py 의 import 문이 패키지를 어떤 꼴로 부르는지 */
export function importForms(src, pkg) {
  const st = importsOf(src) || [];
  const forms = new Set();
  let usesPkg = false;
  for (const s of st) {
    if (s.type === 'Import') {
      for (const al of s.names) {
        if (al.name === pkg) usesPkg = true;
        if (al.name.startsWith(pkg + '.')) { forms.add('A'); usesPkg = true; }
      }
    } else if (s.type === 'FromImport' && !s.level) {
      if (s.mod === pkg) { forms.add('B'); usesPkg = true; }
      if (s.mod.startsWith(pkg + '.')) { forms.add('C'); usesPkg = true; }
    }
  }
  return { forms: [...forms].sort(), usesPkg };
}

/**
 * p: 프로젝트 { files, dirs }
 * 돌려주는 것: { items: [{id, state: 'ok'|'part'|'no', detail}], level, levelText, pkg, run }
 */
export function check(p) {
  const items = {};
  const set = (id, state, detail) => { items[id] = { id, state, detail }; };
  const cands = packageCandidates(p);
  const c = cands[0] || null;
  const pkg = c ? c.dir : null;

  // ① 패키지 폴더
  if (!c) {
    const anyDir = allDirs(p).filter((d) => d !== '__pycache__').length;
    set('pkg', 'no', anyDir ? '폴더는 있지만 그 안에 .py 파일이 없어요.' : '아직 폴더가 없어요. 탐색기의 📁 로 만들어 보세요.');
  } else if (/^[a-z][a-z0-9_]*$/.test(pkg)) {
    set('pkg', 'ok', `📦 ${pkg}/`);
  } else {
    set('pkg', 'part', `「${pkg}」 — 영문 소문자로 지어 주세요${/[-\s]/.test(pkg) ? ' (붙임표·빈칸이 들어가면 import 할 수 없어요)' : /[A-Z]/.test(pkg) ? ' (대문자가 섞였어요)' : ''}.`);
  }

  // ② __init__.py
  if (!c) set('init', 'no', '패키지 폴더가 먼저 있어야 해요.');
  else if (c.init) set('init', 'ok', `${pkg}/__init__.py`);
  else {
    const near = c.inside.find((f) => parentOf(f) === pkg && NEAR_INIT.test(baseName(f)));
    set('init', near ? 'part' : 'no', near
      ? `「${baseName(near)}」 — 이름이 정확히 __init__.py 여야 해요 (앞뒤 밑줄 두 개씩, 끝은 .py).`
      : `${pkg}/ 안에 __init__.py 가 없어요. 없어도 실행은 되지만 수행평가 조건이에요.`);
  }

  // ③ 모듈 2개 이상, 함수 1개 이상
  if (!c) set('mods', 'no', '패키지 폴더 안에 모듈(.py)을 만들어 주세요.');
  else {
    const bad = c.mods.filter((f) => !syntaxOk(p.files[f]));
    const noDef = c.mods.filter((f) => syntaxOk(p.files[f]) && !defsOf(p.files[f]).length);
    const good = c.mods.filter((f) => syntaxOk(p.files[f]) && defsOf(p.files[f]).length);
    const list = c.mods.map((f) => baseName(f)).join(', ') || '없음';
    if (good.length >= 2 && !bad.length && !noDef.length) set('mods', 'ok', `${c.mods.length}개 — ${list}`);
    else if (c.mods.length) {
      const why = [];
      if (c.mods.length < 2) why.push(`모듈이 ${c.mods.length}개뿐이에요`);
      if (noDef.length) why.push(`${noDef.map(baseName).join(', ')} 에 def 함수가 없어요`);
      if (bad.length) why.push(`${bad.map(baseName).join(', ')} 에 문법 오류가 있어요`);
      set('mods', 'part', why.join(' · ') + '.');
    } else set('mods', 'no', `${pkg}/ 안에 모듈(.py)이 없어요.`);
  }

  // ④ main.py
  const main = p.files['main.py'];
  const mainInPkg = Object.keys(p.files).find((f) => baseName(f) === 'main.py' && f !== 'main.py');
  let forms = { forms: [], usesPkg: false };
  if (main === undefined) {
    set('main', mainInPkg ? 'part' : 'no', mainInPkg ? `main.py 가 ${parentOf(mainInPkg)}/ 안에 있어요. 패키지 밖(맨 위)으로 옮겨 주세요.` : '맨 위에 main.py 가 없어요.');
  } else if (!pkg) {
    set('main', 'no', 'main.py 는 있어요. 이제 패키지를 만들어 불러오세요.');
  } else {
    forms = importForms(main, pkg);
    if (importsOf(main) === null) set('main', 'part', 'main.py 에 문법 오류가 있어요.');
    else if (forms.usesPkg) set('main', 'ok', `main.py 가 ${pkg} 를 불러와요.`);
    else set('main', 'part', `main.py 가 아직 ${pkg} 를 불러오지 않아요.`);
  }

  // ⑤ import 꼴
  if (!pkg || main === undefined) set('forms', 'no', '패키지와 main.py 가 먼저 있어야 해요.');
  else if (forms.forms.length >= 2) set('forms', 'ok', forms.forms.map((f) => FORM_NAMES[f]).join(' / '));
  else if (forms.forms.length === 1) set('forms', 'part', `지금은 「${FORM_NAMES[forms.forms[0]]}」 한 가지뿐이에요. 다른 꼴을 하나 더 써 보세요.`);
  else set('forms', 'no', forms.usesPkg ? 'import 패키지 만으로는 안의 모듈이 따라오지 않아요. 세 가지 꼴 가운데 두 가지를 써 보세요.' : '패키지를 부르는 import 문이 없어요.');

  // ⑥ 실행
  let r = null;
  if (main === undefined) set('run', 'no', 'main.py 가 없어 실행할 수 없어요.');
  else {
    r = runProject({ files: p.files, dirs: p.dirs, entry: 'main.py' });
    const mods = c ? c.mods.filter((f) => syntaxOk(p.files[f]) && defsOf(p.files[f]).length) : [];
    const used = mods.filter((f) => r.calls.some((k) => k.file === f));
    const unused = mods.filter((f) => !used.includes(f));
    if (r.ok && mods.length && !unused.length && r.stdout) set('run', 'ok', `모듈 ${mods.length}개의 함수가 모두 불려 결과가 나왔어요.`);
    else if (r.ok && !mods.length) set('run', r.stdout ? 'part' : 'no', '실행은 되지만 패키지 모듈의 함수를 부르지 않았어요.');
    else if (r.ok) set('run', 'part', unused.length ? `실행은 되지만 ${unused.map(baseName).join(', ')} 의 함수는 한 번도 불리지 않았어요.` : '실행은 되지만 화면에 나온 것이 없어요.');
    else if (used.length || r.stdout) set('run', 'part', `일부는 실행되었지만 ${r.errorType} 가 났어요.`);
    else set('run', 'no', `실행하자마자 ${r.errorType || '오류'} 가 났어요.`);
  }

  const list = CONDITIONS.map((x) => items[x.id]);
  const firstFive = list.slice(0, 5);
  const allFive = firstFive.every((x) => x.state === 'ok');
  let level, levelText;
  if (allFive && items.run.state === 'ok') { level = 5; levelText = '조건을 모두 지켜 패키지를 만들고 모듈을 올바르게 실행시켰어요.'; }
  else if (allFive) { level = 4; levelText = items.run.state === 'part' ? '조건은 모두 지켰지만 모듈이 일부만 올바르게 실행돼요.' : '조건은 모두 지켰지만 실행이 되지 않아요. (실행이 전혀 안 되면 선생님이 다르게 판단할 수 있어요)'; }
  else if (firstFive.some((x) => x.state !== 'no')) { level = 3; levelText = '조건을 일부만 지켰어요. ⬜ 칸을 채워 보세요.'; }
  else if (allDirs(p).length || Object.keys(p.files).some((f) => f !== 'main.py') || (main || '').trim().replace(/^#.*$/gm, '').trim()) { level = 2; levelText = '폴더·파일을 만들기 시작했어요.'; }
  else { level = 1; levelText = '아직 시작하지 않았어요.'; }
  return { items: list, level, levelText, pkg, run: r };
}
