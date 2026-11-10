/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  ③ 패키지 만들기 — 가상 VS Code 미션 네 개.
 *  왼쪽 미션 판의 체크리스트가 프로젝트와 실행 결과를 보고 스스로 채워진다.
 */
import { h, fill, toast, modal, share } from '../ui/dom.js';
import { codeBlock, treeBlock, projectTree } from './common.js';
import { createIDE } from '../ui/ide.js';
import { slot, save } from '../lib/store.js';
import { clone } from '../lib/project.js';
import { MISSIONS, stepsDone } from '../data/missions.js';
import { blankKit } from '../ui/blanks.js';

const stateOf = (id) => slot(`mission:${id}`, () => ({ project: null, runs: {}, hint: 0, done: false }));

export function renderMission(id) {
  return (body, api) => {
    const m = MISSIONS.find((x) => x.id === id);
    const S = stateOf(id);
    // 📝 정리 빈칸 — 이야기의 핵심 낱말 + 미션에서 알게 된 것 (자료는 data/blanks.js)
    const kit = blankKit(`build/${id}`);
    const storyLine = kit.group && kit.group.lines.find((l) => l.story);
    const restIds = kit.group ? kit.group.lines.filter((l) => !l.story).map((l) => l.id) : [];
    const panel = h('div', { class: 'mission', style: share(330) });
    const ideHost = h('div', { style: { ...share(898), height: '100%' } });
    let proj = clone(S.project || m.start);
    let ide = null;

    function paint() {
      const marks = stepsDone(m, proj, S.runs);
      const all = marks.every(Boolean);
      if (all && !S.done) { S.done = true; save(); toast('🎉 미션 완료!', 'good'); api.refreshNav(); }
      fill(panel,
        h('h2', { style: { fontSize: '20px' } }, m.title),
        h('div', { class: 'story' }, storyLine ? kit.line(storyLine.id) : m.story),
        h('ul', { class: 'steps' }, m.steps.map((s, i) => h('li', { class: marks[i] ? 'ok' : '' }, h('span', { class: 'b' }, marks[i] ? '✓' : i + 1), h('span', { html: s.text })))),
        all ? h('div', { class: 'note good' }, h('span', { class: 'bigok' }, '🎉 미션 완료!'), ' 다음 미션으로 가 보세요 ▶') : null,
        h('div', { class: 'hintbox' },
          h('div', { class: 'row' },
            h('button', { class: 'btn small', disabled: S.hint >= m.hints.length, onClick: () => { S.hint++; save(); paint(); panel.scrollTop = panel.scrollHeight; } }, `💡 힌트 ${Math.min(S.hint + 1, m.hints.length)}/${m.hints.length}`),
            h('button', { class: 'btn small ghost', onClick: showAnswer }, '👀 모범 답안'),
            // 📝 미션에서 알게 된 것은 창으로 정리한다 — 왼쪽 판에 두면 단계가 많은 미션 3·4 에서 넘친다
            restIds.length ? h('button', { class: 'btn small bk-open', onClick: openNotes }, '📝 정리 ', kit.counter()) : null,
            h('button', { class: 'btn small ghost', onClick: async () => {
              if (!(await modal('처음부터', '이 미션에서 만든 것을 지우고 처음 모습으로 돌아갈까요?', { ok: '처음부터', cancel: '그만두기' }))) return;
              S.project = null; S.runs = {}; S.hint = 0; S.done = false; save(); proj = clone(m.start); ide.setProject(proj); paint(); api.refreshNav();
            } }, '↺ 처음부터')),
          m.hints.slice(0, S.hint).map((t, i) => h('div', { class: 'h' }, `${i + 1}. ${t}`))));
    }
    function openNotes() {
      modal(`${m.title} — 📝 정리`, h('div', { class: 'col', style: { gap: '8px' } },
        h('p', { class: 'small muted', style: { margin: 0 } }, '미션에서 해 본 것을 떠올리며 빈칸을 채워 보세요. 맞힌 수는 왼쪽 이야기 속 빈칸까지 세요.'),
        kit.card(restIds)), { ok: '닫기' });
    }
    async function showAnswer() {
      const box = h('div', { class: 'col', style: { gap: '8px' } },
        h('p', { class: 'small muted' }, '스스로 해 본 다음 견줘 보세요. 이름(함수·말)은 달라도 괜찮아요.'),
        treeBlock(projectTree(m.answer.files)),
        Object.entries(m.answer.files).filter(([, src]) => src.trim()).map(([f, src]) => [h('b', { class: 'small' }, `📄 ${f}`), codeBlock(src.trimEnd(), true)]));
      if (await modal(`${m.title} — 모범 답안`, box, { ok: '이것으로 바꾸기', cancel: '닫기', wide: true })) {
        if (!(await modal('정말 바꿀까요?', '지금 만든 것이 모범 답안으로 바뀌어요.', { ok: '바꾸기', cancel: '그만두기' }))) return;
        proj = clone(m.answer); S.project = proj; S.runs = {}; save(); ide.setProject(proj, 'main.py'); paint();
      }
    }
    fill(body, h('div', { class: 'cols' }, panel, ideHost));
    ide = createIDE(ideHost, {
      project: proj, active: 'main.py',
      onChange: (p) => { proj = p; S.project = p; save(); paint(); },
      onRun: (r, p) => {
        // 실행 기록은 「파일마다 마지막 한 번」 만 남긴다 (용량을 아끼려고 결과는 필요한 것만)
        S.runs[r.entry] = { r: { ok: r.ok, stdout: r.stdout, calls: r.calls, entry: r.entry }, p };
        save(); paint();
      },
    });
    paint();
  };
}
