/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  선생님 시연용 코드를 바꿀 때 — 새 코드의 해시를 만들어 준다.
 *
 *    node tools/hash-code.mjs 새코드
 *
 *  나온 줄을 src/lib/progress.js 의 TEACHER_HASH 에 붙여 넣는다.
 *  ⚠ 코드 원문은 저장소 어디에도 적지 않는다(README·주석·커밋 메시지 포함). 깃허브는 공개 저장소다.
 */
import { teacherHash } from '../src/lib/progress.js';

const code = process.argv[2];
if (!code) { console.log('쓰는 법: node tools/hash-code.mjs 새코드'); process.exit(1); }
console.log(`export const TEACHER_HASH = '${teacherHash(code)}';`);
