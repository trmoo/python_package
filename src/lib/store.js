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
export const S = load();

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
