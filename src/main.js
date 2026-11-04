/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  학교 수업 목적으로만 이용해 주세요. 자세한 내용은 LICENSE 를 보세요.
 *
 *  탭 차례 = 수업 흐름
 *    ① 개념 잡기 → ② 불러오기(import) → ③ 패키지 만들기(가상 VS Code) → ④ 수행평가 준비
 *  ★ 앞 탭의 활동을 모두 끝내야 다음 탭이 열린다 (2026-11-05 사용자 지시). 완료 조건은 lib/progress.js 한곳에.
 *  ★ 오른쪽 위 「💾 지금까지 한 활동 HTML 로 저장」 — 바탕 화면에 「학번_이름_패키지 공작소.html」.
 *  주소 해시로 화면을 바로 연다 — 예) #build/m2 (잠긴 탭이면 끝내지 않은 첫 활동으로 간다)
 */
import './style.css';
import { h, modal, toast } from './ui/dom.js';
import { createStage, createShell } from './ui/shell.js';
import { openSaveDialog } from './ui/save.js';
import { S, save, resetAll } from './lib/store.js';
import { isDone, blockers, teacherCodeOk } from './lib/progress.js';
import { renderWhy, renderLayers, renderSort, renderAnatomy, renderWhere } from './screens/concept.js';
import { renderForms, renderPkgForms, renderFix, renderQuiz } from './screens/imports.js';
import { renderMission } from './screens/build.js';
import { renderQuestion, renderPractice, renderIDLE } from './screens/assess.js';
import { MISSIONS } from './data/missions.js';

const TABS = [
  { id: 'concept', label: '개념 잡기', color: '#7048e8' },
  { id: 'import', label: '불러오기', color: '#0b9b6e' },
  { id: 'build', label: '패키지 만들기', color: '#e8590c' },
  { id: 'assess', label: '수행평가 준비', color: '#3b5bdb' },
];
const SCREENS = [
  { tab: 'concept', id: 'why', title: '왜 파일을 나눌까?', short: '왜 나눌까', render: renderWhy },
  { tab: 'concept', id: 'layers', title: '모듈 ⊂ 패키지 ⊂ 라이브러리', short: '모듈·패키지·라이브러리', render: renderLayers },
  { tab: 'concept', id: 'sort', title: '분류해 보기', short: '분류해 보기', render: renderSort },
  { tab: 'concept', id: 'anatomy', title: 'import 문 읽기', short: 'import 문 읽기', render: renderAnatomy },
  { tab: 'concept', id: 'where', title: '모듈은 어디서 올까? (pip)', short: '어디서 올까 · pip', render: renderWhere },
  { tab: 'import', id: 'forms', title: 'import 세 가지 꼴', short: 'import 세 가지 꼴', render: renderForms },
  { tab: 'import', id: 'pkgforms', title: '패키지 속 모듈 부르기', short: '패키지 속 모듈', render: renderPkgForms },
  { tab: 'import', id: 'fix', title: '오류 고치기', short: '오류 고치기', render: renderFix },
  { tab: 'import', id: 'quiz', title: '확인 문제', short: '확인 문제', render: renderQuiz },
  ...MISSIONS.map((m) => ({ tab: 'build', id: m.id, title: m.title, short: m.short, render: renderMission(m.id) })),
  { tab: 'assess', id: 'question', title: '수행평가 문항', short: '수행평가 문항', render: renderQuestion },
  { tab: 'assess', id: 'practice', title: '연습 과제 · 조건 점검기', short: '연습 과제', render: renderPractice },
  { tab: 'assess', id: 'idle', title: 'IDLE 에서 만들고 제출하기', short: 'IDLE 에서', render: renderIDLE },
].map((s) => ({ ...s, done: () => isDone(`${s.tab}/${s.id}`, S) }));

/** 잠긴 탭을 누르면 — 끝내지 않은 활동 목록(누르면 그리로 간다) + 선생님 열기 */
function showBlocked(tabId, list, go) {
  const tab = TABS.find((t) => t.id === tabId);
  const code = h('input', { type: 'password', autocomplete: 'off', placeholder: '선생님 코드', style: { width: '130px', font: 'inherit', fontSize: '14px', padding: '3px 8px', border: '1px solid var(--line)', borderRadius: '8px' } });
  const closeModal = () => { const b = document.querySelector('.overlay .modal-btns .btn'); if (b) b.click(); };
  const body = h('div', {},
    h('p', {}, `「${tab.label}」 탭은 앞의 활동을 모두 끝내야 열려요. 아직 남은 활동 ${list.length}가지 — 눌러서 바로 가 보세요.`),
    h('div', { class: 'lock-list' }, list.slice(0, 8).map((x) => h('button', { class: 'lock-item', onClick: () => { closeModal(); go(x.key); } },
      h('span', {}, '⬜'), h('span', {}, h('div', { class: 't' }, x.title), h('div', { class: 'w' }, x.how))))),
    list.length > 8 ? h('p', { class: 'small muted' }, `… 그리고 ${list.length - 8}가지 더`) : null,
    h('div', { class: 'row', style: { marginTop: '10px', justifyContent: 'flex-end' } },
      h('span', { class: 'tiny muted' }, '수업 시연용 — '), code,
      h('button', { class: 'btn small', onClick: () => {
        // 코드 원문은 앱에 없다 — 넣은 글자의 지문(해시)이 맞는지만 본다 (대소문자는 가리지 않는다)
        if (!teacherCodeOk(code.value)) { toast('코드가 맞지 않아요', 'bad'); return; }
        S.unlock = true; save(); closeModal(); toast('🔓 모든 탭을 열었어요 (「내 기록 지우기」 를 누르면 다시 잠겨요)', 'good'); app.refreshNav();
      } }, '🔓 모두 열기')));
  modal('🔒 아직 열 수 없어요', body, { ok: null, cancel: '닫기' });
}

const { holder, stage } = createStage();
document.body.append(holder);
const app = createShell(stage, {
  tabs: TABS, screens: SCREENS,
  logo: ['📦 패키지 공작소', h('small', {}, '모듈 · 패키지 · 라이브러리')],
  // 화면 곳곳의 「교과서 ○쪽」 이 어느 교과서인지 — 모든 화면 알약 줄 오른쪽에 (2026-11-05 사용자 지시)
  gate: (tabId) => blockers(tabId, S),
  onBlocked: showBlocked,
  tools: () => [
    h('button', { class: 'save-btn', title: '바탕 화면에 「학번_이름_패키지 공작소.html」 로 저장합니다', onClick: openSaveDialog }, '💾 지금까지 한 활동 HTML 로 저장'),
    h('button', { class: 'reset-btn', title: '이 브라우저에 남은 기록(퀴즈 답·만든 코드)을 모두 지웁니다', onClick: async () => {
      if (!(await modal('내 기록 지우기', '이 컴퓨터에 남은 퀴즈 답·미션·만든 코드를 모두 지울까요? 탭도 다시 잠겨요. (공용 컴퓨터라면 수업이 끝날 때 눌러 주세요)', { ok: '모두 지우기', cancel: '그만두기' }))) return;
      resetAll();
      toast('기록을 모두 지웠어요');
      setTimeout(() => { location.hash = ''; location.reload(); }, 600);
    } }, '🧹 기록 지우기'),
  ],
});
