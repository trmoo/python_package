/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  💾 이어 하기 파일 (2026-11-23) — 앱 HTML 에 활동을 심고, 다시 꺼내고, 탭 기억과 견주어 고른다.
 *  (브라우저에서 저장 → 다시 열기까지는 빌드본으로 따로 확인한다. 빌드본 점검은 tools/check-dist.mjs)
 */
import { readFileSync } from 'node:fs';
import { 묶음, 확인, 참 } from './harness.mjs';
import { ACTIVITY_NAME, APP_ID, SAVED_ID, safeName, saveFileName, maskName, packData, embedState, stripState, extractState, readSaved, pickNewer } from '../src/lib/savefile.js';

const APP = `<!doctype html>
<!-- © 2026 티쳐무 -->
<html lang="ko"><head>
    <meta charset="UTF-8" />
    <title>앱</title>
    <script type="module">console.log('saved-work 라는 글자가 앱 코드에도 있다')</script>
  </head><body></body></html>`;
const data = (state, who = { id: '20101', name: '홍길동' }) => ({ app: APP_ID, v: 1, who, savedAt: '2026-11-23T01:02:03.000Z', state });

묶음('파일 이름');
{
  확인('학번_이름_활동명', saveFileName('20101', '홍길동'), '20101_홍길동_패키지 공작소.html');
  확인('파일 이름에 쓸 수 없는 글자는 뺀다', safeName('20101_홍/길*동?.html'), '20101_홍길동.html');
  확인('활동 이름', ACTIVITY_NAME, '패키지 공작소');
  확인('이름 가리기', ['홍길동', '남궁민수', '김철', '이', ''].map(maskName), ['홍*동', '남**수', '김*', '이', '']);
}

묶음('활동 심기');
{
  const html = embedState(APP, data({ why: { copy: true, mod: true }, _at: 5 }));
  const at = html.indexOf(`<script id="${SAVED_ID}"`);
  참('<meta charset> 바로 뒤에 심는다(파일 앞 1024바이트 안에서 charset 을 찾게)', at > html.indexOf('<meta charset') && html.indexOf('<meta charset') < 1024 && html.slice(html.indexOf('<meta charset'), at).split('\n').length === 2);
  참('나머지 앱은 그대로', stripState(html) === APP);
  확인('다시 꺼내면 같은 활동', extractState(html).state, { why: { copy: true, mod: true }, _at: 5 });
  확인('학번·이름 · 저장한 때도', [extractState(html).who, extractState(html).savedAt], [{ id: '20101', name: '홍길동' }, '2026-11-23T01:02:03.000Z']);
  const twice = embedState(html, data({ quiz: { ans: { 0: 1 } } }));
  확인('두 번 심어도 칸은 하나 — 새 활동으로 바뀐다', [(twice.match(new RegExp(`id="${SAVED_ID}"`, 'g')) || []).length, extractState(twice).state], [1, { quiz: { ans: { 0: 1 } } }]);
  참('앱 코드 속 saved-work 글자는 건드리지 않는다', stripState(twice).includes("console.log('saved-work 라는 글자가 앱 코드에도 있다')"));
}

묶음('학생 코드에 위험한 글자가 있어도');
{
  const code = 'print("</script><script>alert(1)</script>")\n# <!-- 주석 -->\n줄 구분 문단';
  const html = embedState(APP, data({ exam: { project: { files: { 'start.py': code } } } }));
  const block = html.slice(html.indexOf(`<script id="${SAVED_ID}"`), html.indexOf('</script>', html.indexOf(`<script id="${SAVED_ID}"`)) + 9);
  참('심은 칸 안에는 < 가 한 글자도 없다(앱 스크립트가 끊기지 않게)', !block.slice(block.indexOf('>') + 1, -9).includes('<'));
  참('줄 구분 문자도 이스케이프', !packData({ s: '  ' }).includes(' ') && !packData({ s: '  ' }).includes(' '));
  확인('그래도 꺼내면 글자 그대로', extractState(html).state.exam.project.files['start.py'], code);
  확인('</script> 는 앱 끝의 하나 + 심은 칸의 하나뿐', (html.match(/<\/script>/g) || []).length, 2);
}

묶음('심은 활동 읽기');
{
  참('다른 앱의 저장 파일은 읽지 않는다', readSaved(JSON.stringify({ app: 'regression-lab', state: {} })) === null);
  참('깨진 글자는 null', readSaved('{"app":"pkgws",') === null && readSaved('') === null);
  참('state 가 객체가 아니면 null', readSaved(JSON.stringify({ app: APP_ID, state: [] })) === null && readSaved(JSON.stringify({ app: APP_ID })) === null);
  확인('학번·이름이 없어도 빈 글자로', readSaved(JSON.stringify({ app: APP_ID, state: {} })).who, { id: '', name: '' });
  확인('학번이 숫자로 들어 있어도 글자로', readSaved(JSON.stringify({ app: APP_ID, state: {}, who: { id: 20101, name: '홍길동' } })).who, { id: '20101', name: '홍길동' });
  참('심지 않은 앱에서는 null', extractState(APP) === null);
}

묶음('탭 기억 ↔ 파일 — 더 최근 것을 고른다');
{
  const file = { _at: 100, a: 'file' }, newer = { _at: 200, a: 'tab' }, older = { _at: 50, a: 'tab' }, same = { _at: 100, a: 'tab' };
  확인('탭 기억이 없으면 파일', pickNewer(null, file), file);
  확인('파일에서 더 하다가 새로 고침 — 탭이 더 최근', pickNewer(newer, file), newer);
  확인('파일이 더 최근(다른 곳에서 더 하고 저장해 온 파일)', pickNewer(older, file), file);
  확인('같으면 탭 쪽 — 「본인 맞나요」 를 다시 묻지 않게', pickNewer(same, file), same);
  확인('파일이 없으면 탭', pickNewer(newer, null), newer);
  확인('둘 다 없으면 null', pickNewer(null, null), null);
}

묶음('앱 코드에 </script> 글자를 두지 않는다');
{
  // 빌드하면 앱 코드가 HTML 의 <script> 안에 통째로 들어간다 — 코드 속 「</script>」 는 그 자리에서 앱을 끊는다
  const src = readFileSync(new URL('../src/lib/savefile.js', import.meta.url), 'utf-8');
  const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  참('savefile.js 의 코드에 「</script」 가 없다', !/<\/script/i.test(code));
}
