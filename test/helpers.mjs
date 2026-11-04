/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  시험에서 쓰는 도우미 — 화면 파일(DOM)은 부를 수 없으므로 판정 규칙만 따로 둔다.
 *  ⚠ src/screens/imports.js 의 fixPassed 와 똑같아야 한다 (시험이 글자를 대조한다).
 */
export function fixPassedForTest(fx, r, p) {
  if (!r || !r.ok || r.entry !== 'main.py') return false;
  if (r.stdout.trim() !== fx.goal) return false;
  if (fx.mustRoot && p.files[fx.mustRoot] === undefined) return false;
  return r.calls.some((c) => c.name === fx.need.name && (!fx.need.file || c.file === fx.need.file));
}
