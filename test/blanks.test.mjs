/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  📝 개념 정리 빈칸 (2026-11-10) — 자료 · 채점 · 힌트 · 활동 기록.
 */
import { 묶음, 확인, 참 } from './harness.mjs';
import { BLANKS } from '../src/data/blanks.js';
import { parseLine, norm, isRight, isCode, hintOf, blankKey, blanksOfLine, blankStats, filledText, groupOf, lineById } from '../src/lib/blanks.js';
import { ACTIVITIES, blockers, isDone, progressOf } from '../src/lib/progress.js';
import { MISSIONS } from '../src/data/missions.js';
import { buildReport } from '../src/lib/report.js';

const allLines = BLANKS.flatMap((g) => g.lines.map((l) => ({ ...l, screen: g.screen })));
/** 모든 빈칸에 맨 앞 정답을 넣은 기록 */
const fullBlanks = () => Object.fromEntries(allLines.flatMap((l) => blanksOfLine(l).map((b) => [b.key, b.answers[0]])));

묶음('빈칸 문장 읽기');
{
  확인('보통 글자 · 코드 · 빈칸으로 나눈다', parseLine('a {{x|y}} `c` b').map((p) => [p.t, p.v]), [['text', 'a '], ['blank', 'x'], ['text', ' '], ['code', 'c'], ['text', ' b']]);
  확인('빈칸에는 몇째 칸인지가 붙는다', parseLine('{{a}} {{b}}').filter((p) => p.t === 'blank').map((p) => p.k), [0, 1]);
  확인('다른 정답은 | 로 가른다', parseLine('{{가|나 |다}}')[0].answers, ['가', '나', '다']);
  확인('정답을 넣어 이은 문장', filledText({ text: '「{{모듈}}」 이에요 `x`' }), '「모듈」 이에요 x');
}

묶음('채점');
{
  참('빈칸·따옴표·끝 마침표는 걷는다', isRight(['__main__', '"__main__"'], " '__main__'. "));
  참('한글 정답은 다른 정답도 받는다', isRight(['재사용', '재활용'], '재활용'));
  참('한글 정답의 영문 다른 정답은 대소문자를 가리지 않는다', isRight(['터미널', 'terminal'], 'Terminal'));
  참('코드 정답은 대소문자까지 맞아야 한다 — 파이썬은 Print( ) 를 모른다', !isRight(['print'], 'Print') && isRight(['print'], 'print'));
  참('import 도 대소문자', !isRight(['import'], 'Import'));
  참('빈 칸은 정답이 아니다', !isRight(['a'], '') && !isRight(['a'], '   '));
  참('( ) 안의 빈칸은 걷고 견준다', isRight(['calc.add', 'calc.add(2, 3)'], 'calc.add(2,3)'));
  참('코드인지 가른다', isCode('__init__.py') && isCode('!') && !isCode('폴더') && !isCode('열려 있는'));
  확인('norm', norm('  Hello World. '), 'helloworld');
}

묶음('힌트');
{
  확인('1단계는 글자 수만', hintOf('재사용', 1), '○○○');
  확인('1단계 — 기호도 감춘다(한 글자 정답이 드러나지 않게)', hintOf('!', 1), '○');
  확인('2단계 한글은 첫소리', hintOf('열려 있는', 2), 'ㅇㄹ ㅇㄴ');
  확인('2단계 영문은 낱말의 첫 글자', [hintOf('import', 2), hintOf('__init__.py', 2), hintOf('mypackage.module1.hello', 2)], ['i•••••', '__i•••__.p•', 'm••••••••.m••••••.h••••']);
  확인('힌트를 안 열면 아무것도', hintOf('모듈', 0), '');
  for (const l of allLines) for (const b of blanksOfLine(l)) {
    const a = b.answers[0];
    if (a.length > 1) 참(`「${b.key}」 1·2단계 힌트가 정답 그대로가 아니다`, hintOf(a, 1) !== a && hintOf(a, 2) !== a);
  }
}

