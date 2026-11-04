/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  실행 결과를 보고 한국어로 풀어 준다 — 터미널 아래 노란 말풍선.
 *  영어 오류 문구는 그대로 두고(진짜 VS Code 에서도 그렇게 보이므로), 「왜 났고 어떻게 고치는지」 를 덧붙인다.
 *  프로젝트의 파일·폴더를 직접 살펴서 「calc.py 는 mytools 폴더 안에 있어요」 처럼 구체적으로 말한다.
 *  ⚠ node 로 불러다 시험하므로 여기서 DOM 을 만지지 말 것. 돌려주는 것은 HTML 조각 글자다.
 */
import { suggest, KNOWN_EXTERNAL } from './pymini.js';
import { PYINFO } from './pyinfo.js';
import { allDirs, baseName, parentOf, importableNames, whereDefined, importsOf, modName } from './project.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const C = (s) => `<code>${esc(s)}</code>`;
const B = (s) => `<b>${esc(s)}</b>`;

/** 오타 찾기 — 파이썬의 「Did you mean」 보다 너그럽게 (글자 두 개가 자리를 바꾼 clac ↔ calc 도 잡는다) */
function osa(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}
export function near(name, list) {
  let best = null, bd = Infinity;
  for (const c of list) {
    if (c === name) continue;
    const dist = c.toLowerCase() === name.toLowerCase() ? 0.5 : osa(name, c);
    if (dist < bd && dist <= Math.max(1, Math.floor(Math.max(name.length, c.length) / 3))) { bd = dist; best = c; }
  }
  return best || suggest(name, list);
}

/** 파일이 어디에 있는지 사람 말로 */
const placeText = (dir) => (dir ? `${C(dir + '/')} 폴더 안` : '맨 위(프로젝트 폴더)');

/**
 * r: runProject 의 결과, p: 프로젝트 { files, dirs }
 * 돌려주는 것: [{ kind: 'error'|'warn'|'ok'|'tip', html }]
 */
