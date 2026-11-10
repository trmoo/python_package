/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ④ 수행평가 준비 — 수행평가 문항 · 연습 과제(조건 점검기) · IDLE 에서 만들고 제출하기
 *  문항은 2026-11-05 선생님이 주신 것(foods 패키지 + start.py). 예전 「조건 여섯 가지 + 루브릭」 은 뺐다.
 */
import { h, fill, toast, modal, share } from '../ui/dom.js';
import { treeBlock, head } from './common.js';
import { createIDE } from '../ui/ide.js';
import { slot, save } from '../lib/store.js';
import { CONDITIONS, EXTRA, EXPECTED, SPEC, check } from '../lib/checker.js';
import { makeZip, projectEntries } from '../lib/zip.js';
import { QUESTION, GOAL_TREE, PRACTICE_START } from '../data/assess.js';

const MARK = (state) => (state === 'ok' ? '✅' : state === 'part' ? '🟨' : '⬜');
const outBox = (lines) => h('pre', { class: 'outbox' }, lines.join('\n'));

/* ── 1. 수행평가 문항 ── */
export function renderQuestion(body) {
  const part = (pt) => h('div', { class: 'card qpart' },
    h('div', { class: 'qhead' }, h('span', { class: 'qno' }, pt.no), h('b', {}, pt.title), h('span', { class: 'qpts' }, `${pt.points}점`)),
    h('ul', {}, pt.lines.map((t, i) => h('li', {}, h('span', { html: t }),
      pt.no === 2 && SPEC[i - 1] ? h('div', { class: 'qouts' }, SPEC[i - 1].mods.map(([m, txt]) => h('span', {}, h('code', {}, `${m}.py`), ` → ${txt}`))) : null))));
  fill(body, h('div', { class: 'cols' },
    h('div', { class: 'col', style: { ...share(640), gap: '8px' } },
      h('h2', {}, `수행평가 — ${QUESTION.title}`),
      h('p', { class: 'lead', style: { margin: 0 } }, QUESTION.lead),
      QUESTION.parts.map(part)),
    h('div', { class: 'col', style: { ...share(588), gap: '8px' } },
      h('h3', {}, '완성하면 이런 모습'),
      h('div', { class: 'row', style: { alignItems: 'stretch', flexWrap: 'nowrap' } },
        treeBlock(GOAL_TREE),
        h('div', { class: 'col', style: { gap: '4px', flex: 'none' } }, h('b', { class: 'small' }, '▶ start.py 출력 예'), outBox(EXPECTED))),
      h('div', { class: 'note small', html: '<b>💡 생각해 볼 것</b> — 세 모듈의 함수 이름이 모두 <code>drink</code>, 세 모듈은 모두 <code>eat</code> 예요. <code>start.py</code> 에서 서로 구별해 부르려면 어떻게 import 해야 할까요? (② 불러오기 탭의 「패키지 속 모듈 부르기」)' }),
      h('div', { class: 'note warn small', html: '<b>⚠ __init__.py</b> — 문항에는 없지만, 교과서(씨마스 143쪽)는 패키지 폴더마다 「패키지로 인식하게 해 주는 특별한 파일」 을 넣어요. 파이썬 3.3 부터는 없어도 실행되므로, 넣을지는 선생님 안내를 따르세요.' }),
      h('p', { class: 'small muted', style: { margin: 0 } }, '「연습 과제」 의 조건 점검기로 2번을 확인하고, 「IDLE 에서」 화면대로 만들어 압축해 제출해요. 1번(IDLE·압축)은 앱이 확인할 수 없어요.'))));
}