묶음('빈칸 자료');
{
  const ids = allLines.map((l) => l.id);
  확인('문장 id 가 겹치지 않는다', ids.length, new Set(ids).size);
  확인('화면이 겹치지 않는다', BLANKS.length, new Set(BLANKS.map((g) => g.screen)).size);
  확인('빈칸 모두', blankStats({}).total, 36);
  확인('빈칸이 있는 화면 열 곳', BLANKS.map((g) => g.screen), ['concept/why', 'concept/layers', 'concept/anatomy', 'concept/where', 'import/forms', 'import/pkgforms', 'build/m1', 'build/m2', 'build/m3', 'build/m4']);
  for (const g of BLANKS) {
    참(`「${g.screen}」 는 실재하는 활동 화면이다`, !!ACTIVITIES[g.screen]);
    참(`「${g.screen}」 는 ④ 수행평가 탭이 아니다 (문항의 답을 알려 주게 된다)`, !g.screen.startsWith('assess/'));
    참(`「${g.screen}」 에 제목이 있다`, !!g.title && g.title.startsWith('📝'));
    참(`「${g.screen}」 에 빈칸이 하나 이상`, blankStats({}, g.screen).total > 0);
    확인(`「${g.screen}」 화면 열쇠로 찾는다`, groupOf(g.screen) === g, true);
  }
  for (const l of allLines) {
    const blanks = blanksOfLine(l);
    참(`「${l.id}」 에 빈칸이 있다`, blanks.length > 0);
    참(`「${l.id}」 id 로 찾는다`, lineById(l.id) && lineById(l.id).text === l.text);
    for (const b of blanks) {
      참(`「${b.key}」 맨 앞 정답은 스스로 정답이다`, isRight(b.answers, b.answers[0]));
      참(`「${b.key}」 다른 정답도 모두 정답이다`, b.answers.every((a) => isRight(b.answers, a)));
    }
    // 빈칸의 정답이 같은 문장의 보통 글자·코드에 그대로 보이면 빈칸이 아니다
    const plain = parseLine(l.text).filter((p) => p.t !== 'blank').map((p) => p.v).join(' ') + ' ' + (l.desc || '');
    for (const b of blanks) {
      const a = b.answers[0];
      참(`「${b.key}」 정답 「${a}」 가 같은 문장에 드러나지 않는다`, !norm(plain).includes(norm(a)));
    }
  }
  // 미션 이야기 자리 — 빈칸을 정답으로 채우면 missions.js 의 이야기와 글자까지 같다 (두 곳이 어긋나지 않게)
  for (const g of BLANKS.filter((x) => x.screen.startsWith('build/'))) {
    const m = MISSIONS.find((x) => `build/${x.id}` === g.screen);
    참(`「${g.screen}」 미션이 있다`, !!m);
    const st = g.lines.find((l) => l.story);
    if (st) 확인(`「${g.screen}」 이야기 빈칸을 채우면 미션 이야기와 같다`, filledText(st), m.story);
    참(`「${g.screen}」 이야기 자리는 하나뿐`, g.lines.filter((l) => l.story).length <= 1);
  }
  참('예측 표 두 화면은 「실행해서 확인」 뒤에 연다', ['import/forms', 'import/pkgforms'].every((k) => groupOf(k).after === 'shown'));
  확인('예측 표 정리에는 import 문이 함께 있다', groupOf('import/forms').lines.map((l) => l.code), ['import calc', 'from calc import add', 'import calc as c']);
  // 엉뚱한 답은 틀린다 — 서로 헷갈리기 쉬운 짝
  참('import 꼴 — 생기는 이름 calc 자리에 add 는 틀린다', !isRight(blanksOfLine(lineById('forms.r1'))[0].answers, 'add'));
  참('import calc as c — 생기는 이름은 calc 가 아니다', !isRight(blanksOfLine(lineById('forms.r3'))[0].answers, 'calc'));
  참('from mypackage import module1 — hello( ) 만으로는 못 부른다', !isRight(blanksOfLine(lineById('pkg.r2'))[0].answers, 'hello'));
  참('패키지는 .py 파일이 아니다', !isRight(blanksOfLine(lineById('layers.pkg'))[0].answers, '.py'));
}

묶음('기록 · 잠금');
{
  const S = { blanks: fullBlanks() };
  확인('모두 채우면 36 / 36', blankStats(S), { right: 36, total: 36 });
  확인('화면 하나만', blankStats(S, 'concept/why'), { right: 5, total: 5 });
  const half = { blanks: { ...S.blanks, [blankKey('why.def', 0)]: '.txt' } };
  확인('하나 틀리면 그 화면만 줄어든다', [blankStats(half, 'concept/why').right, blankStats(half).right], [4, 35]);
  참('빈칸은 탭 잠금에 들어가지 않는다 — 다 비워도 막는 활동이 늘지 않는다', blockers('assess', {}).length === blockers('assess', S).length);
  참('빈칸을 다 채워도 활동이 끝난 것이 되지 않는다', Object.keys(ACTIVITIES).every((k) => !isDone(k, S)) && progressOf(S).done === 0);
}

묶음('활동 기록 HTML — 개념 정리');
{
  const S = { blanks: { ...fullBlanks(), [blankKey('why.def', 0)]: '<b>.txt</b>', [blankKey('why.def', 1)]: '' } };
  const html = buildReport(S, { id: '20101', name: '홍길동' });
  참('개념 정리 절이 있다', html.includes('📝 개념 정리 빈칸'));
  참('맞힌 수 34 / 36', html.includes('<b>34 / 36</b>칸 맞음') && html.includes('34 / 36칸 맞음'));
  참('학생이 쓴 답은 글자 그대로(태그가 먹지 않게)', html.includes('&lt;b&gt;.txt&lt;/b&gt;'));
  참('틀린 답은 w, 맞은 답은 r', html.includes('<span class="blank w">&lt;b&gt;') && html.includes('<span class="blank r">import</span>') === false && html.includes('<span class="blank r">재사용</span>'));
  참('비운 칸은 빈 밑줄', html.includes('<span class="blank">　　　</span>'));
  참('import 문이 문장 앞에 붙는다', html.includes('<code>from calc import add</code> →'));
  참('화면 이름은 활동 제목', html.includes('왜 파일을 나눌까?') && html.includes('미션 4 · ⭐ 심화'));
  참('빈 기록에서도 만들어진다', buildReport({}, { id: '1', name: 'x' }).includes('0 / 36'));
}
