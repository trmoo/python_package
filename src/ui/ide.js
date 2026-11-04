/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  가상 VS Code — 탐색기 · 편집기 · 터미널.
 *
 *  진짜 VS Code 와 같게 만든 것 (학생이 교실 컴퓨터에서 그대로 겪는 일)
 *    · 탐색기의 [새 파일] 칸에 mytools/__init__.py 처럼 적으면 폴더와 파일이 한 번에 생긴다
 *    · 파일을 끌어다 폴더에 놓으면 옮겨진다 · 윈도우처럼 대소문자만 다른 이름은 만들 수 없다
 *    · ▶ 는 「지금 열려 있는 파일」을 실행한다 (main.py 가 아니라!)
 *    · 터미널에 python main.py · pip install gtts 를 칠 수 있다
 *  진짜와 다른 것
 *    · 저장(Ctrl+S)이 필요 없다 — 고치는 즉시 반영된다 (VS Code 에서는 꼭 저장해야 한다고 알려 준다)
 *    · pip 는 흉내다 — 실제로 내려받지 않는다
 */
import { h, fill, esc, modal, toast } from './dom.js';
import { highlight } from './highlight.js';
import { runProject, KNOWN_EXTERNAL } from '../lib/pymini.js';
import { explain } from '../lib/explain.js';
import { clone, allDirs, childrenOf, parentOf, baseName, join, taken, badNameChar } from '../lib/project.js';

const ROOT = 'C:\\project';
const isMedia = (p) => /\.mp3$/i.test(p);

/**
 * opts:
 *   project   { files, dirs }        처음 프로젝트
 *   active    처음 열어 둘 파일
 *   lockTree  true 면 파일·폴더를 만들거나 지우거나 옮길 수 없다
 *   readOnly  true 면 코드를 고칠 수 없다
 *   commands  true 면 터미널에 명령을 칠 수 있다
 *   installed pip 로 설치한 것 (흉내)
 *   termHeight 터미널 높이(px)
 *   onChange(project) · onRun(result, project) · onInstall(list)
 */
