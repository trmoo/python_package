/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ① 개념 잡기 — 왜 나눌까 · 모듈⊂패키지⊂라이브러리 · 분류 · import 문 읽기 · 어디서 올까 · ⭐ 내 꾸러미도 pip 로
 */
import { h, fill, toast, modal } from '../ui/dom.js';
import { codeBlock, quickRun, head } from './common.js';
import { createIDE } from '../ui/ide.js';
import { slot, save } from '../lib/store.js';
import { WHY, LEVELS, INIT_INFO, NUMPY_BOOK, PANDAS, treeLines, numpyBookAsNode, BINS, SORT_CARDS, ROLES, ANATOMY, SOURCES, PIP_PROJECT, PUBLISH } from '../data/concept.js';
import { MODULE1 } from '../data/imports.js';
import { isDone } from '../lib/progress.js';
import { S } from '../lib/store.js';

/* ── 1. 왜 나눌까 ── */
export function renderWhy(body, api) {
  const st = { way: 'copy', fixed: false };
  const rec = slot('why', () => ({ copy: false, mod: false }));
  const markFixed = () => { rec[st.way === 'copy' ? 'copy' : 'mod'] = true; save(); api.refreshNav(); };
  const stage = h('div', { class: 'col grow' });
  const resultOf = (files) => quickRun(files);
  const want = { mine: '85.0', friend: '8.5' };

  function program(title, code, res, key) {
    const right = res.text === want[key];
    return h('div', { class: 'card col', style: { flex: 1, gap: '6px' } },
      h('b', {}, title), codeBlock(code, true),
      h('div', { class: 'row small' }, '실행 결과 ', h('code', {}, res.text),
        right ? h('span', { class: 'ok-mark' }, '✔ 맞는 값') : h('span', { class: 'no-mark' }, `✘ 틀린 값 (맞는 값 ${want[key]})`)));
  }
  function paint() {
    const fn = st.fixed ? WHY.fixed : WHY.buggy;
    let top = null, mine, friend;
    if (st.way === 'copy') {
      const mineFn = st.fixed ? WHY.fixed : WHY.buggy; // 내 것만 고친다
      const mCode = `${mineFn}\n\nprint(${WHY.mine.call})`;
      const fCode = `${WHY.buggy}\n\nprint(${WHY.friend.call})`;
      mine = program(`📄 ${WHY.mine.title}`, mCode, resultOf({ 'main.py': mCode }), 'mine');
      friend = program(`📄 ${WHY.friend.title}`, fCode, resultOf({ 'main.py': fCode }), 'friend');
    } else {
      const mod = fn + '\n';
      const mCode = `import score\n\nprint(score.${WHY.mine.call})`;
      const fCode = `import score\n\nprint(score.${WHY.friend.call})`;
      top = h('div', { class: 'card', style: { borderColor: 'var(--mod)', background: 'var(--mod-bg)' } },
        h('b', {}, '📄 score.py — 모듈 하나를 두 프로그램이 함께 씀'), codeBlock(fn, true));
      mine = program(`📄 ${WHY.mine.title}`, mCode, resultOf({ 'main.py': mCode, 'score.py': mod }), 'mine');
      friend = program(`📄 ${WHY.friend.title}`, fCode, resultOf({ 'main.py': fCode, 'score.py': mod }), 'friend');
    }
    fill(stage,
      h('div', { class: 'row' },
        h('button', { class: 'btn' + (st.way === 'copy' ? ' primary' : ''), onClick: () => { st.way = 'copy'; st.fixed = false; paint(); } }, '방법 A · 함수를 복사해 붙이기'),
        h('button', { class: 'btn' + (st.way === 'mod' ? ' primary' : ''), onClick: () => { st.way = 'mod'; st.fixed = false; paint(); } }, '방법 B · 모듈로 나눠 import'),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn good', disabled: st.fixed, onClick: () => { st.fixed = true; markFixed(); paint(); } }, st.way === 'copy' ? '🐞 내 프로그램의 평균 함수 고치기' : '🐞 score.py 의 평균 함수 고치기')),
      top,
      h('div', { class: 'row', style: { alignItems: 'stretch' } }, mine, friend),
      h('div', { class: 'note' + (st.fixed ? (st.way === 'copy' ? ' bad' : ' good') : ''), html: !st.fixed
        ? '평균 함수에 실수가 숨어 있어요 — 점수가 몇 개든 언제나 <b>3</b> 으로 나눠요. 위의 🐞 단추로 고쳐 보세요.'
        : st.way === 'copy'
          ? '내 프로그램은 고쳐졌지만 <b>친구 프로그램은 여전히 틀려요.</b> 복사해 간 곳마다 찾아가 다시 고쳐야 해요. 복사본이 열 군데라면?'
          : '<b>score.py 한 곳만 고쳤는데 두 프로그램이 모두 맞아졌어요.</b> 이것이 모듈로 나누는 까닭이에요.' }),
      h('div', { class: 'small muted' }, `해 본 것: 방법 A ${rec.copy ? '✔' : '—'} · 방법 B ${rec.mod ? '✔' : '—'}  (두 방법 모두 🐞 고치기를 눌러 견줘 보면 이 활동이 끝나요)`));
  }
  fill(body, h('div', { class: 'cols' },
    h('div', { class: 'col', style: { flex: 1.25 } }, head('왜 파일을 나눌까?', '친구가 「네 프로그램의 <b>평균 함수</b>만 빌려 줘」 라고 해요. 어떻게 나눠 줄까요?'), stage),
    h('div', { class: 'col', style: { width: '360px', flex: 'none' } },
      h('div', { class: 'card' }, h('h3', {}, '📄 모듈이란?'), h('p', { html: '변수·함수를 담아 둔 <b>.py 파일 하나</b>. 다른 파일에서 <code>import</code> 로 불러 쓴다.' }),
        h('p', { class: 'small muted' }, '씨마스 「프로그래밍」 교과서 143쪽 「정보 더하기」 — 코드의 효율적인 관리와 재사용성을 높이려고 모듈·패키지·라이브러리를 쓴다.')),
      ...[['♻️', '재사용', '한 번 만든 함수를 여러 프로그램이 import 해서 쓴다. 복사·붙이기가 필요 없다.'],
        ['🧹', '관리', '고칠 곳이 한 군데. 기능별로 파일이 나뉘어 있어 찾기도 쉽다.'],
        ['🤝', '협업', '큰 프로그램을 모듈로 나눠 팀원이 하나씩 맡아 만든다. (교과서 207쪽 「모듈화」)']]
        .map(([i, t, d]) => h('div', { class: 'card row', style: { alignItems: 'flex-start', flexWrap: 'nowrap' } }, h('span', { style: { fontSize: '26px' } }, i), h('div', {}, h('b', {}, t), h('div', { class: 'small muted' }, d)))))));
  paint();
}

/* ── 2. 모듈 ⊂ 패키지 ⊂ 라이브러리 ── */
export function renderLayers(body, api) {
  const st = { lit: null, view: 'std', shape: 'box' };
  const rec = slot('layers', () => ({ seen: [] }));
  const left = h('div', { class: 'col grow' });
  const right = h('div', { class: 'col', style: { width: '400px', flex: 'none' } });
  const pick = (id) => (e) => { e.stopPropagation(); st.lit = id; paint(); };
  const box = (cls, label, kids, id) => h('div', { class: `nest ${cls}` + (st.lit === id ? ' lit' : ''), onClick: pick(id) },
    h('div', { class: 'lab' }, label), kids ? h('div', { class: 'kids' }, kids) : null);
  const fnChip = (f) => h('div', { class: 'nest fn', onClick: pick('fn') }, `ƒ ${f}`);
  // 점선 __init__.py 를 누르면 오른쪽에 그 역할을 설명한다 (네 가지 개념과 따로 — 완료 조건에는 넣지 않았다)
  const initChip = () => h('div', { class: 'nest ini' + (st.lit === 'init' ? ' lit' : ''), onClick: pick('init') }, '__init__.py');
  const note = (t) => h('div', { class: 'tiny muted', style: { width: '100%' } }, t);

  /** pandas — 폴더 안에 폴더가 또 있는(하위 패키지) 짜임을 그대로 그린다. 아래층은 kids 로 따라 내려간다 */
  function node(n) {
    if (n.kind === 'mod') return box('mod', `📄 ${n.name}`, n.fns.map(fnChip), 'mod');
    if (n.kind === 'pkg') return box('pkg', `📦 ${n.name}`, [initChip(), ...n.kids.map(node), n.note ? note(n.note) : null], 'pkg');
    // 맨 위 라이브러리 — pandas 자신도 __init__.py 가 있는 폴더다
    return box('', `📚 ${n.name}  — 라이브러리`, [
      h('div', { class: 'row', style: { width: '100%', gap: '6px' } }, initChip(), h('span', { class: 'tiny muted' }, `← ${n.init}`)),
      ...n.kids.map(node)], 'lib');
  }
  /** 교과서 143쪽의 NumPy 그림 (외부 라이브러리 예) */
  function bookTree() {
    return box('', `📚 ${NUMPY_BOOK.name}  — 라이브러리`, NUMPY_BOOK.pkgs.map((pk) => box('pkg', `📦 ${pk.name}`, [
      initChip(), ...pk.mods.map((m) => box('mod', `📄 ${m.name}`, m.fns.map(fnChip), 'mod')), note(pk.note)], 'pkg')), 'lib');
  }
  /** 폴더 나무 그림 — 미션 화면의 mypackage/ 그림과 같은 꼴. 이름을 누르면 그 개념이 켜지고,
   *  모듈 줄의 「# def … / # class …」 를 누르면 「모듈 안의 이름」 이 켜진다 */
  function folderTree(root) {
    const on = (id) => (st.lit === id ? { background: 'color-mix(in srgb, currentColor 16%, transparent)', borderRadius: '4px', boxShadow: '0 0 0 2px color-mix(in srgb, currentColor 16%, transparent)' } : {});
    // 두 칸 격자 — 왼쪽은 나무, 오른쪽은 # 설명. 설명 칸이 줄마다 같은 자리에서 시작한다
    return h('div', { class: 'tree', style: { display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '36px', fontSize: '16px', lineHeight: '1.8', padding: '12px 18px' } },
      treeLines(root).map(([k, text, cmt, id]) => {
        const name = text.replace(/^[│├└─ ]+/, '');
        const fnLine = k === 'f';
        return [
          h('span', {}, h('span', { style: { color: '#adb5bd' } }, text.slice(0, text.length - name.length)),
            h('span', { class: k, style: { cursor: 'pointer', ...(id === 'lib' ? { color: 'var(--lib)' } : {}), ...on(id) }, onClick: pick(id) }, name)),
          h('span', {}, cmt ? h('span', { class: 'c', style: { cursor: 'pointer', ...(fnLine ? { color: 'var(--nm)', ...on('fn') } : {}) }, onClick: pick(fnLine ? 'fn' : id) }, `# ${cmt}`) : null)];
      }));
  }

  function paint() {
    // 눌러 본 개념을 적어 둔다 — 네 가지를 모두 눌러 보면 이 활동이 끝난다
    if (st.lit && !rec.seen.includes(st.lit)) { rec.seen.push(st.lit); save(); api.refreshNav(); }
    if (!st.lit) st.lit = 'lib';
    const tree = st.shape === 'tree';
    const shapeBtn = (id, label) => h('button', { class: 'btn small' + (st.shape === id ? ' primary' : ''), onClick: () => { st.shape = id; paint(); } }, label);
    fill(left,
      h('div', { class: 'row' }, h('h2', { style: { margin: 0 } }, '모듈 ⊂ 패키지 ⊂ 라이브러리'), h('span', { class: 'grow' }),
        h('span', { class: 'muted small' }, '그림 꼴'), shapeBtn('box', '🧱 상자 그림'), shapeBtn('tree', '🌳 폴더 나무 그림')),
      h('div', { class: 'row' }, h('span', { class: 'muted small' }, tree ? '이름을 눌러 보세요 — 들여 쓴 줄은 바로 위 폴더 안에 있어요.' : '상자를 눌러 보세요 — 큰 상자가 작은 상자를 품고 있어요.'), h('span', { class: 'grow' }),
        h('button', { class: 'btn small' + (st.view === 'std' ? ' primary' : ''), onClick: () => { st.view = 'std'; paint(); } }, '🐼 pandas 로 보기'),
        h('button', { class: 'btn small' + (st.view === 'book' ? ' primary' : ''), onClick: () => { st.view = 'book'; paint(); } }, '📕 교과서 143쪽 그림 (NumPy)')),
      tree ? folderTree(st.view === 'std' ? PANDAS : numpyBookAsNode()) : st.view === 'std' ? node(PANDAS) : bookTree(),
      st.view === 'std'
        ? h('div', { class: 'row', style: { alignItems: 'stretch', flexWrap: 'nowrap' } },
          codeBlock('import pandas as pd\ndf = pd.read_csv("score.csv")\nprint(df.head())', true),
          h('div', { class: 'note small', style: { flex: 1 }, html: '수업에서 쓰던 <code>pd.read_csv( )</code> 는 사실 <b>pandas/io/parsers/readers.py</b> 안의 함수예요. <code>pandas/__init__.py</code> 가 미리 불러 두어서 <code>pd.</code> 바로 뒤에 쓸 수 있어요 (미션 4 의 <code>__init__.py</code> 와 같은 원리).<br><span class="tiny muted">※ <code>random</code>·<code>math</code> 는 모듈 한 겹이라 이렇게 여러 층이 아니에요.</span>' }))
        : h('div', { class: 'note warn small', html: '교과서는 같은 짜임을 <b>외부 라이브러리</b> NumPy 로 보여 줘요(pip 로 설치). 그림은 구조를 보여 주려는 예시라, 실제 NumPy 2.4 는 폴더 이름이 소문자 <code>numpy</code> 이고 <code>array.py</code>·<code>solve.py</code> 같은 파일 이름도 달라요. 그래도 <b>「라이브러리 ⊃ 패키지(폴더 + __init__.py) ⊃ 모듈(파일)」</b> 짜임은 똑같아요.' }));
    const L = LEVELS.find((x) => x.id === st.lit);
    const isInit = st.lit === 'init';
    const chipStyle = (on) => ({ border: on ? '2px solid currentColor' : '2px solid transparent', cursor: 'pointer', fontSize: '15px', padding: '3px 10px' });
    // 완료 조건은 네 가지 개념뿐이라 __init__.py 는 세지 않는다
    const seenLevels = LEVELS.filter((l) => rec.seen.includes(l.id)).length;
    const levelCard = () => h('div', { class: 'card col', style: { gap: '8px' } },
      h('h3', {}, `${L.icon} ${L.name} `, h('span', { class: 'muted small' }, L.en)),
      h('p', {}, L.def),
      h('div', { class: 'small' }, h('b', {}, '예  '), L.ex));
    const initCard = () => h('div', { class: 'card col', style: { gap: '5px' } },
      h('h3', {}, h('code', {}, '__init__.py'), ' ', h('span', { class: 'muted small' }, INIT_INFO.sub)),
      INIT_INFO.points.map(([k, v]) => h('div', { class: 'small' }, h('b', {}, k), '  ', v)),
      Object.assign(codeBlock(INIT_INFO.code, true), { style: 'flex:none' }), // 카드가 좁아져도 코드 줄이 눌려 잘리지 않게
      h('div', { class: 'small' }, '그래서 ', h('code', {}, INIT_INFO.long), ' 대신 ', h('code', {}, INIT_INFO.short), ' 로 바로 써요.'),
      h('div', { class: 'tiny muted' }, `※ ${INIT_INFO.note}`));
    fill(right,
      h('div', { class: 'row' },
        LEVELS.map((x) => h('button', { class: `chip ${x.cls}`, style: chipStyle(x.id === st.lit), onClick: () => { st.lit = x.id; paint(); } }, `${rec.seen.includes(x.id) ? '✔ ' : ''}${x.icon} ${x.name}`)),
        h('button', { class: 'chip', style: { ...chipStyle(isInit), color: '#495057', background: '#f1f3f5', fontFamily: 'var(--mono)' }, onClick: () => { st.lit = 'init'; paint(); } }, `${rec.seen.includes('init') ? '✔ ' : ''}📝 __init__.py`)),
      h('div', { class: 'tiny muted' }, `네 가지를 모두 눌러 보세요 (${seenLevels}/${LEVELS.length}) · 점선 상자 __init__.py 는 무슨 일을 할까요?`),
      isInit ? initCard() : levelCard(),
      isInit ? null : h('table', { class: 't small' },
        h('tr', {}, h('th', {}, '무엇'), h('th', {}, '실제로는'), h('th', {}, '불러오기')),
        h('tr', {}, h('td', {}, '📄 모듈'), h('td', {}, '.py 파일'), h('td', {}, h('code', {}, 'import random'))),
        h('tr', {}, h('td', {}, '📦 패키지'), h('td', {}, '폴더 (+ __init__.py)'), h('td', {}, h('code', {}, 'import mypackage.module1'))),
        h('tr', {}, h('td', {}, '📚 라이브러리'), h('td', {}, '패키지·모듈 꾸러미'), h('td', {}, h('code', {}, 'pip install pandas'), h('div', { class: 'tiny muted' }, '코랩에는 미리 깔려 있어요')))),
      h('details', { class: 'more' }, h('summary', {}, '🔬 「라이브러리」 는 문법 용어가 아니에요'),
        h('p', { class: 'small', html: '모듈·패키지는 파이썬이 정한 말이지만, 「라이브러리」 는 <b>남이 쓰라고 묶어 내놓은 코드</b>를 부르는 일상어예요. 그래서 random 모듈 하나를 「random 라이브러리」 라고 부르는 사람도 있어요. 이 앱은 교과서 정의(여러 패키지·모듈을 모아 놓은 것)를 따릅니다.' })));
  }
  fill(body, h('div', { class: 'cols' }, left, right));
  paint();
}

/* ── 3. 분류해 보기 ── */
export function renderSort(body, api) {
  const S = slot('sort', () => ({ put: {}, graded: false }));
  let sel = null;
  const wrap = h('div', { class: 'col grow' });
  function paint() {
    const right = SORT_CARDS.filter((c) => S.put[c.id] === c.ans).length;
    fill(wrap,
      h('div', { class: 'row' }, h('h2', { style: { margin: 0 } }, '분류해 보기'), h('span', { class: 'muted' }, '카드를 누른 다음 아래 바구니를 누르세요. 다 넣으면 [채점]!')),
      h('div', { class: 'cards' }, SORT_CARDS.map((c) => {
        const put = S.put[c.id];
        const bin = BINS.find((b) => b.id === put);
        const cls = S.graded && put ? (put === c.ans ? ' right' : ' wrong') : '';
        return h('div', { class: 'scard' + (sel === c.id ? ' sel' : '') + cls, onClick: () => { sel = c.id; paint(); } },
          h('div', { class: 'nm' }, c.nm), h('div', { class: 'ctx' }, c.ctx),
          S.graded && put ? h('div', { class: 'tiny', style: { color: put === c.ans ? 'var(--good)' : 'var(--bad)' } }, (put === c.ans ? '✔ ' : `✘ 정답은 ${BINS.find((b) => b.id === c.ans).name} — `) + c.why) : null,
          h('div', { class: 'put' }, bin ? h('span', { class: 'chip', style: { color: bin.color, background: '#fff', border: `1px solid ${bin.color}` } }, `${bin.icon} ${bin.name}`) : h('span', { class: 'tiny muted' }, '아직 안 넣음')));
      })),
      h('div', { class: 'bins' }, BINS.map((b) => h('div', { class: 'bin', style: { '--c': b.color }, onClick: () => {
        if (!sel) { toast('먼저 위의 카드를 하나 누르세요'); return; }
        S.put[sel] = b.id; S.graded = false; save();
        const nextCard = SORT_CARDS.find((c) => !S.put[c.id]);
        sel = nextCard ? nextCard.id : null;
        paint();
      } }, h('h4', {}, `${b.icon} ${b.name}`), h('p', {}, b.hint)))),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onClick: () => {
          if (Object.keys(S.put).length < SORT_CARDS.length) { toast(`아직 ${SORT_CARDS.length - Object.keys(S.put).length}장이 남았어요`); return; }
          S.graded = true; save(); paint(); api.refreshNav();
        } }, '✔ 채점'),
        h('button', { class: 'btn', onClick: () => { S.put = {}; S.graded = false; sel = null; save(); paint(); } }, '↺ 다시'),
        S.graded ? h('b', { class: right === SORT_CARDS.length ? 'ok-mark' : '' }, `${SORT_CARDS.length}장 가운데 ${right}장 맞음${right === SORT_CARDS.length ? ' 🎉' : ' — 틀린 카드의 설명을 읽고 다시 넣어 보세요'}`) : null));
  }
  sel = (SORT_CARDS.find((c) => !S.put[c.id]) || {}).id || null;
  fill(body, wrap);
  paint();
}

