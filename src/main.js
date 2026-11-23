/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  학교 수업 목적으로만 이용해 주세요. 자세한 내용은 LICENSE 를 보세요.
 *
 *  탭 차례 = 수업 흐름
 *    ① 개념 잡기 → ② 불러오기(import) → ③ 패키지 만들기(가상 VS Code) → ④ 수행평가 준비
 *  어느 탭이든 바로 열린다 — 탭 잠금(2026-11-05)은 2026-11-23 사용자 지시로 없앴다. 알약의 ✔ 는 lib/progress.js 의 완료 조건.
 *  ★ 오른쪽 위 「💾 지금까지 한 활동 HTML 로 저장」 — 이 앱 파일에 활동을 심어 바탕 화면에 「학번_이름_패키지 공작소.html」.
 *    다음 시간에 그 파일을 열면 「본인 활동이 맞나요?」 를 묻고 이어서 한다 (ui/save.js · lib/store.js · lib/savefile.js).
 *  주소 해시로 화면을 바로 연다 — 예) #build/m2 (해시가 없으면 지난번에 보던 화면)
 */
import './style.css';
import { h, modal, toast } from './ui/dom.js';
import { createStage, createShell } from './ui/shell.js';
import { openSaveDialog, confirmOwner } from './ui/save.js';
import { S, save, resetAll, unsaved } from './lib/store.js';
import { isDone } from './lib/progress.js';
import { renderWhy, renderLayers, renderSort, renderAnatomy, renderWhere, renderPublish } from './screens/concept.js';
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
  { tab: 'concept', id: 'publish', title: '⭐ 내 꾸러미도 pip 로 나눠 주기', short: '⭐ 내 꾸러미도 pip 로', render: renderPublish },
  { tab: 'import', id: 'forms', title: 'import 세 가지 꼴', short: 'import 세 가지 꼴', render: renderForms },
  { tab: 'import', id: 'pkgforms', title: '패키지 속 모듈 부르기', short: '패키지 속 모듈', render: renderPkgForms },
  { tab: 'import', id: 'fix', title: '오류 고치기', short: '오류 고치기', render: renderFix },
  { tab: 'import', id: 'quiz', title: '확인 문제', short: '확인 문제', render: renderQuiz },
  ...MISSIONS.map((m) => ({ tab: 'build', id: m.id, title: m.title, short: m.short, render: renderMission(m.id) })),
  { tab: 'assess', id: 'question', title: '수행평가 문항', short: '수행평가 문항', render: renderQuestion },
  { tab: 'assess', id: 'practice', title: '연습 과제 · 조건 점검기', short: '연습 과제', render: renderPractice },
  { tab: 'assess', id: 'idle', title: 'IDLE 에서 만들고 제출하기', short: 'IDLE 에서', render: renderIDLE },
].map((s) => ({ ...s, done: () => isDone(`${s.tab}/${s.id}`, S) }));

// 해시가 없으면 지난번에 보던 화면으로 (💾 저장한 파일을 열었을 때 이어서 하기 좋게)
if (!location.hash && S._screen && SCREENS.some((x) => `${x.tab}/${x.id}` === S._screen)) history.replaceState(null, '', `#${S._screen}`);

// 💾 저장한 파일로 이어 하는 중인데 저장하지 않고 창을 닫으려 하면 한 번 묻는다(브라우저 기본 물음)
let leaving = false;
window.addEventListener('beforeunload', (e) => { if (!leaving && unsaved()) { e.preventDefault(); e.returnValue = ''; } });
/** 기록을 비우고 처음부터 — 새로 고칠 때 「저장하지 않았다」 고 묻지 않게 */
const restart = () => { leaving = true; location.hash = ''; location.reload(); };

const { holder, stage } = createStage();
document.body.append(holder);
createShell(stage, {
  tabs: TABS, screens: SCREENS,
  logo: ['📦 패키지 공작소', h('small', {}, '모듈 · 패키지 · 라이브러리')],
  onShow: (key) => { if (S._screen !== key) { S._screen = key; save({ quiet: true }); } },
  tools: () => [
    h('button', { class: 'save-btn', title: '이 앱을 지금까지 한 활동과 함께 바탕 화면에 「학번_이름_패키지 공작소.html」 로 저장합니다 — 다음 시간에 그 파일을 열면 이어서 해요', onClick: openSaveDialog }, '💾 지금까지 한 활동 HTML 로 저장'),
    h('button', { class: 'reset-btn', title: '이 브라우저에 남은 기록(퀴즈 답·만든 코드)을 모두 지웁니다', onClick: async () => {
      if (!(await modal('내 기록 지우기', '이 컴퓨터에 남은 퀴즈 답·미션·만든 코드를 모두 지울까요? (공용 컴퓨터라면 수업이 끝날 때 눌러 주세요. 💾 저장해 둔 파일은 지워지지 않아요)', { ok: '모두 지우기', cancel: '그만두기' }))) return;
      resetAll();
      toast('기록을 모두 지웠어요');
      setTimeout(restart, 600);
    } }, '🧹 기록 지우기'),
  ],
});

// 💾 저장한 파일을 열었으면 — 본인 것이 맞는지 묻고, 아니면 처음부터
confirmOwner().then((r) => { if (r === 'reset') restart(); });
