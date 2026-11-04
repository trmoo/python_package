/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ④ 수행평가 준비 — 평가 기준과 조건 · 연습 과제(조건 점검기) · 내 컴퓨터에서 만들기
 */
import { h, fill, toast, modal } from '../ui/dom.js';
import { codeBlock, treeBlock, head } from './common.js';
import { createIDE } from '../ui/ide.js';
import { slot, save } from '../lib/store.js';
import { CONDITIONS, check } from '../lib/checker.js';
import { makeZip, projectEntries } from '../lib/zip.js';
import { RUBRIC, EXAMPLE_TREE, EXAMPLE_MAIN, TOPICS, PRACTICE_START } from '../data/assess.js';

/* ── 1. 평가 기준과 조건 ── */
export function renderRubric(body) {
  fill(body, h('div', { class: 'cols' },
    h('div', { class: 'col', style: { width: '560px', flex: 'none' } },
      h('h2', {}, '수행평가 — 조건 여섯 가지'),
      h('div', { class: 'col', style: { gap: '5px' } }, CONDITIONS.map((c, i) => h('div', { class: 'card row', style: { padding: '5px 12px', flexWrap: 'nowrap', alignItems: 'flex-start', boxShadow: 'none' } },
        h('span', { style: { fontWeight: 900, fontSize: '19px', color: 'var(--brand)', width: '24px', flex: 'none', lineHeight: 1.3 } }, '①②③④⑤⑥'[i]),
        h('div', { style: { lineHeight: 1.35 } }, h('b', {}, c.title), h('div', { class: 'tiny muted' }, c.sub))))),
      h('div', { class: 'note warn small', html: '<b>⚠ __init__.py</b> — 파이썬 3.3 부터는 이 파일이 없어도 import 가 되기는 해요(「이름공간 패키지」). 그래서 빠뜨려도 VS Code 에서 잘 돌아갑니다. 하지만 「이 폴더는 패키지」 라고 밝히는 표지판이고, 교과서와 실제 라이브러리(numpy 등)는 모두 넣어 둡니다. <b>우리 수행평가의 조건이므로 꼭 넣으세요.</b>' })),
    h('div', { class: 'col grow' },
      h('h3', {}, `📝 평가 기준 — ${RUBRIC.title}`),
      h('table', { class: 't' }, h('tr', {}, h('th', { style: { width: '54px' } }, '점수'), h('th', {}, '기준')),
        RUBRIC.rows.map(([n, t]) => h('tr', {}, h('td', { class: 'c' }, n), h('td', {}, t)))),
      h('h3', { style: { marginTop: '4px' } }, '조건을 모두 지킨 예'),
      h('div', { class: 'row', style: { alignItems: 'stretch', flexWrap: 'nowrap' } },
        treeBlock(EXAMPLE_TREE),
        h('div', { class: 'col grow', style: { gap: '4px' } }, h('b', { class: 'small' }, '📄 main.py'), codeBlock(EXAMPLE_MAIN, true))),
      h('p', { class: 'small muted' }, '「4. 연습 과제」 의 조건 점검기로 내 프로젝트를 스스로 점검해 볼 수 있어요.'))));
}

