/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  빌드 결과 점검 — `npm run build` 가 마지막에 부른다.
 *  ① dist/index.html 한 파일로 나왔나 ② 크기 ③ 저작권 표시(HTML 주석 · /*! 배너 · 화면 푸터)
 *  ④ 바깥 자원 — 글꼴 두 곳(jsDelivr) 말고는 없어야 한다 (인터넷 없는 교실에서도 열리게)
 *  ⑤ 💾 이어 하기 파일 — 앱 스크립트가 중간에 끊기지 않는가, 활동을 심었다 꺼내면 그대로인가 (2026-11-23)
 */
import { readFileSync, statSync } from 'node:fs';
import { embedState, extractState, stripState, APP_ID, SAVED_ID } from '../src/lib/savefile.js';

const bad = [];
const path = 'dist/index.html';
let html = '';
try { html = readFileSync(path, 'utf-8'); } catch (e) { console.error(`  ❌ ${path} 가 없습니다`); process.exit(1); }
const size = statSync(path).size;
if (size < 100_000) bad.push(`크기가 너무 작다 (${size}바이트) — 개발용 껍데기가 나온 것 아닌가?`);
const marks = (html.match(/티쳐무/g) || []).length;
if (!html.includes('<!--') || !/<!--[\s\S]*?티쳐무[\s\S]*?-->/.test(html)) bad.push('HTML 주석에 저작권 표시가 없다');
// ⚠ 배너는 둘째 줄까지 함께 본다 — 첫 줄은 CSS·HTML 머리 주석과 겹쳐, Vite 8 이 스크립트 배너를 지워도 통과했다(2026-11-09 postBanner 로 고침)
const banner = "/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유\n * 학교 수업 목적으로만 이용해 주세요. 무단 배포·상업적 이용을 금합니다. */";
if (!html.includes(banner)) bad.push('스크립트 /*! 배너가 지워졌다 — vite.config.js 의 output.postBanner 를 볼 것(Vite 8 은 banner 를 압축에서 지운다)');
if (!html.includes('© 2026 티쳐무 · 모든 권리 보유')) bad.push('화면 푸터 문구가 없다');
const urls = [...html.matchAll(/(?:src|href)=["'](https?:[^"']+)["']/g)].map((m) => m[1]);
const allowed = ['https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/', 'https://cdn.jsdelivr.net/npm/d2coding@1.3.2/', 'https://cdn.jsdelivr.net'];
const foreign = urls.filter((u) => !allowed.some((a) => u.startsWith(a)));
if (foreign.length) bad.push(`글꼴 말고 바깥 자원이 있다: ${foreign.join(', ')}`);
if (/<script[^>]+src=/.test(html)) bad.push('스크립트가 한 파일에 들어가지 않았다 (src= 로 따로 부른다)');
// ⑤ 💾 저장 파일 = 이 파일 + 심은 활동. 앱 스크립트 안에 「</script」 가 있으면 저장 파일도 이 파일도 그 자리에서 끊긴다
const closes = (html.match(/<\/script/gi) || []).length;
if (closes !== 1) bad.push(`「</script」 가 ${closes}번 있다 — 앱 스크립트 하나의 끝 한 번이어야 한다`);
if (html.includes(`id="${SAVED_ID}"`)) bad.push('빌드본에 활동이 심겨 있다 — 처음 받는 앱은 비어 있어야 한다');
const state = { why: { copy: true }, exam: { project: { files: { 'start.py': 'print("</script>")' } } }, _at: 1 };
const saved = embedState(html, { app: APP_ID, v: 1, who: { id: '20101', name: '홍길동' }, savedAt: '', state });
const back = extractState(saved);
if (!back || JSON.stringify(back.state) !== JSON.stringify(state)) bad.push('활동을 심었다 꺼내면 같지 않다');
if (stripState(saved) !== html) bad.push('심은 활동을 걷어 내도 원래 앱과 같지 않다');
if ((saved.match(/<\/script/gi) || []).length !== 2) bad.push('활동을 심은 파일의 「</script」 가 둘(심은 칸 · 앱 끝)이 아니다');
if (saved.indexOf(`id="${SAVED_ID}"`) > saved.search(/<script type="module"/)) bad.push('심은 활동이 앱 스크립트보다 뒤에 있다 — 앱이 시작할 때 읽지 못한다');

if (bad.length) {
  console.log(`\n  ❌ 빌드 결과 점검 — ${bad.length}가지 문제`);
  for (const b of bad) console.log('    · ' + b);
  process.exit(1);
}
console.log(`\n  ✅ 빌드 결과 점검 통과 — dist/index.html ${size.toLocaleString()}바이트 · 「티쳐무」 ${marks}곳 · 바깥 자원은 글꼴뿐 · 💾 활동 심기·꺼내기 그대로\n`);
