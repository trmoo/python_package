/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  수행평가 문항(2026-11-05 선생님이 주신 것) 「2. 사용자 정의 패키지 제작」 조건 점검기.
 *  foods 패키지(drinks · fruits) + 다운로드 폴더의 start.py.
 *  ⚠ 채점기가 아니라 자기 점검 도구다 — 규칙으로 훑어보는 것이라 사람처럼 읽지 못한다.
 *    최종 점수는 선생님이 실제 파일을 보고 정한다. (화면·README·LICENSE 에 밝혀 둔다)
 *  ⚠ 「1. IDLE 사용 환경·압축 제출」 은 앱이 확인할 수 없다 — 화면에 따로 적어 둔다.
 *  ⚠ 정답 코드는 여기 두지 않는다(앱 번들에 들어가 학생이 읽을 수 있다). 시험 파일에만 둔다.
 *  ⚠ node 로 불러다 시험하므로 여기서 DOM 을 만지지 말 것.
 */
import { runProject } from './pymini.js';
import { allDirs, parentOf, baseName, defsOf, importsOf, syntaxOk } from './project.js';

/** 문항이 정한 패키지 — 하위 패키지 · 함수 이름 · 모듈과 출력 문구 (출력 예의 차례) */
export const SPEC = [
  { sub: 'drinks', fn: 'drink', mods: [['milk', '신선한 우유'], ['cola', '상쾌한 콜라'], ['water', '깨끗한 생수']] },
  { sub: 'fruits', fn: 'eat', mods: [['orange', '맛있는 오렌지'], ['watermelon', '시원한 수박'], ['apple', '새콤한 사과']] },
];
export const PKG = 'foods';
export const ENTRY = 'start.py';
/** 모듈 여섯 개를 한 줄씩 — { path, sub, mod, fn, text } */
export const MODULES = SPEC.flatMap((s) => s.mods.map(([mod, text]) => ({ path: `${PKG}/${s.sub}/${mod}.py`, sub: s.sub, mod, fn: s.fn, text })));
/** start.py 를 실행했을 때 나와야 하는 여섯 줄 */
export const EXPECTED = MODULES.map((m) => m.text);

/** 조건 여섯 가지 — 문항 「2. 사용자 정의 패키지 제작」 을 앱이 볼 수 있는 단위로 나눈 것 */
export const CONDITIONS = [
  { id: 'dirs', title: 'foods 폴더 ⊃ drinks · fruits 폴더', sub: '다운로드 폴더(맨 위)에 foods, foods 안에 drinks 와 fruits' },
  { id: 'drinks', title: 'drinks/ 에 milk.py · cola.py · water.py', sub: '세 파일 모두 foods/drinks/ 안에' },
  { id: 'fruits', title: 'fruits/ 에 orange.py · watermelon.py · apple.py', sub: '세 파일 모두 foods/fruits/ 안에' },
  { id: 'defs', title: '함수 이름 — drinks 는 drink( ), fruits 는 eat( )', sub: '모듈마다 def 로 직접 만든 함수' },
  { id: 'texts', title: '함수를 부르면 정해진 문구 출력', sub: '신선한 우유 · 상쾌한 콜라 · 깨끗한 생수 · 맛있는 오렌지 · 시원한 수박 · 새콤한 사과' },
  { id: 'run', title: 'start.py 가 import 하고 함수를 불러 여섯 줄 출력', sub: '출력 예와 같은 차례로' },
];
/** 문항 조건은 아니지만 함께 보여 주는 것 */
export const EXTRA = { id: 'init', title: '＋ __init__.py (권장 · 문항 조건은 아님)', sub: '「이 폴더는 패키지」 표지판 — foods · drinks · fruits 세 곳' };

/** import 꼴 이름 — ③ 탭 미션 3 이 쓴다 */
export const FORM_NAMES = {
  A: 'import 패키지.모듈',
  B: 'from 패키지 import 모듈',
  C: 'from 패키지.모듈 import 함수',
};

/** 파일 하나가 패키지를 어떤 꼴로 부르는지 — ③ 탭 미션 3 이 쓴다 */
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

