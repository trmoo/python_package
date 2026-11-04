/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  화면들이 함께 쓰는 조각 — 코드 상자 · 폴더 나무 그림 · 미니 실행.
 */
import { h } from '../ui/dom.js';
import { highlight } from '../ui/highlight.js';
import { runProject } from '../lib/pymini.js';

/** 색을 입힌 코드 상자 */
export function codeBlock(src, small = false, extraClass = '') {
  return h('pre', { class: `code${small ? ' sm' : ''} ${extraClass}`, html: highlight(src) });
}

/** 폴더 나무 그림 — [['d'|'f'|'i'|'c', 글자, 설명]] */
export function treeBlock(lines) {
  return h('div', { class: 'tree' }, lines.map(([k, text, note], i) => [
    i ? '\n' : null, h('span', { class: k }, text), note ? h('span', { class: 'c' }, `   # ${note}`) : null]));
}

/** 프로젝트 { files } 를 나무 그림 줄로 */
export function projectTree(files, rootName = '내프로젝트/') {
  const paths = Object.keys(files).sort((a, b) => {
    const da = a.split('/').length, db = b.split('/').length;
    const pa = a.split('/').slice(0, -1).join('/'), pb = b.split('/').slice(0, -1).join('/');
    if (pa !== pb) return pa.localeCompare(pb);
    return da - db || a.localeCompare(b);
  });
  const lines = [['d', rootName]];
  const top = paths.filter((p) => !p.includes('/'));
  const dirs = [...new Set(paths.filter((p) => p.includes('/')).map((p) => p.split('/')[0]))];
  const entries = [...top.map((f) => ({ f })), ...dirs.map((d) => ({ d }))];
  entries.forEach((e, i) => {
    const last = i === entries.length - 1;
    if (e.f) lines.push(['f', `${last ? '└──' : '├──'} ${e.f}`]);
    else {
      lines.push(['d', `${last ? '└──' : '├──'} ${e.d}/`]);
      const kids = paths.filter((p) => p.startsWith(e.d + '/'));
      kids.forEach((k, j) => lines.push([k.endsWith('__init__.py') ? 'i' : 'f', `${last ? '    ' : '│   '}${j === kids.length - 1 ? '└──' : '├──'} ${k.slice(e.d.length + 1)}`]));
    }
  });
  return lines;
}

/** 짧은 코드를 실행해 결과 한 줄 — 출력 또는 오류 마지막 줄 */
export function quickRun(files, entry = 'main.py') {
  const r = runProject({ files, entry });
  const lastLine = r.stderr ? r.stderr.split('\n').pop() : '';
  return { r, ok: r.ok, text: r.ok ? r.stdout : lastLine, type: r.errorType || null };
}

/** 단원 머리 — 제목과 한 줄 설명 */
export function head(title, lead) {
  return [h('h2', {}, title), lead ? h('p', { class: 'lead', html: lead }) : null];
}