export function explain(r, p) {
  const out = [];
  const say = (kind, html) => out.push({ kind, html });
  const scriptDir = parentOf(r.entry || 'main.py');
  const hasMain = Object.prototype.hasOwnProperty.call(p.files, 'main.py');

  if (r.ok) {
    if (r.entry !== 'main.py' && hasMain) {
      say('warn', `▶ 는 <b>지금 열려 있는 파일</b>을 실행해요. 방금 실행한 것은 ${C(r.entry)} 예요. `
        + `프로그램 전체를 돌리려면 ${C('main.py')} 탭을 누른 다음 ▶ 를 누르세요.`);
    }
    if (!r.stdout && !r.written.length) {
      say('tip', '실행은 되었지만 화면에 아무것도 나오지 않았어요. 함수를 <b>정의(def)만 하고 부르지 않았는지</b>, print( ) 가 있는지 확인해 보세요.');
    }
    return out;
  }
  if (r.errorType === 'FileNotFound') {
    say('error', `실행할 파일 ${C(r.entry)} 이 없어요.`);
    return out;
  }
  const T = r.errorType, M = r.errorMsg || '';

  // ── 모듈을 못 찾음 ──
  if (T === 'ModuleNotFoundError') {
    const notPkg = /; '(.+)' is not a package$/.exec(M);
    const full = r.missingName || (/No module named '([^']+)'/.exec(M) || [])[1] || '';
    if (notPkg) {
      const parent = notPkg[1];
      const last = full.split('.').pop();
      if (last === 'py') {
        say('error', `import 뒤에는 파일 이름에서 ${B('.py')} 를 <b>빼고</b> 씁니다. ${C('import ' + parent)} 로 고치세요. `
          + '점(.)은 파이썬에게 「폴더 안으로 들어가라」는 뜻이라, calc.py 를 「calc 폴더 안의 py」 로 읽어 버렸어요.');
      } else {
        say('error', `${C(parent)} 는 파일(모듈)이에요. 파일 안에는 다른 모듈을 담을 수 없어서 ${C(full)} 처럼 점으로 이어 쓸 수 없어요. `
          + '점(.)으로 이어 쓰는 것은 <b>패키지(폴더)</b>뿐입니다.');
      }
      return out;
    }
    const parts = full.split('.');
    if (parts.length > 1) {
      // 패키지는 찾았는데 그 안에 모듈이 없음
      const pkgDir = [scriptDir, ...parts.slice(0, -1)].filter(Boolean).join('/');
      const child = parts[parts.length - 1];
      say('error', `${C(pkgDir + '/')} 폴더 안에 ${C(child + '.py')} 가 없어요.`);
      const nb = near(child, importableNames(p, pkgDir));
      if (nb) say('tip', `혹시 ${C(nb)} 인가요? 파일 이름과 철자·대소문자까지 똑같아야 해요.`);
      const elsewhere = Object.keys(p.files).filter((f) => baseName(f) === child + '.py');
      if (elsewhere.length) say('tip', `${C(child + '.py')} 는 지금 ${placeText(parentOf(elsewhere[0]))}에 있어요. ${C(pkgDir + '/')} 폴더로 끌어다 옮기세요.`);
      return out;
    }
    const name = full;
    if (KNOWN_EXTERNAL[name]) {
      say('error', `${C(name)} 는 남이 만든 <b>외부 라이브러리</b>예요. 파이썬에 처음부터 들어 있지 않아서 설치해야 써요. `
        + `아래 <b>터미널</b>에 ${C('pip install ' + KNOWN_EXTERNAL[name])} 을 입력하세요. (파이썬 코드 안에 쓰는 것이 아니에요)`);
      return out;
    }
    const rootHas = importableNames(p, '').includes(name);
    if (scriptDir && rootHas) {
      const isMain = baseName(r.entry) === 'main.py';
      say('error', `파이썬은 <b>「실행한 파일이 있는 폴더」</b>에서 모듈을 찾아요. 방금 실행한 ${C(r.entry)} 는 ${C(scriptDir + '/')} 폴더 안에 있어서, `
        + `맨 위에 있는 ${C(name)} 를 찾지 못했어요.`);
      say('tip', isMain
        ? `${C('main.py')} 를 <b>패키지 폴더 밖(맨 위)</b>으로 끌어다 옮기세요. 탐색기의 빈 곳에 놓으면 맨 위로 갑니다.`
        : `${C('main.py')} 탭을 열고 ▶ 를 누르세요. ▶ 는 지금 열린 파일을 실행해요.`);
      return out;
    }
    // 다른 폴더 안에 같은 이름의 파일이 있다
    const deeper = Object.keys(p.files).filter((f) => baseName(f) === name + '.py' && parentOf(f) !== scriptDir);
    if (deeper.length) {
      const d = parentOf(deeper[0]);
      say('error', `${C(name + '.py')} 는 ${placeText(d)}에 있어요. 폴더 안의 모듈은 폴더 이름부터 적어 불러와요.`);
      say('tip', `${C(`from ${modName(d)} import ${name}`)} 처럼 고치세요.`);
      return out;
    }
    // .py 로 끝나지 않는 비슷한 파일
    const noExt = Object.keys(p.files).filter((f) => parentOf(f) === scriptDir && !f.endsWith('.py') && baseName(f).replace(/\..*$/, '') === name);
    if (noExt.length) {
      say('error', `${C(baseName(noExt[0]))} 는 이름이 ${B('.py')} 로 끝나지 않아서 모듈이 아니에요. 이름을 ${C(name + '.py')} 로 바꾸세요.`);
      return out;
    }
    const nb = near(name, importableNames(p, scriptDir));
    if (nb) {
      say('error', `${C(name)} 라는 파일(${C(name + '.py')})이나 폴더가 없어요. 혹시 ${C(nb)} 인가요?`);
      say('tip', '모듈 이름은 파일 이름과 <b>철자·대소문자까지 똑같아야</b> 해요.');
      return out;
    }
    if (PYINFO.stdlib.includes(name)) {
      say('error', `${C(name)} 는 진짜 파이썬에는 있는 표준 라이브러리지만 이 앱에서는 쓸 수 없어요.`);
      return out;
    }
    say('error', `${C(name)} 라는 파일(${C(name + '.py')})이나 패키지 폴더가 ${placeText(scriptDir)}에 없어요. 탐색기에서 파일 이름을 확인해 보세요.`);
    return out;
  }

  // ── 불러올 이름이 없음 / 점으로 시작하는 import ──
  if (T === 'ImportError') {
    if (/attempted relative import with no known parent package/.test(M)) {
      say('error', `점(.)으로 시작하는 import(${C('from . import …')})는 <b>패키지 안의 파일끼리</b>만 써요. `
        + `직접 실행하는 파일(main.py)에서는 ${C('from 패키지이름 import 모듈')} 처럼 이름을 적어 주세요.`);
      return out;
    }
    const f = r.importFrom;
    if (f) {
      const there = whereDefined(p, f.name);
      if (f.isPkg) {
        say('error', `${C(f.mod.replace(/\./g, '/') + '/')} 폴더 안에 ${C(f.name + '.py')} 가 없고, ${C('__init__.py')} 에도 ${C(f.name)} 이 없어요.`);
        if (there.length) say('tip', `${C(f.name)} 은 ${C(there[0])} 안에 있어요. ${C(`from ${modName(there[0])} import ${f.name}`)} 처럼 모듈까지 적어 주세요.`);
      } else {
        say('error', `${C(f.file || f.mod + '.py')} 안에 ${C(f.name)} 이라는 이름(함수·변수)이 없어요. ${C('def')} 줄의 이름과 철자가 같은지 보세요.`);
        if (there.length && there[0] !== f.file) say('tip', `${C(f.name)} 은 ${C(there[0])} 안에 있어요.`);
      }
      return out;
    }
  }

  // ── 모듈 안에 그런 이름이 없음 ──
  if (T === 'AttributeError' && r.attrOf) {
    const a = r.attrOf;
    const userFile = Object.keys(p.files).find((f) => parentOf(f) === scriptDir && f === (scriptDir ? scriptDir + '/' : '') + a.mod + '.py');
    if (a.kind === 'builtin' && userFile) {
      say('error', `${C(a.mod)} 는 파이썬 안에 처음부터 들어 있는 <b>내장 모듈</b> 이름이에요. 내장 모듈은 언제나 먼저 불려 와서, `
        + `내가 만든 ${C(userFile)} 대신 파이썬의 ${C(a.mod)} 를 불러왔어요.`);
      say('tip', `파일 이름을 겹치지 않게 바꾸세요. 예) ${C('my' + a.mod + '.py')} → ${C('import my' + a.mod)}`);
      return out;
    }
    if (a.kind === 'user' && PYINFO.stdlib.includes(a.mod) && PYINFO.dir[a.mod] && PYINFO.dir[a.mod].includes(a.attr)) {
      say('error', `내가 만든 ${C(a.mod + '.py')} 가 파이썬의 ${C(a.mod)} 모듈을 <b>가렸어요</b>. 파이썬은 「실행한 파일이 있는 폴더」를 먼저 찾기 때문에 `
        + `진짜 ${C(a.mod)} 대신 내 파일을 불러왔고, 내 파일에는 ${C(a.attr)} 가 없어요.`);
      say('tip', `파일 이름을 겹치지 않게 바꾸세요. 예) ${C('my' + a.mod + '.py')}`);
      return out;
    }
    if (a.isPkg) {
      const dir = (a.file ? parentOf(a.file) : [scriptDir, ...a.mod.split('.')].filter(Boolean).join('/'));
      if (Object.prototype.hasOwnProperty.call(p.files, `${dir}/${a.attr}.py`) || allDirs(p).includes(`${dir}/${a.attr}`)) {
        say('error', `${C('import ' + a.mod)} 만으로는 그 안의 모듈 ${C(a.attr)} 가 따라오지 않아요. 패키지(폴더)를 불러와도 안의 파일은 저절로 불려 오지 않습니다.`);
        say('tip', `${C(`import ${a.mod}.${a.attr}`)} 또는 ${C(`from ${a.mod} import ${a.attr}`)} 로 불러오세요.`);
        return out;
      }
      say('error', `패키지 ${C(a.mod)} 에 ${C(a.attr)} 가 없어요. 폴더 안의 파일 이름을 확인해 보세요.`);
      return out;
    }
    if (a.kind === 'user') {
      say('error', `${C(a.file || a.mod + '.py')} 안에 ${C(a.attr)} 라는 이름이 없어요. ${C('def')} 줄의 함수 이름과 철자가 같은지 보세요.`);
      const there = whereDefined(p, a.attr);
      if (there.length && there[0] !== a.file) say('tip', `${C(a.attr)} 는 ${C(there[0])} 안에 있어요. 그 모듈을 불러와서 부르세요.`);
      return out;
    }
    say('error', `${C(a.mod)} 모듈에는 ${C(a.attr)} 가 없어요.`);
    return out;
  }

  // ── 그런 이름이 없음 ──
  if (T === 'NameError') {
    const n = r.wrongName || (/name '([^']+)'/.exec(M) || [])[1] || '';
    const file = r.errorFile || r.entry;
    const imps = importsOf(p.files[file] || '') || [];
    const aliasOf = imps.find((st) => st.type === 'Import' && st.names.some((al) => al.asname && al.name === n));
    if (aliasOf) {
      const al = aliasOf.names.find((x) => x.name === n);
      say('error', `${C(`import ${n} as ${al.asname}`)} 로 <b>별명</b>을 붙였어요. 그러면 ${C(n)} 라는 이름은 생기지 않고 ${C(al.asname)} 만 생겨요.`);
      say('tip', `${C(`${al.asname}.함수( )`)} 처럼 별명으로 부르세요.`);
      return out;
    }
    const fromMod = imps.find((st) => st.type === 'FromImport' && (st.mod === n || st.mod.split('.').pop() === n || st.mod.split('.')[0] === n));
    if (fromMod) {
      const got = fromMod.names.map((x) => (x === '*' ? '*' : x.asname || x.name)).join(', ');
      say('error', `${C(`from ${fromMod.mod} import …`)} 는 ${C(fromMod.mod)} 안의 이름(${C(got)})만 가져와요. ${C(n)} 라는 이름 자체는 생기지 않아요.`);
      say('tip', `그래서 ${C(n + '.')} 를 빼고 ${C(got.split(', ')[0])} 처럼 바로 부르면 돼요.`);
      return out;
    }
    const dotted = imps.find((st) => st.type === 'Import' && st.names.some((al) => !al.asname && al.name.includes('.') && al.name.split('.').pop() === n));
    if (dotted) {
      const al = dotted.names.find((x) => x.name.split('.').pop() === n);
      say('error', `${C('import ' + al.name)} 로 불렀을 때 생기는 이름은 맨 앞의 ${C(al.name.split('.')[0])} 하나예요.`);
      say('tip', `${C(al.name + '.함수( )')} 처럼 전체 경로로 부르거나, ${C(`from ${al.name.split('.').slice(0, -1).join('.')} import ${n}`)} 로 바꾸면 ${C(n + '.함수( )')} 로 부를 수 있어요.`);
      return out;
    }
    if (importableNames(p, scriptDir).includes(n)) {
      say('error', `${C(n)} 는 모듈 이름이에요. 쓰기 전에 ${C('import ' + n)} 로 먼저 불러와야 해요.`);
      return out;
    }
    const there = whereDefined(p, n).filter((f) => f !== file);
    if (there.length) {
      const mod = modName(there[0]);
      const imported = imps.some((st) => (st.type === 'Import' && st.names.some((al) => al.name === mod)) || (st.type === 'FromImport' && st.mod === mod));
      say('error', `${C(n)} 는 ${C(there[0])} 안에 있는 이름이에요. 다른 파일의 함수는 <b>그냥 이름만 써서는</b> 부를 수 없어요.`);
      say('tip', imported
        ? `${C(`import ${mod}`)} 로 불렀다면 ${C(`${mod}.${n}( )`)} 처럼 앞에 모듈 이름을 붙이거나, ${C(`from ${mod} import ${n}`)} 로 가져오세요.`
        : `${C(`from ${mod} import ${n}`)} 로 가져오거나, ${C(`import ${mod}`)} 다음 ${C(`${mod}.${n}( )`)} 로 부르세요.`);
      return out;
    }
    if (PYINFO.stdlib.includes(n)) {
      say('error', `${C(n)} 모듈을 쓰려면 파일 위쪽에 ${C('import ' + n)} 를 먼저 써야 해요.`);
      return out;
    }
    say('error', `${C(n)} 라는 이름을 만든 적이 없어요. 철자(대소문자 포함)를 확인하고, 쓰기 전에 값을 넣었는지(정의했는지) 보세요.`);
    return out;
  }

  // ── 문법 오류 ──
  if (T === 'SyntaxError' || T === 'IndentationError') {
    const file = r.errorFile || r.entry;
    const line = String((p.files[file] || '').split('\n')[(r.errorLine || 1) - 1] || '');
    if (/^\s*!?pip\s/.test(line) || /^\s*pip$/.test(line.trim())) {
      say('error', `${C('pip install')} 은 파이썬 코드가 아니라 <b>터미널 명령</b>이에요. 파이썬 파일에서는 이 줄을 지우고, 아래 터미널에 입력하세요. `
        + '(코랩·주피터에서만 셀에 앞에 느낌표를 붙여 !pip install … 로 씁니다)');
      return out;
    }
    if (/^\s*(import|from)\s/.test(line)) {
      if (line.includes('-')) {
        say('error', `모듈 이름에는 붙임표(${B('-')})를 쓸 수 없어요. 파이썬은 ${C('my-calc')} 를 「my 빼기 calc」 로 읽어요.`);
        say('tip', `파일 이름을 밑줄로 바꾸세요. 예) ${C('my_calc.py')} → ${C('import my_calc')}`);
        return out;
      }
      if (/["']/.test(line)) { say('error', `import 뒤의 모듈 이름에는 따옴표를 쓰지 않아요. 예) ${C('import calc')}`); return out; }
      if (line.includes('/')) { say('error', `폴더와 모듈 사이는 ${B('/')} 가 아니라 점(${B('.')})으로 이어요. 예) ${C('import mypackage.module1')}`); return out; }
      if (/\s\d/.test(line) || /import\s+\d/.test(line)) { say('error', '모듈 이름은 숫자로 시작할 수 없어요. 파일 이름을 바꾸세요.'); return out; }
    }
    const where = file !== r.entry ? `${C(file)} 의 ` : '';
    if (/expected ':'/.test(M)) say('error', `${where}${r.errorLine}번째 줄 끝에 <b>콜론(:)</b>이 빠졌어요. def·if·for·while·class 줄은 콜론으로 끝나요.`);
    else if (/was never closed/.test(M)) say('error', `${where}여는 괄호를 닫지 않았어요. 짝이 되는 닫는 괄호를 넣어 주세요.`);
    else if (/Perhaps you forgot a comma/.test(M)) say('error', `${where}괄호 안의 값과 값 사이에 <b>쉼표(,)</b>가 빠졌어요.`);
    else if (/unterminated/.test(M)) say('error', `${where}따옴표를 닫지 않았어요. 연 따옴표와 같은 따옴표로 닫아 주세요.`);
    else if (/expected an indented block/.test(M)) say('error', `${where}콜론(:)으로 끝난 줄 다음 줄은 <b>스페이스 4칸 들여 써야</b> 해요.`);
    else if (/unexpected indent/.test(M)) say('error', `${where}${r.errorLine}번째 줄이 쓸데없이 들여 써져 있어요. 줄 맨 앞의 빈칸을 지우세요.`);
    else if (/unindent does not match/.test(M)) say('error', `${where}들여쓰기 칸 수가 위 줄들과 맞지 않아요. 같은 블록은 같은 칸 수(보통 4칸)로 맞추세요.`);
    else say('error', `${where}${r.errorLine}번째 줄의 문법이 파이썬 규칙에 맞지 않아요. ${esc(r.errorHint || '')}`);
    if (file !== r.entry) say('tip', `오류는 불러온 파일 ${C(file)} 안에 있어요. import 를 하면 그 파일이 실행되기 때문에, 그 파일의 실수도 여기서 드러나요.`);
    return out;
  }

  // ── 함수 부르기 ──
  if (T === 'TypeError' && /missing \d+ required positional argument|takes \d+ positional argument/.test(M)) {
    say('error', '함수를 부를 때 괄호 안에 넣은 값의 개수가 그 함수의 def 줄에 적힌 매개변수 개수와 달라요.');
    return out;
  }
  if (T === 'TypeError' && /unsupported operand|can only concatenate/.test(M)) {
    say('error', '서로 계산할 수 없는 값(예: 숫자와 글자)을 계산하려 했어요. 넘겨준 값의 자료형을 확인해 보세요.');
  } else if (T === '지원하지 않는 기능' || T === '지원하지 않는 문법') {
    say('error', esc(M) + (r.errorHint ? ' ' + esc(r.errorHint) : ''));
    return out;
  } else if (T === 'EOFError') {
    say('error', '이 앱의 터미널에서는 input( ) 으로 값을 받을 수 없어요. 값을 코드에 직접 넣어 보세요.');
    return out;
  } else if (r.errorHint) {
    say('error', esc(r.errorHint));
  }
  if (r.errorFile && r.errorFile !== r.entry) {
    say('tip', `오류가 난 곳은 불러온 모듈 ${C(r.errorFile)} 의 ${r.errorLine}번째 줄이에요. Traceback 은 「누가 누구를 불렀는지」를 위에서 아래로 보여 줘요 — 맨 아래 칸이 실제로 문제가 난 곳이에요.`);
  }
  return out;
}
