/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  SHA-256 과 선생님 코드 — 원문이 저장소 어디에도 없어야 한다.
 *  ⚠ 이 시험 파일에도 코드 원문을 적지 말 것 (공개 저장소다).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { 묶음, 확인, 참 } from './harness.mjs';
import { sha256hex } from '../src/lib/sha256.js';
import { TEACHER_HASH, teacherCodeOk, teacherHash } from '../src/lib/progress.js';

묶음('SHA-256 — node 의 crypto 와 같은 지문');
for (const s of ['', 'abc', '패키지 공작소', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), '😀'.repeat(40)]) {
  확인(`「${s.slice(0, 12)}」 (${s.length}글자)`, sha256hex(s), createHash('sha256').update(s).digest('hex'));
}

묶음('선생님 코드는 해시로만');
확인('해시는 64글자 16진수', /^[0-9a-f]{64}$/.test(TEACHER_HASH), true);
참('틀린 코드는 열리지 않는다', !teacherCodeOk('1105') && !teacherCodeOk('') && !teacherCodeOk('0000'));
확인('앞뒤 빈칸·대소문자는 가리지 않는다 (같은 지문)', teacherHash('  AbC '), teacherHash('abc'));
{
  // 저장소에 올라가는 파일 어디에도 「해시와 맞는 원문」 이 문자열로 들어 있지 않은가 — 따옴표 안의 글자를 모두 맞춰 본다
  const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
  const files = [];
  const walk = (d) => { for (const n of readdirSync(d)) { if (['node_modules', 'dist', '.git', '.claude'].includes(n)) continue; const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|mjs|md|html|json|py|yml)$/.test(n) && n !== 'CLAUDE.md' && n !== 'golden.json') files.push(p); } };
  walk(root);
  const leaks = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf-8');
    const words = new Set(text.match(/[A-Za-z0-9가-힣_\-]{3,20}/g) || []);
    for (const w of words) if (teacherCodeOk(w)) leaks.push(`${f.slice(root.length)} — 「${w.slice(0, 2)}…」`);
  }
  확인(`올라가는 파일 ${files.length}개에 코드 원문이 없다`, leaks, []);
}