/* ── 2. 연습 과제 + 조건 점검기 ── */
export function renderPractice(body, api) {
  const S = slot('exam', () => ({ project: null }));
  let proj = S.project || PRACTICE_START;
  const panel = h('div', { class: 'mission', style: { ...share(400), gap: '7px' } });
  const ideHost = h('div', { style: { ...share(828), height: '100%' } });
  let timer = null;

  function paint() {
    const res = check(proj);
    const row = (it, label) => h('div', { class: `cond ${it.state === 'ok' ? 'ok' : it.state === 'part' ? 'part' : 'no'}` },
      h('span', { class: 'm' }, MARK(it.state)),
      h('div', {}, h('b', {}, label), h('span', { class: 'd' }, ` — ${it.detail}`)));
    fill(panel,
      h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, h('h2', { style: { fontSize: '19px', margin: 0 } }, '연습 과제 · 조건 점검기'), h('span', { class: 'grow' }),
        h('button', { class: 'btn small primary', title: '만든 것을 zip 한 파일로 내려받아 IDLE 로 열어 봐요', onClick: download }, '💾 zip'),
        h('button', { class: 'btn small ghost', onClick: async () => {
          if (!(await modal('처음부터', '연습 과제에서 만든 것을 모두 지울까요?', { ok: '지우기', cancel: '그만두기' }))) return;
          proj = PRACTICE_START; S.project = null; save(); ide.setProject(proj); paint();
        } }, '↺')),
      h('div', { class: 'tiny muted' }, '문항 2번을 오른쪽에 그대로 만들어 보세요. 탐색기의 맨 위가 「다운로드」 폴더예요.'),
      h('div', { class: 'conds', style: { overflowY: 'auto', minHeight: 0, flex: '1 1 auto' } },
        res.items.map((it, i) => row(it, `${'①②③④⑤⑥'[i]} ${CONDITIONS[i].title}`)),
        row(res.extra, EXTRA.title)),
      h('div', { class: 'level' }, h('div', { class: 'row', style: { gap: '8px', flexWrap: 'nowrap' } }, h('span', { class: 'n' }, `${res.okCount} / ${res.total}`), h('span', { class: 'small' }, res.summary)),
        h('div', { class: 'tiny', style: { opacity: 0.75, marginTop: '2px' } }, '⚠ 자기 점검이에요. 1번(IDLE·압축)은 볼 수 없고, 점수는 선생님이 파일을 보고 정해요.')));
    if (res.allOk && !S.passed) { S.passed = true; save(); api.refreshNav(); }
  }
  function download() {
    try {
      const bytes = makeZip(projectEntries(proj, 'foods_practice'));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
      const a = h('a', { href: url, download: 'foods_practice.zip' });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('foods_practice.zip 을 내려받았어요 — 압축을 풀고 IDLE 로 start.py 를 열어 F5', 'good');
    } catch (e) { toast('내려받기에 실패했어요', 'bad'); }
  }
  fill(body, h('div', { class: 'cols' }, panel, ideHost));
  const ide = createIDE(ideHost, {
    project: proj, active: 'start.py', title: '다운로드',
    onChange: (p) => { proj = p; S.project = p; save(); clearTimeout(timer); timer = setTimeout(paint, 700); },
    onRun: () => paint(),
  });
  paint();
}

