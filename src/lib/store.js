/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  이 브라우저에만 남는 학습 기록 (localStorage).
 *  ⚠ 이름·학번 같은 개인정보는 한 글자도 담지 않는다. 퀴즈 답·미션 통과·만든 코드뿐이다.
 *  사생활 보호 창이나 막힌 저장소에서는 저장이 안 될 수 있다 — 그래도 앱은 그대로 돈다.
 */
const KEY = 'pkgws:v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
/* ── 옛 기록 옮기기 ──
 * 확인 문제 답은 문항 번호(0부터)로 저장된다. 2026-11-11 8문항 가운데 옛 3·6·8번을 빼서 번호가 당겨졌다.
 * 그대로 두면 옛 4번 답이 새 3번 답으로 읽혀 「틀림」 이 되고, 다 맞혔던 학생의 ③ 탭이 다시 잠긴다.
 * QUIZ_V 가 없는 옛 기록만 한 번 옮긴다. ⚠ 새로 만드는 확인 문제 칸에도 v: QUIZ_V 를 넣을 것(안 넣으면 새 답을 또 옮긴다). */
export const QUIZ_V = 2;
const QUIZ_MOVE = { 0: 0, 1: 1, 3: 2, 4: 3, 6: 4 }; // 옛 번호 → 새 번호 (빠진 2·5·7 은 버린다)
const QUIZ_CUR = [0, 1, 2, 2, 3, 4, 4, 4]; // 보던 문항이 빠졌으면 그다음 문항으로
export function migrate(st) {
  const q = st && st.quiz;
  if (q && typeof q === 'object' && q.v === undefined) {
    const ans = {};
    for (const [k, a] of Object.entries(q.ans || {})) if (QUIZ_MOVE[k] !== undefined) ans[QUIZ_MOVE[k]] = a;
    q.ans = ans;
    q.cur = QUIZ_CUR[q.cur] ?? 0;
    q.v = QUIZ_V;
  }
  return st;
}
// ⚠ 위의 표(const)들보다 아래에 둘 것 — 위에 두면 표가 만들어지기 전에 migrate 가 불려 멈춘다
export const S = migrate(load());

let timer = null;
/** 고친 것을 잠시 뒤에 한 번에 저장한다 (글자를 칠 때마다 저장하지 않게) */
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 저장이 막혀도 앱은 계속 */ }
  }, 300);
}
/** 화면마다 자기 칸 하나 */
export function slot(name, init) {
  if (S[name] === undefined) S[name] = typeof init === 'function' ? init() : init;
  return S[name];
}
export function setSlot(name, v) { S[name] = v; save(); }
/** 내 기록 모두 지우기 (공용 컴퓨터를 위해) */
export function resetAll() {
  for (const k of Object.keys(S)) delete S[k];
  try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
}
