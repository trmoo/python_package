/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  📝 개념 정리 빈칸 — 문장 읽기 · 채점 · 힌트 · 집계 (2026-11-10 사용자 지시
 *  「중간 중간 핵심 개념이나 중요한 내용은 빈칸을 넣어서 학생들이 개념을 정리할 수 있게」).
 *
 *  문장 꼴: 보통 글자 · `코드` · {{정답|다른 정답|…}}  — 맨 앞 정답이 힌트와 칸 너비의 기준이다.
 *  기록: S.blanks['문장id#몇째 칸'] = 학생이 친 글자. 정답 여부는 언제나 그 자리에서 다시 셈한다.
 *  ⚠ node 로 불러다 시험하므로 DOM 을 만지지 말 것.
 */
import { BLANKS } from '../data/blanks.js';

/** 문장 → 조각 [{ t:'text'|'code'|'blank', v, answers?, k? }] */
export function parseLine(text) {
  const out = [];
  const re = /\{\{(.+?)\}\}|`([^`]+)`/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      const answers = m[1].split('|').map((a) => a.trim()).filter(Boolean);
      out.push({ t: 'blank', v: answers[0], answers, k: k++ });
    } else out.push({ t: 'code', v: m[2] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

/** 견주기 전에 다듬는다 — 빈칸·따옴표·끝 마침표를 걷는다. keepCase 가 아니면 대소문자를 가리지 않는다 */
export function norm(s, keepCase = false) {
  const t = String(s ?? '').normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[「」『』"'`“”‘’]/g, '')
    .replace(/[.。]+$/, '');
  return keepCase ? t : t.toLowerCase();
}
/** 맨 앞 정답이 코드(영문·기호뿐)면 대소문자까지 맞아야 한다 — 파이썬은 Print( ) 를 모른다 (2026-11-10 미리보기에서 발견) */
export const isCode = (ans) => /^[\x20-\x7e]+$/.test(ans);
export function isRight(answers, v) {
  const keep = isCode(answers[0]);
  return norm(v) !== '' && answers.some((a) => norm(a, keep) === norm(v, keep));
}

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
/**
 * 힌트 — 1단계: 글자 수(○), 2단계: 한글은 첫소리, 영문·숫자는 낱말의 첫 글자(나머지는 •). 기호는 그대로 보인다.
 * 예) 재사용 → ○○○ → ㅈㅅㅇ   ·   __init__.py → ○○○○○○○○○○○ → __i•••__.p•
 */
export function hintOf(ans, level) {
  if (!level) return '';
  if (level === 1) return [...ans].map((c) => (/\s/.test(c) ? ' ' : '○')).join('');
  let out = '', inWord = false;
  for (const c of ans) {
    if (/[가-힣]/.test(c)) { out += CHO[Math.floor((c.charCodeAt(0) - 0xac00) / 588)]; inWord = false; }
    else if (/[A-Za-z0-9]/.test(c)) { out += inWord ? '•' : c; inWord = true; }
    else { out += c; inWord = false; }
  }
  return out;
}

/** 빈칸 하나의 기록 열쇠 */
export const blankKey = (lineId, k) => `${lineId}#${k}`;

/** 화면 열쇠('탭/화면') → 그 화면의 빈칸 묶음 */
export const groupOf = (screen) => BLANKS.find((g) => g.screen === screen) || null;
/** 문장 id → 문장 */
export function lineById(id) {
  for (const g of BLANKS) { const l = g.lines.find((x) => x.id === id); if (l) return l; }
  return null;
}
/** 문장 하나의 빈칸들 [{ key, answers }] */
export const blanksOfLine = (line) => parseLine(line.text).filter((p) => p.t === 'blank').map((p) => ({ key: blankKey(line.id, p.k), answers: p.answers }));

/** 맞힌 칸 / 모든 칸 — screen 을 주면 그 화면만, 안 주면 앱 전체 */
export function blankStats(S, screen) {
  const rec = (S && S.blanks) || {};
  const groups = screen ? BLANKS.filter((g) => g.screen === screen) : BLANKS;
  let right = 0, total = 0;
  for (const g of groups) for (const l of g.lines) for (const b of blanksOfLine(l)) {
    total++;
    if (isRight(b.answers, rec[b.key])) right++;
  }
  return { right, total };
}

/** 빈칸에 맨 앞 정답을 넣어 이은 문장 (시험·자료 대조용) */
export const filledText = (line) => parseLine(line.text).map((p) => p.v).join('');