const NEAR_INIT = /^(_?_?init_?_?(\.py)?(\.txt)?|__init__\.py\.txt|__init__\.txt|__init__|__Init__\.py|__INIT__\.py|init\.py)$/;
const low = (s) => s.toLowerCase();
const lines = (r) => { const a = r.lines.map((x) => x.replace(/\s+$/, '')); while (a.length && a[a.length - 1] === '') a.pop(); return a; };
const quote = (s) => `「${s}」`;
/** 점검용으로 잠깐 더해 실행하는 파일 이름 — 학생 파일과 겹치지 않게 */
const PROBE = '__pkg_check__.py';
const SHADOW_HINT = `맨 위의 ${PKG}.py 가 ${PKG} 폴더를 가렸어요 — 그 파일 이름을 바꾸거나 ${PKG}/ 안에 __init__.py 를 넣어 주세요`;

/** [뒷말, 이름] 들을 같은 뒷말끼리 묶는다 — 「milk.py · cola.py 가 없어요」. 이름이 빈 것은 뒷말이 곧 한 줄 */
function grouped(pairs) {
  const order = [], by = new Map();
  for (const [tail, name] of pairs) {
    if (!name) { order.push(tail); continue; }
    if (!by.has(tail)) { by.set(tail, []); order.push(by.get(tail)); by.get(tail).tail = tail; }
    by.get(tail).push(name);
  }
  return order.map((x) => (typeof x === 'string' ? x : `${x.join(' · ')}${x.tail}`));
}

/** 대소문자만 다른 같은 자리가 있는가 (윈도우 탐색기에서는 같아 보이지만 import 는 가린다) */
function caseTwin(list, path) {
  return list.find((x) => x !== path && low(x) === low(path)) || null;
}

/**
 * p: 프로젝트 { files, dirs }
 * 돌려주는 것: { items: [{id, state: 'ok'|'part'|'no', detail}], extra, okCount, total, allOk, summary, run }
 */