/* ── 2. 연습 과제 + 조건 점검기 ── */
export function renderPractice(body, api) {
  const S = slot('practice', () => ({ project: null, topic: null }));
  let proj = S.project || PRACTICE_START;
  const panel = h('div', { class: 'mission', style: { width: '350px' } });
  const ideHost = h('div', { style: { flex: 1, minWidth: 0, height: '100%' } });
  let timer = null;

  function paint() {
    const res = check(proj);
    const topic = TOPICS.find((t) => t.name === S.topic);
    fill(panel,
      h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, h('h2', { style: { fontSize: '19px', margin: 0 } }, '연습 과제 · 조건 점검기'), h('span', { class: 'grow' }),
        h('button', { class: 'btn small primary', title: '만든 프로젝트를 zip 한 파일로 내려받아 VS Code 에서 열어요', onClick: download }, '💾 zip'),
        h('button', { class: 'btn small ghost', onClick: async () => {
          if (!(await modal('처음부터', '연습 과제에서 만든 것을 모두 지울까요?', { ok: '지우기', cancel: '그만두기' }))) return;
          proj = PRACTICE_START; S.project = null; save(); ide.setProject(proj); paint();
        } }, '↺')),
      h('div', { class: 'row', style: { gap: '4px' } }, TOPICS.map((t) => h('button', { class: 'btn small' + (S.topic === t.name ? ' primary' : ''), onClick: () => { S.topic = S.topic === t.name ? null : t.name; save(); paint(); } }, `${t.icon} ${t.name}`))),
      topic ? h('div', { class: 'note tiny', style: { padding: '5px 10px' } }, h('b', {}, `📦 ${topic.pkg}/ `), topic.mods.map((x) => h('div', {}, `📄 ${x}`)), h('div', {}, topic.note)) : null,
      h('div', { class: 'conds' }, res.items.map((it, i) => h('div', { class: `cond ${it.state === 'ok' ? 'ok' : it.state === 'part' ? 'part' : 'no'}` },
        h('span', { class: 'm' }, it.state === 'ok' ? '✅' : it.state === 'part' ? '🟨' : '⬜'),
        h('div', {}, h('b', {}, `${'①②③④⑤⑥'[i]} ${CONDITIONS[i].title}`), h('span', { class: 'd' }, ` — ${it.detail}`))))),
      h('div', { class: 'level' }, h('div', { class: 'row', style: { gap: '8px', flexWrap: 'nowrap' } }, h('span', { class: 'n' }, `${res.level}점`), h('span', { class: 'small' }, res.levelText)),
        h('div', { class: 'tiny', style: { opacity: 0.75, marginTop: '2px' } }, '⚠ 자기 점검일 뿐 채점이 아니에요. 최종 점수는 선생님이 파일을 보고 정해요.')));
    if (res.level === 5 && !S.passed) { S.passed = true; save(); api.refreshNav(); }
  }
  function download() {
    try {
      const bytes = makeZip(projectEntries(proj, 'my_package_project'));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
      const a = h('a', { href: url, download: 'my_package_project.zip' });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('my_package_project.zip 을 내려받았어요 — 압축을 풀고 VS Code 로 「폴더 열기」', 'good');
    } catch (e) { toast('내려받기에 실패했어요', 'bad'); }
  }
  fill(body, h('div', { class: 'cols' }, panel, ideHost));
  const ide = createIDE(ideHost, {
    project: proj, active: 'main.py',
    onChange: (p) => { proj = p; S.project = p; save(); clearTimeout(timer); timer = setTimeout(paint, 700); },
    onRun: () => paint(),
  });
  paint();
}

