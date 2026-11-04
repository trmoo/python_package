/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  학교 수업 목적으로만 이용해 주세요. 자세한 내용은 LICENSE 를 보세요.
 *
 *  탭 차례 = 수업 흐름
 *    ① 개념 잡기 → ② 불러오기(import) → ③ 패키지 만들기(가상 VS Code) → ④ 수행평가 준비
 *  주소 해시로 화면을 바로 연다 — 예) #build/m2 · #assess/practice
 */
import './style.css';
import { h, modal, toast } from './ui/dom.js';
import { createStage, createShell } from './ui/shell.js';
import { resetAll } from './lib/store.js';
import { renderWhy, renderLayers, renderSort, sortDone, renderAnatomy, anatomyDone, renderWhere } from './screens/concept.js';
import { renderForms, formsDone, renderPkgForms, pkgFormsDone, renderFix, fixDone, renderQuiz, quizDone } from './screens/imports.js';
import { renderMission, missionDone } from './screens/build.js';
import { renderRubric, renderPractice, practiceDone, renderVSCode } from './screens/assess.js';
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
  { tab: 'concept', id: 'sort', title: '분류해 보기', short: '분류해 보기', render: renderSort, done: sortDone },
  { tab: 'concept', id: 'anatomy', title: 'import 문 읽기', short: 'import 문 읽기', render: renderAnatomy, done: anatomyDone },
  { tab: 'concept', id: 'where', title: '모듈은 어디서 올까? (pip)', short: '어디서 올까 · pip', render: renderWhere },
  { tab: 'import', id: 'forms', title: 'import 세 가지 꼴', short: 'import 세 가지 꼴', render: renderForms, done: formsDone },
  { tab: 'import', id: 'pkgforms', title: '패키지 속 모듈 부르기', short: '패키지 속 모듈', render: renderPkgForms, done: pkgFormsDone },
  { tab: 'import', id: 'fix', title: '오류 고치기', short: '오류 고치기', render: renderFix, done: fixDone },
  { tab: 'import', id: 'quiz', title: '확인 문제', short: '확인 문제', render: renderQuiz, done: quizDone },
  ...MISSIONS.map((m) => ({ tab: 'build', id: m.id, title: m.title, short: m.short, render: renderMission(m.id), done: () => missionDone(m.id) })),
  { tab: 'assess', id: 'rubric', title: '평가 기준과 조건', short: '평가 기준과 조건', render: renderRubric },
  { tab: 'assess', id: 'practice', title: '연습 과제 · 조건 점검기', short: '연습 과제', render: renderPractice, done: practiceDone },
  { tab: 'assess', id: 'vscode', title: '내 컴퓨터(VS Code)에서 만들기', short: 'VS Code 에서', render: renderVSCode },
];

const { holder, stage } = createStage();
document.body.append(holder);
createShell(stage, {
  tabs: TABS, screens: SCREENS,
  logo: ['📦 패키지 공작소', h('small', {}, '모듈 · 패키지 · 라이브러리')],
  tools: () => h('button', { class: 'reset-btn', title: '이 브라우저에 남은 기록(퀴즈 답·만든 코드)을 모두 지웁니다', onClick: async () => {
    if (!(await modal('내 기록 지우기', '이 컴퓨터에 남은 퀴즈 답·미션·만든 코드를 모두 지울까요? (공용 컴퓨터라면 수업이 끝날 때 눌러 주세요)', { ok: '모두 지우기', cancel: '그만두기' }))) return;
    resetAll();
    toast('기록을 모두 지웠어요');
    setTimeout(() => location.reload(), 600);
  } }, '🧹 내 기록 지우기'),
});
