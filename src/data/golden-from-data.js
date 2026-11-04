/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  화면에 실린 코드(예제·예측 표·오류 고치기·미션 모범 답안·확인 문제)를 모두 「진짜 파이썬 대조 사례」 로 꺼낸다.
 *  test/golden-cases.mjs 가 부른다. 화면 자료를 고치면 `npm run golden` 을 다시 돌릴 것.
 */
import { WHY } from './concept.js';
import { FORMS, PKGFORMS, FIXES, QUIZ } from './imports.js';
import { MISSIONS } from './missions.js';

export function goldenFromData() {
  const out = [];
  const add = (name, files, entry = 'main.py') => out.push({ name, files, dirs: [], entry });
  // ① 왜 나눌까 — 복사본 / 모듈
  for (const fn of [WHY.buggy, WHY.fixed]) {
    const tag = fn === WHY.buggy ? '버그' : '고침';
    add(`왜 나눌까 · 복사 · ${tag} · 내 것`, { 'main.py': `${fn}\n\nprint(${WHY.mine.call})` });
    add(`왜 나눌까 · 복사 · ${tag} · 친구`, { 'main.py': `${fn}\n\nprint(${WHY.friend.call})` });
    add(`왜 나눌까 · 모듈 · ${tag} · 내 것`, { 'main.py': `import score\n\nprint(score.${WHY.mine.call})`, 'score.py': fn + '\n' });
    add(`왜 나눌까 · 모듈 · ${tag} · 친구`, { 'main.py': `import score\n\nprint(score.${WHY.friend.call})`, 'score.py': fn + '\n' });
  }
  // ② 예측 표
  for (const [label, data] of [['꼴', FORMS], ['패키지 꼴', PKGFORMS]]) {
    data.rows.forEach((r, i) => data.cols.forEach((c, j) => add(`예측 표 ${label} ${i + 1}-${j + 1}`, { ...data.files, 'main.py': `${r}\n${c}\n` })));
  }
  // ② 오류 고치기 — 처음 모습(오류) · 고친 모습
  for (const f of FIXES) {
    add(`오류 고치기 ${f.id} · 처음`, f.project.files, f.active || 'main.py');
    add(`오류 고치기 ${f.id} · 고침`, f.fixed.files, 'main.py');
  }
  // ③ 미션 모범 답안
  for (const m of MISSIONS) {
    add(`미션 ${m.id} · 시작`, m.start.files, 'main.py');
    add(`미션 ${m.id} · 답`, m.answer.files, 'main.py');
  }
  add('미션 m4 · greet.py 직접 실행', MISSIONS.find((m) => m.id === 'm4').answer.files, 'mytools/greet.py');
  // ② 확인 문제 — 실행 결과 고르기
  QUIZ.forEach((q, i) => { if (q.files) add(`확인 문제 ${i + 1}`, q.files); });
  return out;
}