/* ── 3. 내 컴퓨터(VS Code)에서 만들기 ── */
export function renderVSCode(body) {
  const shot = (bar, lines) => h('div', { class: 'shot' }, h('div', { class: 'bar' }, bar), h('div', { class: 'in', html: lines }));
  const step = (n, title, desc, pic) => h('div', { class: 'card stepcard' }, h('div', {}, h('span', { class: 'num' }, n), h('b', {}, title)), h('div', { class: 'small', html: desc }), pic);
  fill(body, h('div', { class: 'cols' },
    h('div', { class: 'col grow' },
      head('내 컴퓨터(VS Code)에서 만들기', '이 앱에서 한 그대로 하면 돼요. 교과서도 VS Code 로 패키지를 만들어요 (211·213쪽).'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } },
        step(1, '폴더 열기', '바탕 화면에 새 폴더(예: <code>my_project</code>)를 만들고, VS Code 메뉴 <b>파일 → 폴더 열기</b>로 그 폴더를 엽니다. <b>파일 하나만 열면 탐색기가 비어</b> 패키지를 만들 수 없어요.',
          shot('탐색기', '▾ MY_PROJECT <span style="float:right">📄 📁 ⟳</span><br><span style="opacity:.6">(아직 비어 있음)</span>')),
        step(2, '폴더와 파일 만들기', '탐색기 위쪽의 <b>새 파일</b> 아이콘을 누르고 이름 칸에 <code>mytools/__init__.py</code> 처럼 적으면 <b>폴더와 파일이 한 번에</b> 생겨요. 끌어다 놓으면 옮겨져요.',
          shot('탐색기', '▾ MY_PROJECT<br>&nbsp;&nbsp;<span class="hl">mytools/__init__.py</span>|')),
        step(3, 'main.py 를 열고 ▶', '오른쪽 위 ▶(<b>Run Python File</b>)는 <b>지금 열려 있는 파일</b>을 실행해요. 꼭 <code>main.py</code> 탭을 누른 다음 ▶.',
          shot('main.py — my_project', 'main.py ×&nbsp;&nbsp;&nbsp;greet.py <span style="float:right;color:#89d185">▶</span><br>from mytools import greet')),
        step(4, '터미널에서 확인', '아래 <b>터미널</b>에 결과가 나와요. 오류가 나면 맨 아래 줄부터 읽고, <code>File "…", line N</code> 을 <kbd>Ctrl</kbd>+클릭하면 그 줄로 가요.',
          shot('터미널', 'PS C:\\Users\\…\\my_project&gt; &amp; python …/main.py<br>민지님, 안녕하세요!')))),
    h('div', { class: 'col', style: { width: '400px', flex: 'none' } },
      h('div', { class: 'note warn small', html: '<b>⚠ 이 앱과 다른 점</b><br>· 고친 파일은 <kbd>Ctrl</kbd>+<kbd>S</kbd> 로 <b>저장</b>해야 해요. 탭 이름 옆의 ● 는 「저장 안 함」 표시예요. 저장하지 않은 모듈은 고치기 전 내용으로 실행돼요. (메뉴 <b>파일 → 자동 저장</b>을 켜 두면 편해요)<br>· 실행하면 <code>__pycache__</code> 폴더가 저절로 생겨요. 파이썬이 만든 「번역해 둔 파일」 이라 그냥 두거나 지워도 돼요.<br>· 오류 문구의 경로는 <code>C:\\project</code> 대신 내 컴퓨터의 진짜 폴더 경로로 보여요.<br>· 이 앱의 오류 문구는 파이썬 3.12 기준이에요. 3.13 이후는 안내가 조금 더 붙어요.' }),
      h('div', { class: 'note small', html: '<b>💾 이 앱에서 만든 것 가져가기</b> — 「연습 과제」 의 <b>zip 으로 내려받기</b> → 압축 풀기 → VS Code 로 <b>폴더 열기</b>.' }),
      h('details', { class: 'more' }, h('summary', {}, 'Thonny 를 쓴다면'),
        h('p', { class: 'small', html: '메뉴 <b>보기 → 파일</b> 을 켜면 왼쪽에 폴더 창이 생겨 구조를 볼 수 있어요. 새 파일을 저장할 때 저장 창에서 폴더를 고르거나 새로 만들어요. <code>main.py</code> 를 연 채로 <kbd>F5</kbd>.' })),
      h('details', { class: 'more' }, h('summary', {}, 'IDLE 을 쓴다면'),
        h('p', { class: 'small', html: 'IDLE 에는 폴더 창이 없어요. <b>파일 → 새 파일</b> 다음 <b>다른 이름으로 저장</b> 창에서 「새 폴더」 를 만들고 그 안에 저장해요. <code>main.py</code> 를 연 채로 <kbd>F5</kbd>.<br>⚠ 윈도우 탐색기의 「새로 만들기 → 텍스트 문서」 로 <code>__init__.py</code> 를 만들면 진짜 이름이 <code>__init__.py.txt</code> 가 될 수 있어요(확장자가 숨겨져 있어서). 파일은 꼭 편집기에서 만드세요.' })))));
}
