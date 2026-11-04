/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  가상 프로젝트(파일·폴더) 다루기 — 화면(ide.js)·풀이(explain.js)·조건 점검기(checker.js)가 함께 쓴다.
 *  프로젝트 = { files: { 'main.py': '…', 'mytools/calc.py': '…' }, dirs: ['mytools'] }
 *  ⚠ node 로 불러다 시험하므로 여기서 DOM 을 만지지 말 것.
 */
import { parse } from './pymini.js';

export const clone = (p) => ({ files: { ...p.files }, dirs: [...(p.dirs || [])] });

/** 빈 폴더까지 포함한 모든 폴더 */
export function allDirs(p) {
  const s = new Set(p.dirs || []);
  for (const f of Object.keys(p.files)) {
    const parts = f.split('/');
    for (let k = 1; k < parts.length; k++) s.add(parts.slice(0, k).join('/'));
  }
  return [...s].sort();
}
export const parentOf = (path) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
export const baseName = (path) => path.slice(path.lastIndexOf('/') + 1);
export const join = (dir, name) => (dir ? `${dir}/${name}` : name);

/** 폴더 하나 바로 아래의 것들 — 폴더 먼저, 그다음 파일 (VS Code 와 같은 차례) */
export function childrenOf(p, dir) {
  const dirs = allDirs(p).filter((d) => parentOf(d) === dir).sort((a, b) => a.localeCompare(b));
  const files = Object.keys(p.files).filter((f) => parentOf(f) === dir).sort((a, b) => a.localeCompare(b));
  return { dirs, files };
}
/** 윈도우처럼 대소문자를 가리지 않고 이미 있는지 (Calc.py 와 calc.py 는 같은 자리) */
export function taken(p, path) {
  const low = path.toLowerCase();
  return Object.keys(p.files).some((f) => f.toLowerCase() === low) || allDirs(p).some((d) => d.toLowerCase() === low);
}
/** 파일·폴더 이름으로 쓸 수 없는 글자 (윈도우 기준) */
export function badNameChar(name) {
  const m = /[\\:*?"<>|]/.exec(name);
  return m ? m[0] : null;
}

/** 파일 안 맨 위(들여 쓰지 않은) def 이름들 */
export function defsOf(src) {
  try {
    return parse(src).body.filter((st) => st.type === 'FuncDef').map((st) => st.name);
  } catch (e) {
    return [...String(src).matchAll(/^def\s+([A-Za-z_가-힣][\w가-힣]*)/gm)].map((m) => m[1]);
  }
}
/** 파일 안 맨 위 class 이름들 */
export function classesOf(src) {
  try { return parse(src).body.filter((st) => st.type === 'ClassDef').map((st) => st.name); } catch (e) { return []; }
}
/** 파일의 import 문들 (문법 오류가 있으면 null) */
export function importsOf(src) {
  try {
    const out = [];
    const walk = (body) => {
      for (const st of body) {
        if (st.type === 'Import' || st.type === 'FromImport') out.push(st);
        if (st.body) walk(st.body);
        if (st.orelse) walk(st.orelse);
        if (st.handlers) st.handlers.forEach((hh) => walk(hh.body));
        if (st.finalbody) walk(st.finalbody);
      }
    };
    walk(parse(src).body);
    return out;
  } catch (e) { return null; }
}
/** 문법 오류가 있는 파일인가 */
export function syntaxOk(src) { try { parse(src); return true; } catch (e) { return false; } }

/** 모듈 이름으로 쓸 수 있는가 (파이썬 「이름」 규칙) */
export const isIdent = (s) => /^[A-Za-z_가-힣][A-Za-z0-9_가-힣]*$/.test(s);
/** 「파일 경로 → import 할 때 쓰는 이름」 — mytools/calc.py → mytools.calc */
export const modName = (path) => path.replace(/\.py$/, '').split('/').join('.');

/** 이 프로젝트에서 import 할 수 있는 이름(실행 폴더 기준)들 */
export function importableNames(p, scriptDir = '') {
  const out = [];
  const { dirs, files } = childrenOf(p, scriptDir);
  for (const d of dirs) out.push(baseName(d));
  for (const f of files) if (f.endsWith('.py')) out.push(baseName(f).replace(/\.py$/, ''));
  return out;
}
/** 어떤 이름(def)이 어느 파일에 있는지 */
export function whereDefined(p, name) {
  return Object.keys(p.files).filter((f) => f.endsWith('.py') && (defsOf(p.files[f]).includes(name) || classesOf(p.files[f]).includes(name)));
}
