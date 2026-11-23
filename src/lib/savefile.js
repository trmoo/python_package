/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  💾 이어 하기 파일 — 앱 HTML 그대로에 학생 활동(JSON)만 심어 파일째 저장한다 (2026-11-23 사용자 지시).
 *  다음 시간에 그 파일을 더블클릭하면 심어 둔 활동을 읽어 그대로 이어서 한다.
 *  (regression-lab · ds_performance/offline-exam 과 같은 방식)
 *
 *  ⚠ 예전(2026-11-05~)에는 활동을 「보고서 HTML」 로 저장했는데, 그 파일은 앱이 아니라서 열어도 이어서 할 수 없었다.
 *  ⚠ node 로 불러다 시험하므로 DOM 을 만지지 말 것. 이 파일은 글자만 다룬다(브라우저 쪽은 store.js · ui/save.js).
 *  ⚠ 심는 JSON 의 < 는 모두 \u003c 로 적는다 — 학생 코드에 닫는 script 태그가 들어 있어도 파일이 끊기지 않고,
 *    그래서 심은 칸 안에는 < 가 한 글자도 없다(아래 STATE_RE 가 이것을 믿고 칸을 찾는다).
 *  ⚠ 닫는 script 태그(「<」 와 「/script」 를 붙인 글자)를 src 어디에도 그대로 적지 말 것 — 주석에도.
 *    빌드하면 앱 코드가 HTML 의 script 안에 들어가므로, 그 글자가 앱 스크립트를 중간에서 끊는다.
 *    그래서 < 는 String.fromCharCode(60) 으로 만든다(tools/check-syntax.mjs ⑧ 이 막는다).
 */
export const ACTIVITY_NAME = '패키지 공작소';
export const APP_ID = 'pkgws';   // 심은 활동이 이 앱 것인지 가리는 표
export const SAVED_ID = 'saved-work';

const LT = String.fromCharCode(60);  // '<'
const BS = String.fromCharCode(92);  // '\'

/** 파일 이름에 쓸 수 없는 글자를 걷어 낸다 (윈도우: \ / : * ? " < > |) */
export const safeName = (s) => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim();
/** 학번_이름_패키지 공작소.html */
export const saveFileName = (id, name) => safeName(`${id}_${name}_${ACTIVITY_NAME}.html`);

/** 이름 가리기 — 홍길동 → 홍*동 (파일을 연 사람에게 「본인 맞나요」 를 물을 때) */
export const maskName = (n) => {
  const s = String(n || '');
  return s.length <= 1 ? s : s.length === 2 ? `${s[0]}*` : `${s[0]}${'*'.repeat(s.length - 2)}${s[s.length - 1]}`;
};

/** 활동을 JSON 글자로 — < 와 줄 구분 문자(U+2028·2029)를 이스케이프한다 */
export function packData(data) {
  return JSON.stringify(data)
    .split(LT).join(`${BS}u003c`)
    .split(String.fromCharCode(0x2028)).join(`${BS}u2028`)
    .split(String.fromCharCode(0x2029)).join(`${BS}u2029`);
}

const OPEN = `${LT}script id="${SAVED_ID}" type="application/json">`;
const CLOSE = `${LT}/script>`;
// 심은 칸 하나 — 안에 < 가 없으므로 [^<]* 로 끝까지 정확히 잡힌다 (앱 코드 속 'saved-work' 글자에는 걸리지 않는다)
// (OPEN · CLOSE 에는 정규식에서 뜻을 갖는 글자가 없어 그대로 이어 붙인다)
const STATE_RE = new RegExp(`\\n?${OPEN}([^${LT}]*)${CLOSE}`, 'g');

/** 이미 심어 둔 활동 칸을 걷어 낸다 */
export const stripState = (html) => String(html).replace(STATE_RE, '');

/**
 * 원본 앱에 활동을 심는다 — <meta charset> 바로 뒤에.
 * ⚠ <head> 바로 뒤(meta charset 앞)에 넣으면 안 된다 — 더블클릭(file://)으로 열 때 브라우저는
 *   문서 앞 1024바이트 안에서만 charset 을 찾는다. 활동이 길면 그 줄이 밀려나 한글이 깨진다.
 */
export function embedState(html, data) {
  const base = stripState(html);
  const block = `\n${OPEN}${packData(data)}${CLOSE}`; // 앞의 줄바꿈까지 한 덩이 — stripState 가 꼭 그만큼 걷어 낸다
  let at = base.search(/<meta charset[^>]*>/i);
  if (at < 0) at = base.search(/<head[^>]*>/i);
  if (at < 0) return block + base;
  const end = base.indexOf('>', at) + 1;
  return `${base.slice(0, end)}${block}${base.slice(end)}`;
}

/** 심은 칸의 글자를 읽어 활동으로 — 이 앱 것이 아니거나 깨졌으면 null */
export function readSaved(text) {
  try {
    const d = JSON.parse(String(text || '').trim());
    if (!d || d.app !== APP_ID || !d.state || typeof d.state !== 'object' || Array.isArray(d.state)) return null;
    const who = d.who && typeof d.who === 'object' ? d.who : {};
    return { ...d, who: { id: String(who.id ?? ''), name: String(who.name ?? '') } };
  } catch (e) {
    return null;
  }
}

/** HTML 글자에서 심은 활동을 꺼낸다 (시험·점검용 — 브라우저는 DOM 에서 읽는다) */
export function extractState(html) {
  const m = [...String(html).matchAll(STATE_RE)];
  return m.length ? readSaved(m[0][1]) : null;
}

/**
 * 이 탭의 임시 기억(sessionStorage)과 파일에 심은 활동 가운데 더 최근 것을 고른다.
 * 파일을 열어 더 하다가 저장하지 않고 새로 고쳤다면 탭 쪽이 더 최근이다. 같으면 탭 쪽(다시 묻지 않게).
 */
export function pickNewer(tab, file) {
  if (!file) return tab || null;
  if (!tab) return file;
  return (tab._at || 0) >= (file._at || 0) ? tab : file;
}