export function createIDE(host, opts = {}) {
  const o = { termHeight: 190, sideWidth: 200, title: 'PROJECT', ...opts };
  let proj = clone(o.project || { files: { 'main.py': '' }, dirs: [] });
  const firstPy = () => (proj.files['main.py'] !== undefined ? 'main.py' : Object.keys(proj.files).find((f) => f.endsWith('.py')) || null);
  let active = o.active && proj.files[o.active] !== undefined ? o.active : firstPy();
  let tabs = active ? [active] : [];
  let selected = active;
  let expanded = new Set(allDirs(proj));
  let editing = null;        // { kind: 'file'|'dir'|'rename', dir, path }
  let dragging = null;
  let errMark = null;        // { file, line }
  const installed = new Set(o.installed || []);
  let last = null;
  let changeTimer = null;

  // ── 뼈대 ──
  const treeEl = h('div', { class: 'ide-tree', role: 'tree' });
  const tabsEl = h('div', { class: 'ide-tabs' });
  const crumbEl = h('div', { class: 'ide-crumb' });
  const gutter = h('div', { class: 'ide-gut' });
  const pre = h('pre', { 'aria-hidden': 'true' });
  const ta = h('textarea', { spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': '코드 편집기', readonly: o.readOnly || null });
  const codeBox = h('div', { class: 'ide-code' }, pre, ta);
  const edArea = h('div', { class: 'ide-ed' });
  const termOut = h('div', { class: 'ide-term-out', 'aria-live': 'polite' });
  const cmdInput = o.commands ? h('input', { placeholder: '여기에 명령을 쳐 보세요 — python main.py · pip install gtts · cls', 'aria-label': '터미널 명령' }) : null;
  const term = h('div', { class: 'ide-term', style: { height: `${o.termHeight}px` } },
    h('div', { class: 'ide-term-head' }, h('span', { class: 'on' }, '터미널'), h('span', {}, 'powershell'), h('span', { class: 'spacer' }),
      h('button', { class: 'ide-ico', title: '터미널 지우기', onClick: () => fill(termOut) }, '🗑')),
    termOut,
    cmdInput ? h('div', { class: 'ide-cmd' }, h('span', { class: 't-ps' }, `PS ${ROOT}>`), cmdInput) : null);
  const side = h('div', { class: 'ide-side', style: { width: `${o.sideWidth}px` } },
    h('div', { class: 'ide-side-head' }, h('span', { class: 'name' }, `▾ ${o.title}`),
      o.lockTree ? null : h('button', { class: 'ide-ico', title: '새 파일 (이름에 폴더/파일.py 처럼 적으면 폴더도 함께 생겨요)', onClick: () => startCreate('file') }, '📄'),
      o.lockTree ? null : h('button', { class: 'ide-ico', title: '새 폴더', onClick: () => startCreate('dir') }, '📁')),
    treeEl);
  const root = h('div', { class: 'ide' },
    h('div', { class: 'ide-title' }, h('span', { class: 'dots' }, h('i'), h('i'), h('i')), h('span', { class: 't' }, `${o.title.toLowerCase()} — 가상 Visual Studio Code`)),
    h('div', { class: 'ide-main' }, side,
      h('div', { class: 'ide-work' }, tabsEl, crumbEl, edArea, term)));
  fill(host, root);

  // ── 탐색기 ──
  const targetDir = () => {
    if (!selected) return '';
    if (allDirs(proj).includes(selected)) return selected;
    return parentOf(selected);
  };
  function startCreate(kind) {
    const dir = targetDir();
    if (dir) expanded.add(dir);
    editing = { kind, dir };
    paintTree();
  }
  function iconOf(path, isDir) {
    if (isDir) return h('span', { class: 'ic' }, expanded.has(path) ? '📂' : '📁');
    if (baseName(path) === '__init__.py') return h('span', { class: 'ic ic-init', title: '패키지 표지판' }, '📦');
    if (path.endsWith('.py')) return h('span', { class: 'ic ic-py' }, 'py');
    if (isMedia(path)) return h('span', { class: 'ic' }, '🔊');
    return h('span', { class: 'ic' }, '📄');
  }
  function nameInput(initial, onDone) {
    const inp = h('input', { value: initial, 'aria-label': '이름' });
    let doneOnce = false;
    const finish = (commit) => { if (doneOnce) return; doneOnce = true; onDone(commit ? inp.value.trim() : null); };
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      e.stopPropagation();
    });
    inp.addEventListener('blur', () => finish(inp.value.trim() !== ''));
    setTimeout(() => { inp.focus(); const dot = initial.lastIndexOf('.'); inp.setSelectionRange(0, dot > 0 ? dot : initial.length); }, 0);
    return inp;
  }
  function row(path, depth, isDir) {
    const isSel = selected === path;
    if (editing && editing.kind === 'rename' && editing.path === path) {
      return h('div', { class: 'tr sel', style: { paddingLeft: `${6 + depth * 14}px` } }, h('span', { class: 'tw' }, isDir ? '▸' : ''), iconOf(path, isDir),
        nameInput(baseName(path), (v) => { editing = null; if (v && v !== baseName(path)) renamePath(path, v); paintAll(); }));
    }
    const el = h('div', {
      class: 'tr' + (isSel ? ' sel' : ''), role: 'treeitem', style: { paddingLeft: `${6 + depth * 14}px` }, title: path,
      draggable: o.lockTree ? null : 'true',
      onClick: (e) => {
        e.stopPropagation();
        selected = path;
        if (isDir) { if (expanded.has(path)) expanded.delete(path); else expanded.add(path); paintTree(); }
        else openFile(path);
      },
    }, h('span', { class: 'tw' }, isDir ? (expanded.has(path) ? '▾' : '▸') : ''), iconOf(path, isDir), h('span', { class: 'nm' }, baseName(path)),
    o.lockTree ? null : h('span', { class: 'acts' },
      h('button', { title: '이름 바꾸기', onClick: (e) => { e.stopPropagation(); editing = { kind: 'rename', path }; selected = path; paintTree(); } }, '✏️'),
      h('button', { title: '지우기', onClick: (e) => { e.stopPropagation(); askDelete(path, isDir); } }, '🗑')));
    if (!o.lockTree) {
      el.addEventListener('dragstart', (e) => { dragging = path; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', path); } catch (x) { /* 무시 */ } });
      el.addEventListener('dragend', () => { dragging = null; treeEl.classList.remove('drop-root'); treeEl.querySelectorAll('.drop').forEach((x) => x.classList.remove('drop')); });
      if (isDir) {
        el.addEventListener('dragover', (e) => { if (!dragging || dragging === path || path.startsWith(dragging + '/')) return; e.preventDefault(); e.stopPropagation(); el.classList.add('drop'); treeEl.classList.remove('drop-root'); });
        el.addEventListener('dragleave', () => el.classList.remove('drop'));
        el.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('drop'); if (dragging) movePath(dragging, path); dragging = null; });
      }
    }
    return el;
  }
  function creatingRow(depth) {
    const kind = editing.kind;
    return h('div', { class: 'tr sel', style: { paddingLeft: `${6 + depth * 14}px` } }, h('span', { class: 'tw' }), h('span', { class: 'ic' }, kind === 'dir' ? '📁' : '📄'),
      nameInput('', (v) => { const ed = editing; editing = null; if (v) createPath(ed.kind, ed.dir, v); paintAll(); }));
  }
  function paintDir(dir, depth, out) {
    if (editing && (editing.kind === 'file' || editing.kind === 'dir') && editing.dir === dir) out.push(creatingRow(depth));
    const { dirs, files } = childrenOf(proj, dir);
    for (const d of dirs) {
      out.push(row(d, depth, true));
      if (expanded.has(d)) paintDir(d, depth + 1, out);
    }
    for (const f of files) out.push(row(f, depth, false));
  }
  function paintTree() {
    const rows = [];
    paintDir('', 0, rows);
    if (!rows.length) rows.push(h('div', { class: 'ide-empty' }, '파일이 없어요. 위의 📄 를 눌러 만들어 보세요.'));
    fill(treeEl, rows);
  }
  treeEl.addEventListener('click', () => { selected = null; paintTree(); });
  if (!o.lockTree) {
    treeEl.addEventListener('dragover', (e) => { if (!dragging || !parentOf(dragging)) return; e.preventDefault(); treeEl.classList.add('drop-root'); });
    treeEl.addEventListener('dragleave', (e) => { if (e.target === treeEl) treeEl.classList.remove('drop-root'); });
    treeEl.addEventListener('drop', (e) => { e.preventDefault(); treeEl.classList.remove('drop-root'); if (dragging && parentOf(dragging)) movePath(dragging, ''); dragging = null; });
  }

  // ── 파일·폴더 바꾸기 ──
  function validName(name) {
    if (!name || name === '.' || name === '..') { toast('이름을 적어 주세요', 'bad'); return false; }
    const bad = badNameChar(name);
    if (bad) { toast(`파일 이름에는 ${bad} 를 쓸 수 없어요`, 'bad'); return false; }
    if (name.split('/').some((x) => !x.trim())) { toast('빈 이름이 섞였어요', 'bad'); return false; }
    return true;
  }
  function createPath(kind, dir, raw) {
    const name = raw.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!validName(name)) return;
    const full = join(dir, name);
    if (taken(proj, full)) { toast(`이미 「${baseName(full)}」 이(가) 있어요 (대소문자만 달라도 같은 이름이에요)`, 'bad'); return; }
    const parts = full.split('/');
    for (let k = 1; k < parts.length; k++) { const d = parts.slice(0, k).join('/'); if (proj.files[d] !== undefined) { toast(`「${d}」 은(는) 파일이라 그 안에 넣을 수 없어요`, 'bad'); return; } if (!proj.dirs.includes(d)) proj.dirs.push(d); expanded.add(d); }
    if (kind === 'dir') { proj.dirs.push(full); expanded.add(full); selected = full; }
    else { proj.files[full] = ''; selected = full; openFile(full, true); }
    changed();
  }
  function moveKeys(from, to) {
    const files = {};
    for (const [p, v] of Object.entries(proj.files)) {
      if (p === from || p.startsWith(from + '/')) files[to + p.slice(from.length)] = v; else files[p] = v;
    }
    proj.files = files;
    proj.dirs = proj.dirs.map((d) => (d === from || d.startsWith(from + '/') ? to + d.slice(from.length) : d));
    const re = (p) => (p && (p === from || p.startsWith(from + '/')) ? to + p.slice(from.length) : p);
    tabs = tabs.map(re); active = re(active); selected = re(selected);
    expanded = new Set([...expanded].map(re));
    if (errMark) errMark = null;
  }
  function movePath(from, dir) {
    if (parentOf(from) === dir) return;
    if (dir === from || dir.startsWith(from + '/')) { toast('폴더를 자기 안으로 옮길 수 없어요', 'bad'); return; }
    const to = join(dir, baseName(from));
    if (taken(proj, to)) { toast(`옮길 곳에 이미 「${baseName(from)}」 이(가) 있어요`, 'bad'); return; }
    moveKeys(from, to);
    if (dir) expanded.add(dir);
    toast(`${baseName(from)} → ${dir ? dir + '/' : '맨 위'} 로 옮겼어요`);
    changed(); paintAll();
  }
  function renamePath(path, raw) {
    const name = raw.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!validName(name)) return;
    const to = join(parentOf(path), name);
    if (to.toLowerCase() !== path.toLowerCase() && taken(proj, to)) { toast(`이미 「${baseName(to)}」 이(가) 있어요`, 'bad'); return; }
    // 새 이름에 폴더/ 가 들어 있으면 그 폴더도 만든다 (VS Code 처럼 이름 바꾸기로 옮기기)
    const parts = to.split('/');
    for (let k = 1; k < parts.length; k++) { const d = parts.slice(0, k).join('/'); if (!allDirs(proj).includes(d)) proj.dirs.push(d); expanded.add(d); }
    moveKeys(path, to);
    changed();
  }
  async function askDelete(path, isDir) {
    const inside = isDir ? Object.keys(proj.files).filter((f) => f.startsWith(path + '/')).length : 0;
    const ok = await modal(`「${baseName(path)}」 지우기`, isDir && inside ? `이 폴더 안의 파일 ${inside}개도 함께 지워져요. 지울까요?` : '지울까요?', { ok: '지우기', cancel: '그만두기' });
    if (!ok) return;
    for (const f of Object.keys(proj.files)) if (f === path || f.startsWith(path + '/')) delete proj.files[f];
    proj.dirs = proj.dirs.filter((d) => d !== path && !d.startsWith(path + '/'));
    tabs = tabs.filter((t) => proj.files[t] !== undefined);
    if (proj.files[active] === undefined) active = tabs[tabs.length - 1] || null;
    selected = active;
    changed(); paintAll();
  }

  // ── 편집기 ──
  function openFile(path, focus) {
    if (proj.files[path] === undefined) return;
    if (!tabs.includes(path)) tabs.push(path);
    active = path; selected = path;
    paintAll();
    if (focus && !isMedia(path)) setTimeout(() => ta.focus(), 0);
  }
  function closeTab(path) {
    const i = tabs.indexOf(path);
    tabs = tabs.filter((t) => t !== path);
    if (active === path) active = tabs[Math.max(0, i - 1)] || null;
    paintAll();
  }
  function paintTabs() {
    fill(tabsEl, tabs.map((t) => h('div', { class: 'ide-tab' + (t === active ? ' on' : ''), title: t, onClick: () => { active = t; selected = t; paintAll(); } },
      iconOf(t, false), h('span', {}, baseName(t)),
      h('button', { class: 'x', title: '탭 닫기', onClick: (e) => { e.stopPropagation(); closeTab(t); } }, '✕'))),
    h('span', { class: 'spacer' }),
    h('button', { class: 'ide-run', title: '지금 열려 있는 파일을 실행합니다 (Run Python File)', onClick: () => run(active) }, h('span', { class: 'tri' }, '▶'), active && active.endsWith('.py') ? `${baseName(active)} 실행` : '실행'));
    fill(crumbEl, active ? active.split('/').map((p, i, arr) => [i ? h('span', {}, '›') : null, h('span', {}, p + (i < arr.length - 1 ? '' : ''))]) : null);
  }
  function paintEditor() {
    if (!active) {
      fill(edArea, h('div', { class: 'ide-noeditor' }, '왼쪽 탐색기에서 파일을 눌러 여세요.', h('br'), o.lockTree ? '' : '📄 를 누르면 새 파일을 만들 수 있어요.'));
      return;
    }
    if (isMedia(active)) {
      let info = {};
      try { info = JSON.parse(proj.files[active].replace(/^#TTS /, '')); } catch (e) { /* 무시 */ }
      fill(edArea, h('div', { class: 'ide-noeditor' },
        h('div', {}, '🔊 소리 파일 ', h('b', {}, baseName(active))),
        h('div', { class: 'tiny' }, `담긴 말: 「${info.text || ''}」`),
        h('button', { class: 'btn small', style: { marginTop: '8px' }, onClick: () => speak(info) }, '▶ 들어 보기'),
        h('div', { class: 'tiny', style: { marginTop: '6px', opacity: 0.7 } }, '이 앱은 브라우저의 음성 기능으로 흉내 내요. 진짜 gtts 는 구글 서버에서 mp3 를 받아 옵니다.')));
      return;
    }
    if (ta.value !== proj.files[active]) ta.value = proj.files[active];
    fill(edArea, gutter, codeBox);
    paintCode();
  }
  function paintCode() {
    const src = ta.value;
    const n = src.split('\n').length;
    const bad = errMark && errMark.file === active ? errMark.line : 0;
    gutter.innerHTML = Array.from({ length: n }, (_, i) => (i + 1 === bad ? `<div class="bad">${i + 1}</div>` : `<div>${i + 1}</div>`)).join('');
    let html = highlight(src) + '\n';
    if (bad) {
      const lines = html.split('\n');
      if (lines[bad - 1] !== undefined) lines[bad - 1] = `<span class="errline">${lines[bad - 1] || ' '}</span>`;
      html = lines.join('\n');
    }
    pre.innerHTML = html;
    pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop;
  }
  ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; });
  ta.addEventListener('input', () => {
    if (!active || o.readOnly) return;
    proj.files[active] = ta.value;
    if (errMark && errMark.file === active) errMark = null;
    paintCode();
    clearTimeout(changeTimer);
    changeTimer = setTimeout(changed, 350);
  });
  ta.addEventListener('keydown', (e) => {
    if (o.readOnly) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      toast('이 앱은 고치는 즉시 저장돼요. 진짜 VS Code 에서는 Ctrl+S 로 꼭 저장하세요!');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(active); return; }
    const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
    const ins = (text, caret) => { ta.setRangeText(text, s, en, 'end'); if (caret != null) ta.setSelectionRange(caret, caret); ta.dispatchEvent(new Event('input')); };
    if (e.key === 'Tab') {
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      if (e.shiftKey) {
        const lead = /^ {1,4}/.exec(v.slice(ls)); if (!lead) return;
        ta.setRangeText('', ls, ls + lead[0].length, 'preserve'); ta.dispatchEvent(new Event('input'));
      } else ins('    ');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      const lineText = v.slice(ls, s);
      let ind = /^ */.exec(lineText)[0];
      if (/:\s*(#.*)?$/.test(lineText)) ind += '    ';
      ins('\n' + ind);
    }
  });

  // ── 터미널 ──
  const tline = (cls, text) => h('div', { class: cls }, text);
  function termPrompt(cmd) { termOut.append(h('div', {}, h('span', { class: 't-ps' }, `PS ${ROOT}> `), h('span', { class: 't-cmd' }, cmd))); }
  function scrollTerm() { termOut.scrollTop = termOut.scrollHeight; }
  function printErr(text) {
    // File "C:\project\mytools\calc.py", line 3 — 누르면 그 파일·그 줄로 간다 (VS Code 의 Ctrl+클릭처럼)
    for (const ln of text.split('\n')) {
      const m = /^(\s*File ")C:\\project\\([^"]+)(", line )(\d+)(.*)$/.exec(ln);
      if (m) {
        const path = m[2].replace(/\\/g, '/');
        termOut.append(h('div', { class: 't-err' }, m[1], h('span', { class: 't-link', title: '눌러서 이 줄로 가기', onClick: () => { errMark = { file: path, line: Number(m[4]) }; openFile(path); } }, `${ROOT}\\${m[2]}`), m[3] + m[4] + m[5]));
      } else termOut.append(tline('t-err', ln));
    }
  }
  function flowOf(r) {
    const loads = r.events.filter((e) => e.kind === 'load');
    const user = loads.filter((e) => e.file || e.ns);
    if (!user.length) return null;
    const chips = [h('span', { class: 'fm' }, `▶ ${r.entry}`)];
    for (const e of loads) {
      chips.push(h('span', { class: 's' }, '→'));
      if (e.lib) chips.push(h('span', { class: 'fc' }, `🐍 ${e.name}`));
      else if (e.ns) chips.push(h('span', { class: 'fp' }, `📦 ${e.dir}/ (__init__.py 없음)`));
      else if (baseName(e.file) === '__init__.py') chips.push(h('span', { class: 'fp' }, `📦 ${e.file}`));
      else chips.push(h('span', { class: 'fm' }, `📄 ${e.file}`));
    }
    const again = r.events.filter((e) => e.kind === 'cache' && r.events.some((x) => x.kind === 'load' && x.name === e.name && (x.file || x.ns)));
    if (again.length) chips.push(h('span', { class: 's' }, `· 다시 import 한 ${[...new Set(again.map((e) => e.name))].join(', ')} 는 또 실행하지 않음`));
    return h('div', { class: 't-flow' }, h('span', { class: 's' }, '불러온 차례:'), chips);
  }
  function run(entry) {
    if (!entry) { toast('먼저 실행할 파일을 여세요', 'bad'); return null; }
    if (!entry.endsWith('.py')) { toast('파이썬 파일(.py)만 실행할 수 있어요', 'bad'); return null; }
    clearTimeout(changeTimer); changed();
    termPrompt(`python ${entry}`);
    const r = runProject({ files: proj.files, dirs: proj.dirs, entry, installed: [...installed], root: ROOT });
    if (r.stdout) for (const ln of r.stdout.split('\n')) termOut.append(tline('t-out', ln === '' ? ' ' : ln));
    if (r.stderr) printErr(r.stderr);
    // 프로그램이 만든 파일 (gtts 의 save)
    for (const w of r.written || []) {
      const p = w.path.replace(/\\/g, '/');
      proj.files[p] = '#TTS ' + JSON.stringify({ text: w.text, lang: w.lang });
      termOut.append(tline('t-info', `   (프로그램이 파일 ${p} 를 만들었어요 — 탐색기에서 눌러 들어 보세요)`));
    }
    if (r.written && r.written.length) { changed(); paintTree(); }
    const flow = flowOf(r);
    if (flow) termOut.append(flow);
    for (const x of explain(r, proj)) termOut.append(h('div', { class: 't-ko' + (x.kind === 'tip' ? ' tip' : '') , html: (x.kind === 'error' ? '💬 ' : x.kind === 'warn' ? '⚠️ ' : '💡 ') + x.html }));
    // 오류 난 줄을 빨갛게 — 잘 돌면 지운다
    errMark = !r.ok && r.errorFile && r.errorLine ? { file: r.errorFile, line: r.errorLine } : null;
    if (active && !isMedia(active)) paintCode();
    termOut.append(h('div', { style: { height: '6px' } }));
    scrollTerm();
    last = r;
    if (o.onRun) o.onRun(r, clone(proj));
    return r;
  }
  function pip(args, raw) {
    const sub = args[0];
    if (raw.trim().startsWith('!')) {
      termOut.append(tline('t-err', `!pip 는 코랩·주피터의 「셀」 에서 쓰는 꼴이에요. 터미널에서는 느낌표 없이 pip install … 로 칩니다.`));
      return;
    }
    if (sub === 'install' && args[1]) {
      const name = args[1].toLowerCase();
      const known = Object.values(KNOWN_EXTERNAL).includes(name);
      if (!known) {
        termOut.append(tline('t-err', `ERROR: Could not find a version that satisfies the requirement ${args[1]} (from versions: none)`));
        termOut.append(tline('t-err', `ERROR: No matching distribution found for ${args[1]}`));
        termOut.append(h('div', { class: 't-ko', html: `💬 그런 이름의 라이브러리를 찾지 못했어요. 철자를 확인해 보세요. (이 앱이 아는 것: ${esc(Object.values(KNOWN_EXTERNAL).filter((v, i, a) => a.indexOf(v) === i).join(', '))})` }));
        return;
      }
      if (installed.has(name)) { termOut.append(tline('t-pip', `Requirement already satisfied: ${name}`)); return; }
      termOut.append(tline('t-pip', `Collecting ${name}`));
      termOut.append(tline('t-info', '  (이 앱의 pip 는 흉내예요 — 실제로 인터넷에서 내려받지 않아요)'));
      termOut.append(tline('t-pip', `Installing collected packages: ${name}`));
      termOut.append(tline('t-pip', `Successfully installed ${name}`));
      installed.add(name);
      if (o.onInstall) o.onInstall([...installed]);
      return;
    }
    if (sub === 'uninstall' && args[1]) {
      const name = args[1].toLowerCase();
      if (!installed.has(name)) { termOut.append(tline('t-pip', `WARNING: Skipping ${name} as it is not installed.`)); return; }
      installed.delete(name);
      termOut.append(tline('t-pip', `Successfully uninstalled ${name}`));
      if (o.onInstall) o.onInstall([...installed]);
      return;
    }
    if (sub === 'list') {
      termOut.append(tline('t-pip', 'Package    Version'));
      termOut.append(tline('t-pip', '---------- -------'));
      termOut.append(tline('t-pip', 'pip        (흉내)'));
      for (const n of installed) termOut.append(tline('t-pip', `${n.padEnd(10)} (흉내)`));
      return;
    }
    termOut.append(tline('t-err', '이 앱의 pip 는 pip install 이름 · pip uninstall 이름 · pip list 만 알아들어요.'));
  }
  function command(raw) {
    const cmd = raw.trim();
    if (!cmd) { termPrompt(''); return; }
    const parts = cmd.replace(/^&\s*/, '').split(/\s+/);
    let p0 = parts[0].toLowerCase().replace(/^!/, '');
    if (['cls', 'clear'].includes(p0)) { fill(termOut); return; }
    if ((p0 === 'python' || p0 === 'py' || p0 === 'python3') && parts[1] === '-m' && parts[2] === 'pip') { termPrompt(cmd); pip(parts.slice(3), cmd); scrollTerm(); return; }
    if (p0 === 'pip' || p0 === 'pip3') { termPrompt(cmd); pip(parts.slice(1), cmd); scrollTerm(); return; }
    if (p0 === 'python' || p0 === 'py' || p0 === 'python3') {
      if (!parts[1]) { termPrompt(cmd); termOut.append(tline('t-info', '이 앱 터미널에서는 대화형 파이썬(>>>)을 열 수 없어요. python 파일이름.py 처럼 실행할 파일을 적어 주세요.')); scrollTerm(); return; }
      const path = parts[1].replace(/\\/g, '/').replace(/^\.\//, '');
      if (proj.files[path] === undefined) {
        termPrompt(cmd);
        termOut.append(tline('t-err', `C:\\Python312\\python.exe: can't open file '${ROOT}\\${parts[1].replace(/\//g, '\\')}': [Errno 2] No such file or directory`));
        termOut.append(h('div', { class: 't-ko', html: `💬 그런 파일이 없어요. 폴더 안의 파일이면 ${esc('python 폴더/파일.py')} 처럼 경로까지 적어요.` }));
        scrollTerm();
        return;
      }
      fill(termOut); // run 이 프롬프트를 다시 찍는다
      run(path);
      return;
    }
    termPrompt(cmd);
    termOut.append(tline('t-err', `${parts[0]} : '${parts[0]}' 용어가 cmdlet, 함수, 스크립트 파일 또는 실행할 수 있는 프로그램 이름으로 인식되지 않습니다.`));
    termOut.append(h('div', { class: 't-ko tip', html: '💡 이 터미널에서는 <code>python 파일.py</code> · <code>pip install 이름</code> · <code>cls</code> 를 쓸 수 있어요.' }));
    scrollTerm();
  }
  if (cmdInput) {
    cmdInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { const v = cmdInput.value; cmdInput.value = ''; command(v); }
    });
  }

  function speak(info) {
    try {
      if (!window.speechSynthesis) { toast('이 브라우저는 음성 기능이 없어요', 'bad'); return; }
      const u = new SpeechSynthesisUtterance(info.text || '');
      u.lang = info.lang === 'ko' ? 'ko-KR' : (info.lang || 'en');
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { toast('소리를 낼 수 없어요', 'bad'); }
  }

  function changed() { if (o.onChange) o.onChange(clone(proj)); }
  function paintAll() { paintTree(); paintTabs(); paintEditor(); }
  paintAll();

  return {
    getProject: () => clone(proj),
    setProject(p, act) {
      proj = clone(p);
      expanded = new Set(allDirs(proj));
      active = act && proj.files[act] !== undefined ? act : firstPy();
      tabs = active ? [active] : [];
      selected = active; errMark = null; editing = null;
      fill(termOut);
      paintAll();
    },
    run: (entry) => run(entry || active),
    open: (path) => openFile(path),
    clearTerminal: () => fill(termOut),
    print: (text, cls = 't-info') => { termOut.append(tline(cls, text)); scrollTerm(); },
    get active() { return active; },
    get last() { return last; },
    get installed() { return [...installed]; },
  };
}