/* ── 4. import 문 읽기 ── */
export function renderAnatomy(body, api) {
  const S = slot('anatomy', () => ({}));
  const grid = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } });
  const MARK = { background: '#ffec99', borderBottom: '3px solid #f59f00', padding: '0 3px', borderRadius: '4px' };
  /** 💡 힌트 그림 — 폴더 나무 꼴. 노란 줄이 밑줄 친 이름이고, 답은 적지 않는다 (/ · .py · ( ) 를 스스로 읽게) */
  function hintTree(rows) {
    const color = { r: 'var(--ink)', d: 'var(--pkg)', i: '#868e96', f: 'var(--mod)', n: 'var(--nm)', a: '#e8590c', c: '#adb5bd' };
    return h('div', { class: 'tree', style: { display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '28px', fontSize: '17px', lineHeight: '1.9', padding: '10px 16px' } },
      rows.map(([k, text, cmt, mark]) => {
        const name = text.replace(/^[│├└─ ]+/, '');
        const gap = k === 'a' ? { marginTop: '8px' } : null; // 별명 줄은 나무와 한 줄 띄운다 — 나무 안에 없는 이름이라서
        return [
          h('span', { style: gap }, h('span', { style: { color: '#adb5bd' } }, text.slice(0, text.length - name.length)),
            h('span', { style: { color: color[k], fontWeight: k === 'i' || k === 'c' ? 400 : 800, ...(mark ? MARK : {}) } }, k === 'a' ? `🏷 ${name}` : name)),
          h('span', { class: 'c', style: gap }, cmt ? `# ${cmt}` : '')];
      }));
  }
  function showHint(it) {
    const word = it.parts.find((p) => typeof p === 'object').t;
    modal(`💡 힌트 — 「${word}」 는 어디에 있을까요?`, h('div', { class: 'col', style: { gap: '10px' } },
      h('div', { class: 'code', style: { fontSize: '18px', fontWeight: 700 } }, it.parts.map((p) => (typeof p === 'string' ? p : h('span', { style: MARK }, p.t)))),
      hintTree(it.hint.tree),
      h('div', { style: { fontSize: '16px' } }, `🤔 ${it.hint.ask}`),
      h('div', { class: 'small muted' }, '📁 이름/ — 폴더   ·   📄 이름.py — 파일 하나   ·   이름( ) — 파일 안에서 꺼내 쓰는 것')),
    { ok: '닫기', wide: true });
  }
  function item(it, i) {
    const pick = S[i];
    const ok = pick === it.ans;
    return h('div', { class: 'card col', style: { gap: '5px', padding: '9px 12px', borderColor: pick ? (ok ? '#8ce99a' : '#ffa8a8') : 'var(--line)' } },
      h('div', { class: 'code', style: { fontSize: '18px', fontWeight: 700 } }, it.parts.map((p) => (typeof p === 'string' ? p : h('span', { style: { background: '#ffec99', borderBottom: '3px solid #f59f00', padding: '0 3px', borderRadius: '4px' } }, p.t)))),
      h('div', { class: 'row', style: { gap: '4px' } }, ROLES.map((r) => h('button', {
        class: 'btn small' + (pick === r.id ? (ok ? ' good' : '') : ''), style: pick === r.id && !ok ? { background: 'var(--bad)', color: '#fff', borderColor: 'var(--bad)' } : null,
        onClick: () => { S[i] = r.id; save(); paint(); api.refreshNav(); },
      }, r.label)), h('span', { class: 'grow' }),
      h('button', { class: 'btn small', title: '힌트 그림 보기', onClick: () => showHint(it) }, '💡 힌트')),
      pick ? h('div', { class: 'tiny', style: { color: ok ? 'var(--good)' : 'var(--bad)' } }, (ok ? '✔ ' : '✘ 다시 골라 보세요 — ') + (ok ? it.why : '밑줄 친 것이 파일인지, 폴더인지, 꾸러미인지, 그 안의 이름인지 생각해 봐요.')) : null);
  }
  function paint() { fill(grid, ANATOMY.map(item)); }
  fill(body, h('div', { class: 'col', style: { height: '100%' } },
    h('div', { class: 'row', style: { marginBottom: '8px' } }, h('h2', { style: { margin: 0 } }, 'import 문 읽기'), h('span', { class: 'muted' }, '노랗게 밑줄 친 것은 무엇일까요? 알맞은 것을 고르세요.')), grid));
  paint();
}

