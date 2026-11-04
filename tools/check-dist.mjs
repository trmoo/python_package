/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  빌드 결과 점검 — `npm run build` 가 마지막에 부른다.
 *  ① dist/index.html 한 파일로 나왔나 ② 크기 ③ 저작권 표시(HTML 주석 · /*! 배너 · 화면 푸터)
 *  ④ 바깥 자원 — 글꼴 두 곳(jsDelivr) 말고는 없어야 한다 (인터넷 없는 교실에서도 열리게)
 */
import { readFileSync, statSync } from 'node:fs';

const bad = [];
const path = 'dist/index.html';
let html = '';
try { html = readFileSync(path, 'utf-8'); } catch (e) { console.error(`  ❌ ${path} 가 없습니다`); process.exit(1); }
const size = statSync(path).size;
if (size < 100_000) bad.push(`크기가 너무 작다 (${size}바이트) — 개발용 껍데기가 나온 것 아닌가?`);
const marks = (html.match(/티쳐무/g) || []).length;
if (!html.includes('<!--') || !/<!--[\s\S]*?티쳐무[\s\S]*?-->/.test(html)) bad.push('HTML 주석에 저작권 표시가 없다');
if (!html.includes('/*! 📦 패키지 공작소 — © 2026 티쳐무')) bad.push('/*! 배너가 지워졌다 (esbuild.legalComments 를 확인할 것)');
if (!html.includes('© 2026 티쳐무 · 모든 권리 보유')) bad.push('화면 푸터 문구가 없다');
const urls = [...html.matchAll(/(?:src|href)=["'](https?:[^"']+)["']/g)].map((m) => m[1]);
const allowed = ['https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/', 'https://cdn.jsdelivr.net/npm/d2coding@1.3.2/', 'https://cdn.jsdelivr.net'];
const foreign = urls.filter((u) => !allowed.some((a) => u.startsWith(a)));
if (foreign.length) bad.push(`글꼴 말고 바깥 자원이 있다: ${foreign.join(', ')}`);
if (/<script[^>]+src=/.test(html)) bad.push('스크립트가 한 파일에 들어가지 않았다 (src= 로 따로 부른다)');

if (bad.length) {
  console.log(`\n  ❌ 빌드 결과 점검 — ${bad.length}가지 문제`);
  for (const b of bad) console.log('    · ' + b);
  process.exit(1);
}
console.log(`\n  ✅ 빌드 결과 점검 통과 — dist/index.html ${size.toLocaleString()}바이트 · 「티쳐무」 ${marks}곳 · 바깥 자원은 글꼴뿐\n`);
