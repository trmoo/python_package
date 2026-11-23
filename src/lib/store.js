/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  학습 기록 — 퀴즈 답·미션 통과·만든 코드. ⚠ 이름·학번 같은 개인정보는 여기에 담지 않는다.
 *
 *  기록이 남는 곳은 둘이다 (2026-11-23 「💾 저장」 을 이어 하기 파일로 바꾸며 갈랐다)
 *   ① 처음 받은 앱(깃허브 주소 · dist/index.html) — 이 브라우저의 localStorage. 예전 그대로.
 *   ② 💾 저장한 파일(활동이 심긴 앱) — 파일에 심은 활동을 읽어 이어 하고, 그 탭에서 하는 동안은 sessionStorage 에 둔다.
 *      localStorage 를 쓰지 않는 까닭: 컴퓨터실 PC 의 file:// 저장소에는 앞 학생의 기록이 남아 있을 수 있어,
 *      내 파일을 열었는데 남의 기록이 뜨면 안 된다. 다음 시간에는 파일에 심은 활동이 곧 내 기록이다.
 *  사생활 보호 창이나 막힌 저장소에서는 저장이 안 될 수 있다 — 그래도 앱은 그대로 돈다.
 *
 *  S 안의 밑줄 이름은 화면 기록이 아니라 살림살이다 — _at(마지막으로 고친 때, 밀리초) · _screen(보던 화면) ·
 *  _file(이 탭의 기록이 파일에 심긴 활동을 이어 쓴 것인가).
 */
import { SAVED_ID, readSaved, pickNewer } from './savefile.js';

const KEY = 'pkgws:v1';

/** 이 파일에 심어 둔 활동 — 처음 받은 앱이면 null */
function readEmbedded() {
  try {
    if (typeof document === 'undefined') return null;
    const el = document.getElementById(SAVED_ID);
    return el ? readSaved(el.textContent) : null;
  } catch (e) { return null; }
}
export const EMBEDDED = readEmbedded();
/** 💾 저장한 파일을 열었나 */
export const FILE_MODE = !!EMBEDDED;
// 열린 파일마다 따로 — 한 탭에서 다른 학생 파일을 열어도 섞이지 않게
const fileName = typeof location === 'undefined' ? '' : decodeURIComponent(location.pathname.split('/').pop() || '');
const SKEY = `pkgws:file:${fileName}`;

function load() {
  if (FILE_MODE) {
    let tab = null;
    try { tab = JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch (e) { /* 막혀 있어도 파일 것으로 */ }
    const chosen = pickNewer(tab, EMBEDDED.state);
    if (chosen === tab) return { st: tab, from: 'session' };
    return { st: { ...EMBEDDED.state, _file: true }, from: 'file' };
  }
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { st: JSON.parse(raw), from: 'local' } : { st: {}, from: null };
  } catch (e) { return { st: {}, from: null }; }
}
/* ── 옛 기록 옮기기 ──
 * 확인 문제 답은 문항 번호(0부터)로 저장된다. 2026-11-11 8문항 가운데 옛 3·6·8번을 빼서 번호가 당겨졌다.
 * 그대로 두면 옛 4번 답이 새 3번 답으로 읽혀, 다 맞혔던 확인 문제가 「틀림」 이 된다.
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
  if (st && typeof st === 'object') delete st.unlock; // 탭 잠금은 2026-11-23 에 없앴다 — 옛 「선생님 코드로 열기」 표시
  return st;
}
// ⚠ 위의 표(const)들보다 아래에 둘 것 — 위에 두면 표가 만들어지기 전에 migrate 가 불려 멈춘다
const first = load();
export const S = migrate(first.st);
/** 'file' — 💾 저장한 파일에서 불러옴 · 'session' — 그 파일을 이 탭에서 하던 것 · 'local' — 이 브라우저에 남은 것 · null — 새로 시작 */
export const LOADED_FROM = first.from;

// 💾 저장한 파일을 막 열었을 때는 「본인 활동이 맞나요?」 에 답할 때까지 이 탭에 남기지 않는다 —
// 먼저 남겨 두면, 답하지 않고 새로 고쳤을 때 다시 묻지 않고 남의 활동이 그대로 열린다.
let hold = LOADED_FROM === 'file';
/** 「네, 내 활동이에요」 — 이제부터 이 탭에 남긴다 */
export function confirmLoaded() { hold = false; saveNow(); }

/** 지금 기록을 바로 남긴다 */
function persist() {
  if (hold) return;
  try {
    if (FILE_MODE) sessionStorage.setItem(SKEY, JSON.stringify(S));
    else localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) { /* 저장이 막혀도 앱은 계속 */ }
}
let timer = null;
/** 고친 것을 잠시 뒤에 한 번에 저장한다 (글자를 칠 때마다 저장하지 않게).
 *  { quiet: true } — 보던 화면을 옮긴 것처럼 「활동을 고친 것」 이 아닌 변화(저장하지 않았다고 묻지 않게) */
export function save({ quiet = false } = {}) {
  if (!quiet) S._at = Date.now();
  clearTimeout(timer);
  timer = setTimeout(persist, 300);
}
/** 기다리지 않고 지금 남긴다 (새로 고치기 직전 등) */
export function saveNow() { clearTimeout(timer); persist(); }
/** 화면마다 자기 칸 하나 */
export function slot(name, init) {
  if (S[name] === undefined) S[name] = typeof init === 'function' ? init() : init;
  return S[name];
}
export function setSlot(name, v) { S[name] = v; save(); }
/** 내 기록 모두 지우기 (공용 컴퓨터를 위해 · 저장한 파일을 열었는데 내 것이 아닐 때).
 *  💾 저장한 파일은 그대로다 — 다시 저장하기 전까지는.
 *  파일 모드에서는 빈 기록을 「지금」 고친 것으로 남겨 둔다 — 그래야 새로 고쳐도 파일의 활동이 다시 살아나지 않는다. */
export function resetAll() {
  clearTimeout(timer);
  for (const k of Object.keys(S)) delete S[k];
  hold = false;
  if (FILE_MODE) { S._at = Date.now(); persist(); return; }
  try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
}

/* ── 파일로 저장한 때 ──
 * 마지막으로 💾 저장한 뒤 활동을 고쳤으면 창을 닫을 때 한 번 묻는다(파일 모드에서 저장 없이 닫으면 그 시간 활동이 사라진다). */
let savedAt = FILE_MODE ? (EMBEDDED.state._at || 0) : 0;
let savedOnce = FILE_MODE;
/** 💾 파일에 저장했다 */
export function markSaved() { savedAt = S._at || 0; savedOnce = true; saveNow(); }
/** 파일로 이어 하는 중인데(또는 이 탭에서 한 번 저장했는데) 그 뒤에 고친 것이 있나 */
export const unsaved = () => savedOnce && (S._at || 0) > savedAt;
