/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  수행평가 문항 「2. 사용자 정의 패키지 제작」 조건 점검기.
 *  2026-11-11 사용자 지시로 문항을 5점짜리로 줄였다 — foods 패키지 하나에 모듈 둘(milk · apple) + 다운로드 폴더의 start.py.
 *  (2026-11-05 의 drinks · fruits 하위 패키지와 모듈 여섯 개는 뺐다)
 *  점검 칸 네 개 = 문항 2번의 4점(칸 하나에 1점). 1번(IDLE·압축 1점)은 앱이 볼 수 없다.
 *  ⚠ 채점기가 아니라 자기 점검 도구다 — 규칙으로 훑어보는 것이라 사람처럼 읽지 못한다.
 *    최종 점수는 선생님이 실제 파일을 보고 정한다. (화면·README·LICENSE 에 밝혀 둔다)
 *  ⚠ 정답 코드는 여기 두지 않는다(앱 번들에 들어가 학생이 읽을 수 있다). 시험 파일에만 둔다.
 *  ⚠ node 로 불러다 시험하므로 여기서 DOM 을 만지지 말 것.
 */
import { runProject } from './pymini.js';
import { allDirs, parentOf, baseName, defsOf, importsOf, syntaxOk } from './project.js';

export const PKG = 'foods';
export const ENTRY = 'start.py';
/** 문항이 정한 모듈 — 파일 · 함수 이름 · 출력 문구 (출력 예의 차례) */
export const MODULES = [
  { mod: 'milk', fn: 'drink', text: '신선한 우유' },
  { mod: 'apple', fn: 'eat', text: '새콤한 사과' },
].map((m) => ({ ...m, path: `${PKG}/${m.mod}.py` }));
/** start.py 를 실행했을 때 나와야 하는 줄 */
export const EXPECTED = MODULES.map((m) => m.text);

/** 조건 네 가지 — 문항 「2. 사용자 정의 패키지 제작」(4점)을 칸 하나에 1점씩 */
export const CONDITIONS = [
  { id: 'files', title: `${PKG} 폴더 안에 ${MODULES.map((m) => `${m.mod}.py`).join(' · ')}`, sub: `다운로드 폴더(맨 위)에 ${PKG}, 그 안에 두 파일` },
  ...MODULES.map((m) => ({ id: m.mod, title: `${m.mod}.py 의 ${m.fn}( ) → 「${m.text}」 출력`, sub: 'def 로 직접 만든 함수' })),
  { id: 'run', title: `start.py 가 import 하고 두 함수를 불러 두 줄 출력`, sub: '출력 예와 같은 차례로' },
];
/** 문항 조건은 아니지만 함께 보여 주는 것 */
export const EXTRA = { id: 'init', title: '＋ __init__.py (권장 · 문항 조건은 아님)', sub: `「이 폴더는 패키지」 표지판 — ${PKG}/ 안에` };

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