/* ── 3. IDLE 에서 만들고 제출하기 ── */
export function renderIDLE(body) {
  const shot = (bar, lines, light) => h('div', { class: `shot${light ? ' light' : ''}` }, h('div', { class: 'bar' }, bar), h('div', { class: 'in', html: lines }));
  const step = (n, title, desc, pic) => h('div', { class: 'card stepcard' }, h('div', {}, h('span', { class: 'num' }, n), h('b', {}, title)), h('div', { class: 'small', html: desc }), pic);
  fill(body, h('div', { class: 'cols' },
    h('div', { class: 'col', style: share(828) },
      head('IDLE 에서 만들고 제출하기', '수행평가는 <b>IDLE</b> 로 해요. 이 앱(가상 VS Code)에서 연습한 그대로 만들면 돼요.'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } },
        step(1, 'IDLE 열고 새 파일', '시작 메뉴에서 <b>IDLE (Python 3.x)</b>. 처음 뜨는 <b>IDLE Shell</b> 창이 아니라 <b>File › New File</b> 로 연 새 창에 코드를 써요.',
          shot('untitled', 'def drink():<br>&nbsp;&nbsp;&nbsp;&nbsp;print(<span style="color:#0a7d00">\'…\'</span>)', true)),
        step(2, '다운로드 폴더에 폴더째 저장', '<b>File › Save As</b> → 왼쪽에서 <b>다운로드</b> → 저장 창의 <b>[새 폴더]</b> 로 <code>foods</code>, 그 안에 <code>drinks</code> · <code>fruits</code>. 파일 이름은 <code>milk</code> 처럼 쓰면 <code>.py</code> 가 붙어요.',
          shot('다른 이름으로 저장', '다운로드 › foods › <span class="hl">drinks</span><br>파일 이름: <span class="hl">milk.py</span> &nbsp; [새 폴더] [저장]')),
        step(3, 'start.py 를 열고 F5', '<code>start.py</code> 창에서 <b>Run › Run Module</b> (<kbd>F5</kbd>). 결과는 <b>IDLE Shell</b> 창에 나와요. 오류가 나면 맨 아래 줄부터 읽어요.',
          shot('IDLE Shell', '= RESTART: C:\\Users\\…\\Downloads\\start.py<br>신선한 우유<br>상쾌한 콜라 …', true)),
        step(4, '압축해서 제출', '파일 탐색기에서 다운로드 폴더 → <code>foods</code> 폴더와 <code>start.py</code> 를 <b>함께</b> 골라 오른쪽 클릭 → <b>압축 대상 › ZIP 파일</b> (윈도우 10: 보내기 › 압축(ZIP) 폴더) → 이름을 <b>모듈패키지 + 내 학번 + 이름</b> 으로.',
          shot('다운로드', '📁 <span class="hl">foods</span> &nbsp;📄 <span class="hl">start.py</span><br><b>[ZIP]</b> 모듈패키지30101홍길동.zip')))),
    h('div', { class: 'col', style: share(400) },
      h('div', { class: 'note warn small', html: '<b>⚠ 이것만은 조심</b><br>· 「다운로드」 의 진짜 경로는 <code>C:\\Users\\(내 이름)\\Downloads</code> 예요.<br>· <code>start.py</code> 는 <code>foods</code> 폴더 <b>밖</b>, foods 와 <b>나란히</b>. foods 안에 두면 <code>ModuleNotFoundError</code>.<br>· 폴더·파일 이름은 문항 그대로 <b>소문자</b>. <code>Foods</code> 는 import 하지 못해요(윈도우에서도).<br>· 탐색기의 「새로 만들기 → 텍스트 문서」 로 만들면 진짜 이름이 <code>milk.py.txt</code> 가 될 수 있어요. 파일은 꼭 IDLE 에서 저장해요.<br>· 다운로드에 예전에 만든 <code>foods.py</code> 처럼 <b>같은 이름</b>의 파일이 있으면 패키지가 가려질 수 있어요.<br>· 고친 파일은 다시 <b>저장</b>해야 바뀐 내용으로 실행돼요. 저장하지 않고 <kbd>F5</kbd> 를 누르면 IDLE 이 저장할지 물어요.' }),
      h('div', { class: 'note small', html: '<b>📌 압축할 때</b> — 다운로드 폴더 <b>전체</b>를 압축하면 다른 파일이 섞여요. <code>foods</code> 와 <code>start.py</code> 두 가지만 골라요. 실행하면 저절로 생기는 <code>__pycache__</code> 폴더는 들어가도 괜찮아요.' }),
      h('details', { class: 'more' }, h('summary', {}, 'VS Code 로 연습한다면'),
        h('p', { class: 'small', html: '<b>파일 → 폴더 열기</b> 로 <b>다운로드</b> 폴더를 열면 이 앱과 똑같이 왼쪽 탐색기에서 폴더·파일을 만들 수 있어요. <code>start.py</code> 탭을 누른 다음 오른쪽 위 ▶. 다만 <b>수행평가는 IDLE</b> 로 해요.' })),
      h('details', { class: 'more' }, h('summary', {}, '이 앱에서 만든 것을 가져가려면'),
        h('p', { class: 'small', html: '「연습 과제」 의 <b>💾 zip</b> → 압축 풀기 → IDLE 의 <b>File › Open</b> 으로 <code>start.py</code> 를 열고 <kbd>F5</kbd>. 연습용이에요 — 제출할 것은 IDLE 에서 직접 만들어요.' })))));
}