/* ── 5. 모듈은 어디서 올까 — pip ── */
export function renderWhere(body, api) {
  const S = slot('pip', () => ({ installed: [], project: null, ok: false }));
  const ideHost = h('div', { style: { flex: 1, minWidth: 0, height: '100%' } });
  fill(body, h('div', { class: 'cols' },
    h('div', { class: 'col', style: { width: '430px', flex: 'none', gap: '8px' } },
      h('h2', {}, '모듈은 어디서 올까?'),
      h('table', { class: 't small' }, SOURCES.map((s) => h('tr', {},
        h('td', { style: { borderLeft: `5px solid ${s.color}`, whiteSpace: 'nowrap' } }, h('b', {}, `${s.icon} ${s.title}`), h('div', { class: 'tiny muted' }, s.body)),
        h('td', {}, h('code', {}, s.ex), h('div', { class: 'tiny' }, s.how))))),
      h('div', { class: 'card small', style: { padding: '8px 12px' } },
        h('b', {}, '해 보기 — 씨마스 교과서 141쪽의 gtts'),
        h('ol', { style: { margin: '4px 0 0', paddingLeft: '20px' } },
          h('li', { html: '▶ 를 눌러 보세요 → <code>ModuleNotFoundError</code>' }),
          h('li', { html: '터미널 아래 칸에 <code>pip install gtts</code> + <kbd>Enter</kbd>' }),
          h('li', { html: '다시 ▶ → 생긴 <code>hello.mp3</code> 를 눌러 듣기' }),
          h('li', { html: '⚠ <code>main.py</code> 첫 줄에 <code>pip install gtts</code> 를 쓰고 ▶ 하면?' }))),
      h('div', { class: 'note small', html: '<b>pip 와 !pip</b> (교과서 141쪽 Tip) — VS Code 의 <b>터미널</b>에서는 <code>pip install gtts</code>, 코랩·주피터의 <b>셀</b>에서는 <code>!pip install gtts</code>.' }),
      h('div', { class: 'tiny muted' }, '이 앱의 pip·gtts 는 흉내예요. 실제로 내려받지 않고, 소리는 브라우저의 음성 기능으로 냅니다. 진짜 gtts 는 인터넷으로 구글 서버에 글을 보내 mp3 를 받아 와요.')),
    ideHost));
  createIDE(ideHost, {
    project: S.project || PIP_PROJECT, commands: true, installed: S.installed, termHeight: 230,
    onChange: (p) => { S.project = p; save(); },
    onInstall: (list) => { S.installed = list; save(); toast(list.includes('gtts') ? '설치 완료! 다시 ▶ 를 눌러 보세요' : '지웠어요'); },
    // 설치한 gtts 로 소리 파일을 실제로 만들어 내면 이 활동이 끝난다
    onRun: (r) => {
      if (!S.ok && r.ok && (r.written || []).length && r.events.some((e) => e.name === 'gtts')) { S.ok = true; save(); toast('✅ 외부 라이브러리를 설치해서 써 봤어요!', 'good'); api.refreshNav(); }
    },
  });
}