/** [뒷말, 이름] 들을 같은 뒷말끼리 묶는다 — 「milk.py · apple.py 가 없어요」. 이름이 빈 것은 뒷말이 곧 한 줄 */
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
  const hasPkg = dirs.includes(PKG);
  // 맨 위의 foods.py 가 __init__.py 없는 foods 폴더를 가린다 (이름공간 패키지는 같은 이름의 .py 보다 나중에 찾는다)
  const shadow = p.files[`${PKG}.py`] !== undefined && p.files[`${PKG}/__init__.py`] === undefined;

  // ① foods 폴더 안에 모듈 두 개
  {
    const have = MODULES.filter((m) => p.files[m.path] !== undefined);
    const pkgTwin = hasPkg ? null : caseTwin(dirs, PKG);                                  // Foods/
    const pkgStray = hasPkg || pkgTwin ? null : dirs.find((d) => baseName(d) === PKG);   // 다른 폴더/foods/
    const hints = [];
    if (pkgTwin) hints.push(`${quote(pkgTwin)} — 소문자 ${PKG} 로 지어 주세요 (import 는 대소문자를 따져요)`);
    else if (pkgStray) hints.push(`${PKG}/ 가 ${parentOf(pkgStray)}/ 안에 있어요 — 맨 위(다운로드)로 옮겨 주세요`);
    const pairs = [];   // [뒷말, 파일 이름] — 같은 까닭은 한 줄로 묶어 알린다
    for (const m of MODULES) {
      if (p.files[m.path] !== undefined) continue;
      const fname = `${m.mod}.py`;
      const twin = caseTwin(files, m.path);
      const txt = files.find((f) => low(f) === low(m.path) + '.txt');
      const stray = files.find((f) => baseName(f) === fname && f !== m.path);
      if (twin && baseName(twin) === fname) { if (!pkgTwin) pairs.push([` 는 있지만 폴더 이름의 대소문자가 달라요 (${parentOf(twin)}/)`, fname]); }
      else if (twin) pairs.push([`${quote(baseName(twin))} → ${fname}`, '']);
      else if (txt) pairs.push([`${quote(baseName(txt))} — 끝이 .txt 예요. 이름이 정확히 ${fname} 여야 해요`, '']);
      else if (stray && pkgStray && parentOf(stray) === pkgStray) continue;   // 폴더째 옮기면 된다 — 위에서 알려 준다
      else if (stray) pairs.push([` 가 ${parentOf(stray) ? `${parentOf(stray)}/ 안에` : '맨 위(다운로드)에'} 있어요 — ${PKG}/ 안으로 옮겨 주세요`, fname]);
      else pairs.push([' 가 없어요', fname]);
    }
    hints.push(...grouped(pairs));
    if (have.length === MODULES.length) set('files', 'ok', `📁 ${PKG}/ ⊃ ${MODULES.map((m) => `📄 ${m.mod}.py`).join(' · ')}`);
    else if (have.length || hasPkg || hints.some((x) => !x.endsWith('없어요'))) set('files', 'part', (hasPkg && !have.length && pairs.length === MODULES.length && pairs.every(([t]) => t === ' 가 없어요') ? `📁 ${PKG}/ 는 좋아요 — 그 안에 ${MODULES.map((m) => `${m.mod}.py`).join(' · ')} 를 만들어 주세요` : hints.join(' · ')) + '.');
    else set('files', 'no', dirs.length ? `폴더 이름이 문항과 달라요 — 다운로드 폴더(맨 위)에 ${PKG}.` : `아직 폴더가 없어요. 탐색기의 📁 로 ${PKG} 부터 만들어 보세요.`);
  }

  // ②③ 모듈마다 — 함수 이름과 출력 문구. 모듈을 따로 불러 함수를 한 번 불러 본다 (불러오기만 했을 때 나오는 것도 본다)
  for (const m of MODULES) {
    const src = p.files[m.path];
    if (src === undefined) {
      const elsewhere = files.some((f) => low(baseName(f)).startsWith(`${m.mod}.py`));   // Foods/milk.py · milk.py.txt · 다른 폴더의 milk.py
      set(m.mod, 'no', elsewhere ? `① 칸을 먼저 고쳐 주세요 — ${m.mod}.py 가 ${PKG}/ 바로 안에 있어야 불러올 수 있어요.` : `먼저 ${PKG}/ 안에 ${m.mod}.py 를 만들어 주세요 (① 칸).`);
      continue;
    }
    if (!syntaxOk(src)) { set(m.mod, 'part', `${m.mod}.py 에 문법 오류가 있어요 — 그 파일을 열고 ▶ 로 실행해 보면 어디인지 알려 줘요.`); continue; }
    const defs = defsOf(src);
    if (!defs.includes(m.fn)) {
      const twin = defs.find((d) => low(d) === m.fn);
      const other = MODULES.find((o) => o !== m && defs.includes(o.fn));
      if (twin) set(m.mod, 'part', `${twin} → ${m.fn} (함수 이름도 대소문자를 따져요).`);
      else if (other) set(m.mod, 'part', `${m.mod}.py 의 함수 이름은 ${m.fn}( ) — 지금은 ${other.fn}( ).`);
      else if (defs.length) set(m.mod, 'part', `${m.mod}.py 에 만들 것: def ${m.fn}( ) (지금은 ${defs.join(', ')} 만 있어요).`);
      else set(m.mod, 'no', `${m.mod}.py 에 만들 것: def ${m.fn}( ) — 출력은 그 함수 안에서 print 로.`);
      continue;
    }
    const imp = `from ${PKG} import ${m.mod}\n`;
    const only = runProject({ files: { ...p.files, [PROBE]: imp }, dirs: p.dirs, entry: PROBE });
    if (!only.ok) { set(m.mod, 'part', shadow ? `${SHADOW_HINT}.` : `${m.mod}.py 를 불러오지 못했어요 (${only.errorType}).`); continue; }
    const r = runProject({ files: { ...p.files, [PROBE]: imp + `${m.mod}.${m.fn}()\n` }, dirs: p.dirs, entry: PROBE });
    const before = lines(only);
    const out = lines(r).slice(before.length);
    const hints = [];
    if (before.length) hints.push('불러오기만 해도 출력이 나와요 — 파일 맨 아래에서 함수를 부르고 있지 않나요? start.py 에서 두 번씩 나와요');
    if (!r.ok) hints.push(`${m.mod}.${m.fn}( ) 에서 ${r.errorType} 가 나요`);
    else if (!out.length) hints.push(`${m.mod}.${m.fn}( ) — 아무것도 출력하지 않아요. return 이 아니라 print 로`);
    else if (out.length > 1 || out[0] !== m.text) hints.push(`${m.mod}.${m.fn}( ) → ${quote(out.join(' / '))} (띄어쓰기까지 ${quote(m.text)} 여야 해요)`);
    if (hints.length) set(m.mod, 'part', hints.join(' · ') + '.');
    else set(m.mod, 'ok', `def ${m.fn}( ) → ${m.text}`);
  }

  // ④ start.py 실행
  let r = null;
  {
    const main = p.files[ENTRY];
    const misplaced = files.find((f) => baseName(f) === ENTRY && f !== ENTRY);
    const twin = caseTwin(files, ENTRY);
    const n = EXPECTED.length;
    if (main === undefined) {
      set('run', twin || misplaced ? 'part' : 'no', twin ? `${quote(twin)} → start.py` : misplaced ? `start.py 가 ${parentOf(misplaced)}/ 안에 있어요 — ${PKG} 와 나란히, 맨 위(다운로드)로 옮겨 주세요.` : '맨 위(다운로드)에 start.py 가 없어요.');
    } else {
      r = runProject({ files: p.files, dirs: p.dirs, entry: ENTRY });
      const got = lines(r);
      const calls = MODULES.filter((m) => r.calls.some((k) => k.file === m.path && k.name === m.fn));
      const same = got.length === n && got.every((x, i) => x === EXPECTED[i]);
      const usesPkg = (importsOf(main) || []).some((s) => (s.type === 'Import' && s.names.some((al) => al.name === PKG || al.name.startsWith(PKG + '.'))) || (s.type === 'FromImport' && !s.level && (s.mod === PKG || s.mod.startsWith(PKG + '.'))));
      const counts = {};
      got.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
      const repeated = Object.entries(counts).find(([x, k]) => k > 1 && EXPECTED.includes(x));
      const missing = EXPECTED.filter((x) => !got.includes(x));
      if (importsOf(main) === null) set('run', 'part', 'start.py 에 문법 오류가 있어요.');
      else if (same && calls.length === n) set('run', 'ok', '두 모듈의 함수를 불러 출력 예와 똑같이 두 줄');
      else if (same) set('run', 'part', `출력은 같지만 부르지 않은 함수가 있어요: ${MODULES.filter((m) => !calls.includes(m)).map((m) => `${m.mod}.${m.fn}( )`).join(', ')} — start.py 에서 print 로 직접 쓰지 말고 모듈의 함수를 불러요.`);
      else if (!r.ok && shadow && /^(ModuleNotFoundError|ImportError)$/.test(r.errorType)) set('run', got.length ? 'part' : 'no', `${SHADOW_HINT}.`);
      else if (!r.ok) set('run', got.length ? 'part' : 'no', `${got.length ? `${got.length}줄 나온 뒤` : '실행하자마자'} ${r.errorType} 가 났어요 — 터미널의 맨 아래 줄을 읽어 보세요.`);
      else if (!usesPkg) set('run', got.length ? 'part' : 'no', got.length ? `start.py 가 ${PKG} 패키지를 import 하지 않았어요.` : `아직 아무것도 출력하지 않아요 — ${PKG} 패키지를 import 하고 함수를 불러 보세요.`);
      else if (got.includes('None')) set('run', 'part', 'None 이 찍혀요 — print( ) 안에서 함수를 부르지 않았나요? 함수가 이미 print 해요.');
      else if (got.length === n * 2 && EXPECTED.every((x) => counts[x] === 2)) set('run', 'part', '두 줄이 두 번씩 나와요 — 모듈 파일 맨 아래에서 함수를 부르고 있지 않나요?');
      else if (repeated) set('run', 'part', `${quote(repeated[0])} — ${repeated[1]}번 나와요. 출력 예에는 한 번씩이에요.`);
      else if (!missing.length && got.length === n) set('run', 'part', '두 줄이 다 나왔지만 차례가 출력 예와 달라요.');
      else if (!got.length) set('run', 'no', '아직 아무것도 출력하지 않아요 — 함수를 불러 보세요.');
      else set('run', 'part', missing.length ? `${missing.length}줄이 빠졌어요: ${missing.map(quote).join(' ')}` : `출력이 출력 예와 달라요 — ${got.length}줄이 나왔어요.`);
    }
  }

  // ＋ __init__.py (점수에 넣지 않는다)
  let extra;
  {
    const near = files.find((f) => parentOf(f) === PKG && baseName(f) !== '__init__.py' && NEAR_INIT.test(baseName(f)));
    if (!hasPkg) extra = { id: 'init', state: 'no', detail: '폴더를 먼저 만들어 주세요.' };
    else if (near) extra = { id: 'init', state: 'part', detail: `${quote(baseName(near))} — 이름이 정확히 __init__.py 여야 해요 (앞뒤 밑줄 두 개씩, 끝은 .py).` };
    else if (p.files[`${PKG}/__init__.py`] !== undefined) extra = { id: 'init', state: 'ok', detail: `${PKG}/ 안에 있어요` };
    else extra = { id: 'init', state: 'no', detail: '없어도 실행은 되지만, 넣어 두면 「패키지」 라는 것이 분명해요.' };
  }

  const list = CONDITIONS.map((x) => items[x.id]);
  const okCount = list.filter((x) => x.state === 'ok').length;
  const allOk = okCount === list.length;
  const started = files.some((f) => f !== ENTRY) || dirs.length || (p.files[ENTRY] || '').replace(/^#.*$/gm, '').trim();
  const summary = allOk
    ? '「2. 사용자 정의 패키지 제작」 의 조건을 모두 지켰어요. 이제 IDLE 에서 똑같이 만들어 압축해 보세요(「IDLE 에서」 화면).'
    : started ? '⬜ · 🟨 칸을 채워 보세요. 칸의 설명이 실마리예요.' : `아직 시작하지 않았어요. 탐색기의 📁 로 ${PKG} 폴더부터 만들어 보세요.`;
  return { items: list, extra, okCount, total: list.length, allOk, summary, run: r };
}