export function check(p) {
  const items = {};
  const set = (id, state, detail) => { items[id] = { id, state, detail }; };
  const files = Object.keys(p.files);
  const dirs = allDirs(p).filter((d) => !d.split('/').includes('__pycache__'));
  // 맨 위의 foods.py 가 __init__.py 없는 foods 폴더를 가린다 (이름공간 패키지는 같은 이름의 .py 보다 나중에 찾는다)
  const shadow = p.files[`${PKG}.py`] !== undefined && p.files[`${PKG}/__init__.py`] === undefined;

  // ① foods / drinks / fruits 폴더
  {
    const need = [PKG, ...SPEC.map((s) => `${PKG}/${s.sub}`)];
    const have = need.filter((d) => dirs.includes(d));
    const hints = [];
    for (const d of need) {
      if (dirs.includes(d)) continue;
      const twin = caseTwin(dirs, d);
      const name = baseName(d);
      const stray = dirs.find((x) => baseName(x) === name && x !== d);
      if (twin && baseName(twin) === name) continue; // 위 폴더의 대소문자 문제 — 그쪽에서 알려 준다
      if (twin) hints.push(`${quote(baseName(twin))} — 소문자 ${name} 로 지어 주세요 (import 는 대소문자를 따져요)`);
      else if (stray) hints.push(`${name}/ 가 ${parentOf(stray) ? `${parentOf(stray)}/ 안에` : '맨 위에'} 있어요 — ${parentOf(d) ? `${parentOf(d)}/ 안으로` : '맨 위로'} 옮겨 주세요`);
      else if (d !== PKG || !have.length) hints.push(`${d}/ 가 없어요`);
    }
    if (have.length === need.length) set('dirs', 'ok', '📁 foods/ ⊃ 📁 drinks/ · 📁 fruits/');
    else if (have.length || hints.some((x) => !x.endsWith('없어요'))) set('dirs', 'part', hints.join(' · ') + '.');
    else set('dirs', 'no', dirs.length ? '폴더 이름이 문항과 달라요 — foods, 그 안에 drinks 와 fruits.' : '아직 폴더가 없어요. 탐색기의 📁 로 foods 부터 만들어 보세요.');
  }

  // ②③ 모듈 파일 세 개씩
  for (const s of SPEC) {
    const need = MODULES.filter((m) => m.sub === s.sub);
    const have = need.filter((m) => p.files[m.path] !== undefined);
    const pairs = [];   // [뒷말, 파일 이름] — 같은 까닭은 한 줄로 묶어 알린다
    for (const m of need) {
      if (p.files[m.path] !== undefined) continue;
      const fname = `${m.mod}.py`;
      const twin = caseTwin(files, m.path);
      const txt = files.find((f) => low(f) === low(m.path) + '.txt');
      const stray = files.find((f) => baseName(f) === fname && f !== m.path);
      if (twin && baseName(twin) === fname) pairs.push([` 는 있지만 폴더 이름의 대소문자가 달라요 (${parentOf(twin)}/)`, fname]);
      else if (twin) pairs.push([`${quote(baseName(twin))} → ${fname}`, '']);
      else if (txt) pairs.push([`${quote(baseName(txt))} — 끝이 .txt 예요. 이름이 정확히 ${fname} 여야 해요`, '']);
      else if (stray) pairs.push([` 가 ${parentOf(stray) ? `${parentOf(stray)}/ 안에` : '맨 위에'} 있어요 — foods/${s.sub}/ 로 옮겨 주세요`, fname]);
      else pairs.push([' 가 없어요', fname]);
    }
    const hints = grouped(pairs);
    if (have.length === need.length) set(s.sub, 'ok', need.map((m) => `${m.mod}.py`).join(' · '));
    else if (have.length || hints.some((x) => !x.endsWith('없어요'))) set(s.sub, 'part', hints.join(' · ') + '.');
    else set(s.sub, 'no', `foods/${s.sub}/ 안에 ${need.map((m) => `${m.mod}.py`).join(' · ')} 를 만들어 주세요.`);
  }

  // ④ 함수 이름 — 있는 모듈만 본다(없는 파일은 ②③ 에서 알려 준다)
  const present = MODULES.filter((m) => p.files[m.path] !== undefined);
  const withDef = [];
  {
    const hints = [];
    for (const m of present) {
      const src = p.files[m.path];
      if (!syntaxOk(src)) { hints.push(`${m.mod}.py 에 문법 오류가 있어요`); continue; }
      const defs = defsOf(src);
      if (defs.includes(m.fn)) { withDef.push(m); continue; }
      const twin = defs.find((d) => low(d) === m.fn);
      const other = defs.find((d) => d === (m.fn === 'drink' ? 'eat' : 'drink'));
      if (twin) hints.push(`${m.mod}.py 의 ${twin} → ${m.fn} (대소문자)`);
      else if (other) hints.push(`${m.mod}.py 는 ${m.sub} 의 모듈이라 함수 이름이 ${m.fn}( ) — 지금은 ${other}( )`);
      else if (defs.length) hints.push(`${m.mod}.py 에 만들 것: def ${m.fn}( ) (지금은 ${defs.join(', ')} 만 있어요)`);
      else hints.push(`${m.mod}.py 에 만들 것: def ${m.fn}( )`);
    }
    if (!present.length) set('defs', 'no', '모듈 파일을 먼저 만들어 주세요.');
    else if (withDef.length === MODULES.length) set('defs', 'ok', 'drink( ) 셋 · eat( ) 셋');
    else if (!hints.length) set('defs', 'part', `지금 있는 ${present.length}개는 맞아요 — 남은 모듈도 만들어 주세요.`);
    else set('defs', withDef.length ? 'part' : 'no', hints.join(' · ') + '.');
  }

  // ⑤ 문구 — 모듈을 따로 불러 함수를 한 번 불러 본다 (불러오기만 했을 때 나오는 것도 본다)
  {
    const hints = [];
    const noisy = [];   // 불러오기만 해도 출력이 나오는 모듈
    const failed = [];  // [오류 종류, 파일 이름] — 불러오지도 못한 모듈
    let good = 0, fine = 0;   // good = 흠 없음, fine = 함수의 출력만은 맞음
    for (const m of withDef) {
      const imp = `from ${PKG}.${m.sub} import ${m.mod}\n`;
      const only = runProject({ files: { ...p.files, [PROBE]: imp }, dirs: p.dirs, entry: PROBE });
      if (!only.ok) { failed.push([` 를 불러오지 못했어요 (${only.errorType})`, `${m.mod}.py`]); continue; }
      const r = runProject({ files: { ...p.files, [PROBE]: imp + `${m.mod}.${m.fn}()\n` }, dirs: p.dirs, entry: PROBE });
      const before = lines(only);
      const out = lines(r).slice(before.length);
      if (before.length) noisy.push(`${m.mod}.py`);
      if (!r.ok) hints.push(`${m.mod}.${m.fn}( ) 에서 ${r.errorType} 가 나요`);
      else if (!out.length) hints.push(`${m.mod}.${m.fn}( ) — 아무것도 출력하지 않아요. return 이 아니라 print 로`);
      else if (out.length > 1 || out[0] !== m.text) hints.push(`${m.mod}.${m.fn}( ) → ${quote(out.join(' / '))} (띄어쓰기까지 ${quote(m.text)} 여야 해요)`);
      else { fine++; if (!before.length) good++; }
    }
    hints.unshift(...grouped(failed));
    if (failed.length && shadow) hints.unshift(SHADOW_HINT);
    if (noisy.length) hints.unshift(`${noisy.join(' · ')} — 불러오기만 해도 출력이 나와요. 파일 맨 아래에서 함수를 부르고 있지 않나요? start.py 에서 두 번씩 나와요`);
    if (!withDef.length) set('texts', 'no', '함수를 먼저 만들어 주세요.');
    else if (good === MODULES.length) set('texts', 'ok', '여섯 함수 모두 정해진 문구를 한 줄씩');
    else if (!hints.length) set('texts', 'part', present.length === MODULES.length ? `함수가 맞게 만들어진 ${good}개는 문구도 맞아요 — ④ 를 먼저 고쳐 주세요.` : `지금 있는 ${good}개는 맞아요 — 남은 모듈도 만들어 주세요.`);
    else set('texts', fine ? 'part' : 'no', hints.join(' · ') + '.');
  }

  // ⑥ start.py 실행
  let r = null;
  {
    const main = p.files[ENTRY];
    const misplaced = files.find((f) => baseName(f) === ENTRY && f !== ENTRY);
    const twin = caseTwin(files, ENTRY);
    if (main === undefined) {
      set('run', twin || misplaced ? 'part' : 'no', twin ? `${quote(twin)} → start.py` : misplaced ? `start.py 가 ${parentOf(misplaced)}/ 안에 있어요 — foods 와 나란히, 맨 위(다운로드)로 옮겨 주세요.` : '맨 위(다운로드)에 start.py 가 없어요.');
    } else {
      r = runProject({ files: p.files, dirs: p.dirs, entry: ENTRY });
      const got = lines(r);
      const calls = MODULES.filter((m) => r.calls.some((k) => k.file === m.path && k.name === m.fn));
      const same = got.length === EXPECTED.length && got.every((x, i) => x === EXPECTED[i]);
      const usesPkg = (importsOf(main) || []).some((s) => (s.type === 'Import' && s.names.some((al) => al.name === PKG || al.name.startsWith(PKG + '.'))) || (s.type === 'FromImport' && !s.level && (s.mod === PKG || s.mod.startsWith(PKG + '.'))));
      const counts = {};
      got.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
      const repeated = Object.entries(counts).find(([x, n]) => n > 1 && EXPECTED.includes(x));
      const missing = EXPECTED.filter((x) => !got.includes(x));
      if (importsOf(main) === null) set('run', 'part', 'start.py 에 문법 오류가 있어요.');
      else if (same && calls.length === MODULES.length) set('run', 'ok', '모듈 여섯 개의 함수를 불러 출력 예와 똑같이 여섯 줄');
      else if (same) set('run', 'part', `출력은 같지만 부르지 않은 함수가 있어요: ${MODULES.filter((m) => !calls.includes(m)).map((m) => `${m.mod}.${m.fn}( )`).join(', ')} — start.py 에서 print 로 직접 쓰지 말고 모듈의 함수를 불러요.`);
      else if (!r.ok && shadow && r.errorType === 'ModuleNotFoundError') set('run', got.length ? 'part' : 'no', `${SHADOW_HINT}.`);
      else if (!r.ok) set('run', got.length ? 'part' : 'no', `${got.length ? `${got.length}줄 나온 뒤` : '실행하자마자'} ${r.errorType} 가 났어요 — 터미널의 맨 아래 줄을 읽어 보세요.`);
      else if (!usesPkg) set('run', got.length ? 'part' : 'no', got.length ? 'start.py 가 foods 패키지를 import 하지 않았어요.' : '아직 아무것도 출력하지 않아요 — foods 패키지를 import 하고 함수를 불러 보세요.');
      else if (got.includes('None')) set('run', 'part', 'None 이 찍혀요 — print( ) 안에서 함수를 부르지 않았나요? 함수가 이미 print 해요.');
      else if (got.length === EXPECTED.length * 2 && EXPECTED.every((x) => counts[x] === 2)) set('run', 'part', '여섯 줄이 두 번씩 나와요 — 모듈 파일 맨 아래에서 함수를 부르고 있지 않나요?');
      else if (repeated) set('run', 'part', `${quote(repeated[0])} — ${repeated[1]}번 나와요. 이름이 같은 함수끼리 서로 덮어쓰지 않았나요? 모듈 이름으로 구별해 불러 보세요.`);
      else if (!missing.length && got.length === EXPECTED.length) set('run', 'part', '여섯 줄이 다 나왔지만 차례가 출력 예와 달라요.');
      else if (!got.length) set('run', 'no', '아직 아무것도 출력하지 않아요 — 함수를 불러 보세요.');
      else set('run', 'part', missing.length ? `${missing.length}줄이 빠졌어요: ${missing.map(quote).join(' ')}` : `출력이 출력 예와 달라요 — ${got.length}줄이 나왔어요.`);
    }
  }

  // ＋ __init__.py (점수에 넣지 않는다)
  let extra;
  {
    const need = [PKG, ...SPEC.map((s) => `${PKG}/${s.sub}`)];
    const where = need.filter((d) => dirs.includes(d));
    const has = need.filter((d) => p.files[`${d}/__init__.py`] !== undefined);
    const near = files.find((f) => where.includes(parentOf(f)) && baseName(f) !== '__init__.py' && NEAR_INIT.test(baseName(f)));
    if (!where.length) extra = { id: 'init', state: 'no', detail: '폴더를 먼저 만들어 주세요.' };
    else if (near) extra = { id: 'init', state: 'part', detail: `${quote(baseName(near))} — 이름이 정확히 __init__.py 여야 해요 (앞뒤 밑줄 두 개씩, 끝은 .py).` };
    else if (has.length === need.length) extra = { id: 'init', state: 'ok', detail: 'foods · drinks · fruits 세 곳 모두' };
    else if (has.length) extra = { id: 'init', state: 'part', detail: `${need.filter((d) => !has.includes(d)).map((d) => `${d}/`).join(' · ')} 에는 아직 없어요.` };
    else extra = { id: 'init', state: 'no', detail: '없어도 실행은 되지만, 넣어 두면 「패키지」 라는 것이 분명해요.' };
  }

  const list = CONDITIONS.map((x) => items[x.id]);
  const okCount = list.filter((x) => x.state === 'ok').length;
  const allOk = okCount === list.length;
  const started = files.some((f) => f !== ENTRY) || dirs.length || (p.files[ENTRY] || '').replace(/^#.*$/gm, '').trim();
  const summary = allOk
    ? '「2. 사용자 정의 패키지 제작」 의 조건을 모두 지켰어요. 이제 IDLE 에서 똑같이 만들어 압축해 보세요(「IDLE 에서」 화면).'
    : started ? '⬜ · 🟨 칸을 채워 보세요. 칸의 설명이 실마리예요.' : '아직 시작하지 않았어요. 탐색기의 📁 로 foods 폴더부터 만들어 보세요.';
  return { items: list, extra, okCount, total: list.length, allOk, summary, run: r };
}