/* ── 6. ⭐ 내 꾸러미도 pip 로 나눠 주기 — 택배 네 걸음 ── */
export function renderPublish(body, api) {
  const rec = slot('publish', () => ({ seen: [], ans: {} }));
  const P = PUBLISH;
  // 처음 열면 아직 안 본 첫 걸음부터
  const st = { cur: (P.steps.find((s) => !rec.seen.includes(s.id)) || P.steps[0]).id, full: false };
  const stepRow = h('div', { class: 'pub-steps' });
  const detail = h('div', { class: 'card pub-detail' });
  const quizBox = h('div', { class: 'col', style: { gap: '10px' } });
  let wasDone = isDone('concept/publish', S);
  const afterChange = () => {
    save(); api.refreshNav();
    const now = isDone('concept/publish', S);
    if (now && !wasDone) toast('🎉 이제 내 꾸러미를 친구에게 나눠 줄 수 있어요!', 'good');
    wasDone = now;
  };

  /** 폴더 나무 — 두 칸 격자라 # 설명이 줄마다 같은 자리에서 시작한다 */
  const tree = (lines) => h('div', { class: 'tree', style: { display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '22px' } },
    lines.map(([k, text, note]) => [h('span', { class: k }, text), h('span', { class: 'c' }, note ? `# ${note}` : '')]));
  /** 터미널 흉내 — cmd 줄은 > 를 붙이고, 설명은 회색으로 */
  const term = (lines) => h('div', { class: 'shot' }, h('div', { class: 'bar' }, '터미널'),
    h('div', { class: 'in' }, lines.map(([k, text, note]) => h('div', {},
      k === 'cmd' ? [h('span', { class: 't-ps' }, '> '), h('span', { class: 't-cmd' }, text)] : h('span', { class: 't-out' }, text),
      note ? h('span', { class: 't-info' }, `   # ${note}`) : null))));

  function paintSteps() {
    fill(stepRow, P.steps.map((s, i) => [
      i ? h('span', { class: 'pub-arrow' }, '→') : null,
      h('button', { class: 'pub-step' + (st.cur === s.id ? ' on' : ''), onClick: () => show(s.id) },
        h('span', { class: 'ic' }, s.icon),
        h('span', {}, h('div', { class: 'n' }, `${i + 1}단계`), h('div', { class: 't' }, s.title), h('div', { class: 'c' }, s.cmd)),
        rec.seen.includes(s.id) ? h('span', { class: 'seen' }, '✔') : null)]));
  }
  function paintDetail() {
    const i = P.steps.findIndex((s) => s.id === st.cur);
    const s = P.steps[i];
    const left = [];
    if (s.list) left.push(h('ol', { class: 'pub-list' }, s.list.map((t) => h('li', { html: t }))));
    if (s.term) left.push(term(s.term));
    if (s.tree) left.push(tree(s.tree));
    if (s.code) {
      // 이름표는 짧은 판(두 줄)으로 보여 주고, 단추로 실제 파일 전체와 바꿔 본다 — 펼침 상자로 아래에 덧붙이면 화면이 넘친다
      const full = s.full && st.full;
      left.push(h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, h('b', { class: 'small' }, s.codeTitle), h('span', { class: 'grow' }),
        s.full ? h('button', { class: 'btn small', onClick: () => { st.full = !st.full; paintDetail(); } }, full ? '↩ 짧게 보기' : '🔬 실제 파일 전체 보기') : null));
      left.push(Object.assign(codeBlock(full ? s.full : s.code), { style: 'flex:none' }));
    }
    if (s.id === 'get') {
      // 친구 컴퓨터에 설치된 꾸러미는 폴더와 똑같이 불린다 — 화면의 실행 결과를 진짜로 돌려서 보여 준다
      const r = quickRun({ 'main.py': s.code, 'mypackage/__init__.py': '', 'mypackage/module1.py': MODULE1 });
      left.push(h('div', { class: 'small' }, '실행 결과 ', h('code', {}, r.text)));
    }
    const right = [h('div', { class: 'pub-say', html: s.say })];
    if (s.full && st.full) right.push(h('div', { class: 'pub-tip' }, h('span', { class: 'ic' }, '🔬'), h('span', {}, s.more)));
    if (s.id === 'get') right.push(h('table', { class: 't small' },
      h('tr', {}, h('th', {}, ''), h('th', {}, '쓰는 이름'), h('th', {}, '어디서 왔나')),
      h('tr', {}, h('td', {}, '설치할 때'), h('td', {}, h('code', {}, P.pipName)), h('td', {}, '이름표의 name')),
      h('tr', {}, h('td', {}, '부를 때'), h('td', {}, h('code', {}, P.importName)), h('td', {}, '폴더 이름'))));
    right.push(...s.tips.map(([ic, t]) => h('div', { class: 'pub-tip' }, h('span', { class: 'ic' }, ic), h('span', { html: t }))));
    right.push(h('span', { class: 'grow' }));
    right.push(h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
      i < P.steps.length - 1
        ? h('button', { class: 'btn primary', onClick: () => show(P.steps[i + 1].id) }, `다음 걸음 ▶ ${P.steps[i + 1].icon} ${P.steps[i + 1].title}`)
        : h('span', { class: 'small muted' }, '네 걸음 끝! 오른쪽 확인 문제를 풀어 보세요 →')));
    fill(detail,
      h('div', { class: 'col', style: { flex: 1.15, gap: '8px' } }, ...left),
      h('div', { class: 'col', style: { flex: 1, gap: '8px' } }, ...right));
  }
  function paintQuiz() {
    fill(quizBox,
      h('h3', { style: { margin: 0 } }, '✅ 확인해 봐요'),
      P.quiz.map((q, k) => {
        const pick = rec.ans[k];
        return h('div', { class: 'card col', style: { gap: '6px', padding: '10px 12px' } },
          h('div', { class: 'quiz-q', style: { fontSize: '15.5px', margin: 0 }, html: `${k + 1}. ${q.q}` }),
          h('div', { class: 'choices' }, q.choices.map((c, j) => h('button', {
            class: 'choice' + (pick === j ? (j === q.ans ? ' right' : ' wrong') : ''), style: { padding: '5px 10px', fontSize: '14.5px' },
            onClick: () => { rec.ans[k] = j; paintQuiz(); afterChange(); },
          }, k === 0 ? h('code', {}, c) : c))),
          pick === undefined ? null : h('div', { class: 'tiny', style: { color: pick === q.ans ? 'var(--good)' : 'var(--bad)' },
            html: (pick === q.ans ? '✔ ' : '✘ 다시 골라 보세요 — ') + q.why[pick] }));
      }));
  }
  function show(id) {
    st.cur = id;
    if (!rec.seen.includes(id)) { rec.seen.push(id); afterChange(); }
    paintSteps(); paintDetail();
  }

  fill(body, h('div', { class: 'cols pub' },
    h('div', { class: 'col grow' },
      h('div', { class: 'row', style: { flexWrap: 'nowrap' } },
        h('h2', { style: { margin: 0 } }, '내 꾸러미도 pip 로!'),
        h('span', { class: 'chip c-lib' }, '⭐ 더 알아보기 · 교과서 밖'),
        h('span', { class: 'small muted', html: '내가 만든 패키지도 친구가 <code>pip install</code> 로 받게 — <b>택배 보내기</b>와 같아요.' })),
      stepRow, detail),
    h('div', { class: 'col', style: { width: '330px', flex: 'none' } }, quizBox)));
  show(st.cur);
  paintQuiz();
}
