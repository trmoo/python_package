/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  소스 전수 검사 — `npm run check:syntax`
 *
 *  ⚠ 이것이 왜 필요한가 —
 *    `npm test` 는 화면 파일(src/screens · src/ui — DOM 을 만지는 곳)을 부르지 않는다.
 *    그래서 화면 파일에 괄호 하나가 빠져도 시험은 멀쩡히 통과하고 빌드에서야 터진다
 *    (실제로 import/forms 화면에서 괄호 하나가 남아 한 번 겪었다).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const bad = [];
const collect = (dir, acc = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collect(p, acc);
    else if (/\.(js|mjs)$/.test(name)) acc.push(p);
  }
  return acc;
};
const files = [...collect(join(ROOT, 'src')), ...collect(join(ROOT, 'test')), ...collect(join(ROOT, 'tools')), join(ROOT, 'vite.config.js')];
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
console.log(`\n  소스 ${files.length}개를 검사합니다.\n`);

for (const p of files) {
  const name = relative(ROOT, p).replace(/\\/g, '/');
  const src = readFileSync(p, 'utf-8');
  // ① 문법 — .js 는 ES 모듈이므로 모듈로 검사한다
  try {
    execFileSync(process.execPath, ['--input-type=module', '--check'], { input: src, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    bad.push(`${name} — 문법 오류\n      ${String(e.stderr || e).split('\n').slice(0, 5).join('\n      ')}`);
    continue;
  }
  // ② 저작권 머리 주석
  if (!src.startsWith('/*!')) bad.push(`${name} — 머리에 /*! 저작권 주석이 없다`);
  if (!src.slice(0, 300).includes('티쳐무')) bad.push(`${name} — 머리 주석에 「티쳐무」 가 없다`);
  // ③ 원문자는 자바스크립트 이름이 될 수 없다
  const circled = src.match(/(?:function|const|let|var)\s+[^\s(=]*[①-⓿][^\s(=]*/);
  if (circled) bad.push(`${name} — 이름에 원문자를 썼다: ${circled[0]}`);

  if (name.startsWith('src/')) {
    // ④ 브라우저 기본 대화상자 — 크롬이 주소를 함께 보여 준다. ui/dom.js 의 modal( ) 을 쓴다
    if (/(^|[^.\w])(alert|confirm|prompt)\s*\(/m.test(noComments(src))) bad.push(`${name} — alert·confirm·prompt 를 썼다`);
    // ⑤ 바깥 주소 — 인터넷 없는 교실에서 깨진다
    const urls = (src.match(/https?:\/\/[^\s'"`)<>]+/g) || []);
    if (urls.length) bad.push(`${name} — 바깥 주소가 있다: ${urls.join(', ')}`);
    // ⑧ 「</script」·「<!--」 — 빌드하면 앱 코드가 HTML 의 <script> 안에 들어가, 그 글자가 앱을 중간에서 끊거나
    //    (<!-- 다음에 <script 가 오면) 끝을 못 찾게 한다. /*! 주석은 빌드본에 남을 수 있어 주석까지 본다.
    //    (💾 저장 파일에 활동을 심을 때 쓰는 태그는 lib/savefile.js 가 < 를 String.fromCharCode(60) 으로 만든다)
    if (/<\/script/i.test(src)) bad.push(`${name} — 「</script」 글자가 있다(주석 포함) — 빌드본의 앱 스크립트를 끊는다`);
    if (/<!--/.test(src)) bad.push(`${name} — 「<!--」 글자가 있다(주석 포함) — 빌드본의 앱 스크립트 끝을 흐린다`);
  }
  if (name.startsWith('src/screens/')) {
    // ⑥ 화면 수명 — 화면을 오가도 쌓이지 않게 ui/dom.js 를 거친다
    if (/window\.addEventListener\(/.test(src)) bad.push(`${name} — window 에 직접 리스너를 걸었다. onWindow( ) 를 쓸 것`);
    if (/(^|[^.\w])setInterval\(/m.test(src)) bad.push(`${name} — setInterval 을 직접 썼다. screenInterval( ) 을 쓸 것`);
    if (/\.replaceChildren\(/.test(src)) bad.push(`${name} — replaceChildren 을 직접 썼다. fill( ) 을 쓸 것`);
  }
  if (name.startsWith('src/data/') || name.startsWith('src/lib/')) {
    // ⑦ node 로 불러다 시험하는 파일 — DOM 을 만지면 시험이 죽는다 (store·zip 은 브라우저 전용이라 뺀다)
    if (!/store\.js$|zip\.js$/.test(name) && /document\.|window\./.test(noComments(src))) bad.push(`${name} — 시험이 node 로 부르는 파일인데 DOM 을 만진다`);
  }
}

if (bad.length) {
  console.log(`  ❌ ${bad.length}가지 문제\n`);
  for (const b of bad) console.log('    ' + b + '\n');
  process.exit(1);
}
console.log('  ✅ 문법 · 저작권 · 원문자 · 기본 대화상자 · 바깥 주소 · script 태그 글자 · 화면 수명 · DOM 규칙 모두 통과\n');
