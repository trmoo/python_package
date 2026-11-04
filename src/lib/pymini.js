/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유 */
/* ============================================================================
 * pymini.js — 교실용 미니 파이썬 해석기 (모듈·패키지판)
 *
 * 왜 직접 만들었나?
 *   교실 인터넷이 끊겨도 학생이 쓴 코드가 그 자리에서 돌아가야 한다.
 *   그래서 수업에 나오는 문법만 골라서 해석하는 작은 파이썬을 직접 만들었다.
 *   (`exception-basics` 앱의 해석기를 가져와 모듈·패키지 수업에 맞게 넓혔다.)
 *
 * 이 앱에서 더한 것 — 여러 파일로 된 프로그램
 *   가상 폴더      · { 'main.py': '…', 'mytools/__init__.py': '', 'mytools/calc.py': '…' }
 *   import 문      · import a · import a.b · import a.b as c · from a import b · from a.b import c
 *                    from a import * · from . import b (점으로 시작하는 import)
 *   모듈 찾기      · 진짜 파이썬과 같은 차례 — ① 파이썬에 내장된 모듈(math·time)
 *                    ② 「실행한 파일이 있는 폴더」 ③ 표준 라이브러리(random) ④ pip 로 설치한 것
 *   모듈은 한 번만 · 두 번 import 해도 처음 한 번만 실행된다 (sys.modules)
 *   __init__.py    · 패키지를 처음 불러올 때 한 번 실행된다. 없어도 불러와진다(이름공간 패키지)
 *   __name__       · 직접 실행한 파일은 '__main__', 불려 온 파일은 자기 이름
 *   진짜 파이썬 3.12 와 같은 오류 문구 · 여러 파일에 걸친 Traceback · 밑줄(^^^) · 「Did you mean」
 *
 * 크게 세 단계로 동작한다.
 *   ① tokenize() — 소스를 토큰(낱말)으로 쪼갠다. 들여쓰기도 토큰으로 만든다.
 *   ② parse()    — 토큰을 문법 나무(AST)로 조립한다.
 *   ③ run()      — 문법 나무를 위에서부터 하나씩 실행한다.
 * ========================================================================== */
import { PYINFO } from './pyinfo.js';

/* ────────────────────────────── 파이썬 값 표현 ─────────────────────────────
 * 파이썬의 값을 자바스크립트 객체 하나로 통일해서 다룬다.
 * k(kind)가 종류, v가 실제 값이다. 정수와 실수를 구분해 두어야
 * 파이썬처럼 5 와 5.0 을 다르게 출력할 수 있다.
 * ------------------------------------------------------------------------- */
/* 정수 — 파이썬의 정수는 크기 제한이 없다. 학생이 돈 칸에 99999999999999999999 를
 * 넣어도 진짜 파이썬처럼 정확히 계산되도록, 안전한 범위를 넘으면 BigInt 로 담는다.
 * 안전한 범위 안으로 돌아오면 다시 보통 숫자로 바꿔 둔다. */
const SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const INT = (v) => {
  if (typeof v === 'bigint') return { k: 'int', v: (v <= SAFE && v >= -SAFE) ? Number(v) : v };
  if (!Number.isSafeInteger(v) && Number.isFinite(v) && Number.isInteger(v)) return { k: 'int', v: BigInt(v) };
  return { k: 'int', v };
};
const big = (x) => (typeof x === 'bigint' ? x : BigInt(x));
const isBig = (x) => typeof x === 'bigint';
/** 바닥 나눗셈 (BigInt 는 0 쪽으로 자르므로 음수일 때 한 칸 내린다) */
const bigFloorDiv = (a, b) => { const q = a / b; return (a % b !== 0n && ((a < 0n) !== (b < 0n))) ? q - 1n : q; };
const bigMod = (a, b) => { const r = a % b; return (r !== 0n && ((r < 0n) !== (b < 0n))) ? r + b : r; };
const FLT = (v) => ({ k: 'float', v });
const STR = (v) => ({ k: 'str', v });
const BOOL = (v) => ({ k: 'bool', v: !!v });
const NONE = { k: 'none', v: null };
const LIST = (v) => ({ k: 'list', v });
const DICT = (v) => ({ k: 'dict', v }); // v: Map (키는 원시값)

const isNum = (x) => x.k === 'int' || x.k === 'float';

/** 딕셔너리 키(원시값)를 다시 파이썬 값으로 감싼다 */
const wrapKey = (k) => (typeof k === 'string' ? STR(k)
  : typeof k === 'boolean' ? BOOL(k)
    : Number.isInteger(k) ? INT(k) : FLT(k));

/** 파이썬 오류를 흉내낸 예외. type 은 ValueError·AttributeError 같은 이름. */
export class PyError extends Error {
  constructor(type, msg, line, hint, args) {
    super(msg);
    this.type = type;
    this.line = line;
    this.hint = hint || '';
    this.args = args || null;   // 예외 객체의 args (KeyError 는 키 값 그 자체)
    this.exc = null;            // raise 로 던진 파이썬 예외 객체
    this.fatal = false;         // true 면 except 로도 못 잡는다 (무한 반복 차단 등)
    this.tb = [];               // Traceback 칸들 — [{file, where, line, pos}] 바깥쪽부터
    this.cur = line;            // 지금 이 예외가 지나가는 줄 (Traceback 만들 때 쓴다)
    this.curPos = null;         // 그 줄의 어디인지 — {col, end, endLine, anchors} (밑줄 ^^^ 을 그릴 때)
    this.col = null;            // SyntaxError 가 난 칸 (밑줄 시작)
    this.colEnd = null;         // SyntaxError 밑줄 끝
    this.noCaret = false;       // IndentationError: unexpected indent 처럼 밑줄 없이 보이는 것
    this.synFile = null;        // 불러온 모듈 안에서 난 SyntaxError — 그 파일 이름
    this.wrongName = null;      // 「Did you mean」 을 고를 때 쓸 틀린 이름
    this.candidates = null;     // 그 후보 이름들 (진짜 파이썬과 같은 차례)
    this.forgotImport = false;  // NameError 인데 표준 라이브러리 이름이면 「Did you forget to import」
  }
  /** 화면에 보여 줄 문구 (파이썬 형식 + 한국어 도움말) */
  format() {
    const head = this.line ? `${this.line}번째 줄 — ${this.type}: ${this.message}` : `${this.type}: ${this.message}`;
    return this.hint ? `${head}\n  ↳ ${this.hint}` : head;
  }
}
const err = (type, msg, line, hint, args) => {
  throw new PyError(type, msg, line, hint, args);
};
/** 문법 나무의 한 자리(node)에서 난 오류 — 밑줄(^^^)을 그 자리 아래에 그린다 */
const errAt = (type, msg, node, hint, args, extra) => {
  const e = new PyError(type, msg, node.line, hint, args);
  e.curPos = spanOf(node);
  if (extra) Object.assign(e, extra);
  throw e;
};
/** SyntaxError — 토큰 자리를 함께 적어 둔다 (밑줄 ^ 을 그 칸에) */
const synErr = (type, msg, tok, hint, endTok) => {
  const e = new PyError(type, msg, tok.line, hint);
  e.col = tok.col ?? null;
  e.colEnd = endTok ? endTok.end : (tok.end ?? null);
  e.atTok = tok;
  throw e;
};
/** 노드가 차지하는 칸 (진짜 파이썬의 col_offset ~ end_col_offset 과 같게).
 *  괄호로 감싼 식 (a + b) 의 자리는 괄호 안쪽이다. 괄호까지 넣은 바깥 자리(pcol·pend)는
 *  그 식을 품은 더 큰 식이 자기 시작·끝을 정할 때만 쓴다. */
function spanOf(n) {
  if (!n || n.col == null) return null;
  return { col: n.col, end: n.end, endLine: n.endLine ?? n.line, anchors: n.anchors || null };
}
const outCol = (n) => (n.pcol ?? n.col);
const outEnd = (n) => (n.pend ?? n.end);
const outEndLine = (n) => (n.pendLine ?? n.endLine ?? n.line);
/** except 로 잡을 수 없는 오류 — 무한 반복을 멈추는 장치가 except 에 먹히면 안 된다. */
const fatal = (type, msg, line, hint) => {
  const e = new PyError(type, msg, line, hint);
  e.fatal = true;
  throw e;
};

/* ══════════════════════════════ ① 토큰화 ══════════════════════════════════ */

const KEYWORDS = new Set([
  'class', 'def', 'return', 'if', 'elif', 'else', 'while', 'for', 'in', 'not',
  'and', 'or', 'pass', 'break', 'continue', 'import', 'from', 'True', 'False',
  'None', 'is', 'global', 'del', 'try', 'except', 'finally', 'raise', 'as',
]);

/* 예외의 족보 — 자식 → 부모. except 부모 는 자식까지 함께 잡는다.
 * (진짜 파이썬의 족보에서 수업에 나오는 것만 옮겼다) */
export const EXC_PARENT = {
  BaseException: null,
  Exception: 'BaseException',
  ArithmeticError: 'Exception',
  ZeroDivisionError: 'ArithmeticError',
  OverflowError: 'ArithmeticError',
  LookupError: 'Exception',
  IndexError: 'LookupError',
  KeyError: 'LookupError',
  ValueError: 'Exception',
  TypeError: 'Exception',
  NameError: 'Exception',
  AttributeError: 'Exception',
  RuntimeError: 'Exception',
  RecursionError: 'RuntimeError',
  OSError: 'Exception',
  FileNotFoundError: 'OSError',
  EOFError: 'Exception',
  ImportError: 'Exception',
};
const EXC_NAMES = new Set(Object.keys(EXC_PARENT));

// 긴 연산자를 먼저 찾아야 '==' 가 '=' 두 개로 쪼개지지 않는다.
const OPS = [
  '**=', '//=', '...',
  '**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '->',
  '+', '-', '*', '/', '%', '<', '>', '=', '(', ')', '[', ']', '{', '}',
  ',', ':', '.', ';',
];

/** 교안 PDF에서 복사한 코드에 섞여 있는 특수 문자를 보통 문자로 바꾼다. */
function normalize(src) {
  return src
    .replace(/\r\n?/g, '\n')
    .replace(/[‘’ʼ′]/g, "'")   // ‘ ’ → '
    .replace(/[“”″]/g, '"')          // “ ” → "
    .replace(/[ ​　]/g, ' ')          // 특수 공백 → 보통 공백
    .replace(/\t/g, '    ');                        // 탭 → 공백 4칸
}

function tokenize(srcRaw) {
  const src = normalize(srcRaw);
  const toks = [];
  const indents = [0];
  const brackets = [];          // 아직 닫히지 않은 괄호 — '(' was never closed 를 알려 주려고
  let i = 0, line = 1, lineStart = 0, depth = 0, atLineStart = true;

  // 토큰마다 자리(줄·칸)를 적어 둔다 — 오류가 난 곳에 밑줄(^^^)을 긋기 위해서다.
  //   col: 그 줄에서 몇 번째 글자에서 시작하는지(0부터), end: 끝난 다음 칸
  const push = (type, value, sLine, sCol) => toks.push({
    type, value, line: sLine ?? line, col: sCol ?? (i - lineStart), endLine: line, end: i - lineStart,
  });
  const newline = () => { line++; lineStart = i; };

  while (i < src.length) {
    // ── 줄 맨 앞: 들여쓰기 계산 ──
    if (atLineStart && depth === 0) {
      let ws = 0;
      while (i < src.length && src[i] === ' ') { ws++; i++; }
      // 빈 줄이나 주석만 있는 줄은 들여쓰기를 따지지 않는다.
      if (src[i] === '\n' || src[i] === '#' || i >= src.length) {
        if (src[i] === '#') { while (i < src.length && src[i] !== '\n') i++; }
        if (src[i] === '\n') { i++; newline(); }
        continue;
      }
      if (ws > indents[indents.length - 1]) {
        indents.push(ws);
        push('INDENT', ws, line, ws);
      } else {
        while (ws < indents[indents.length - 1]) {
          indents.pop();
          push('DEDENT', ws, line, ws);
        }
        if (ws !== indents[indents.length - 1]) {
          const e = new PyError('IndentationError', 'unindent does not match any outer indentation level', line,
            '같은 블록 안의 문장은 들여쓰기 칸 수를 똑같이 맞춰 주세요. (보통 스페이스 4칸)');
          // 진짜 파이썬은 이 줄의 끝에 ^ 를 하나 긋는다
          let le = src.indexOf('\n', i); if (le < 0) le = src.length;
          e.col = src.slice(lineStart, le).trimEnd().length; e.colEnd = e.col + 1;
          throw e;
        }
      }
      atLineStart = false;
      continue;
    }

    const c = src[i];

    if (c === '\n') {
      if (depth === 0) { push('NEWLINE', '\n', line, i - lineStart); i++; atLineStart = true; }
      else i++;
      newline();
      continue;
    }
    if (c === ' ') { i++; continue; }
    if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '\\' && src[i + 1] === '\n') { i += 2; newline(); continue; } // 줄 이어쓰기

    // ── 문자열 (f-string · r-string 포함) ──
    // r'...' 은 역슬래시를 그대로 두는 「날 문자열」이다. 정규표현식을 쓸 때 꼭 필요하다.
    const isQuote = (ch) => ch === '"' || ch === "'";
    const fPrefix = (c === 'f' || c === 'F') && isQuote(src[i + 1]);
    const rPrefix = (c === 'r' || c === 'R') && isQuote(src[i + 1]);
    if (c === '"' || c === "'" || fPrefix || rPrefix) {
      const sLine = line, sCol = i - lineStart;
      if (fPrefix || rPrefix) i++;
      const q = src[i];
      const triple = src.slice(i, i + 3) === q.repeat(3);
      i += triple ? 3 : 1;
      let out = '', sawEscape = false;
      const unterminated = () => {
        const e = new PyError('SyntaxError',
          triple ? `unterminated triple-quoted string literal (detected at line ${line})` : `unterminated string literal (detected at line ${sLine})`,
          sLine, '문자열을 연 따옴표와 같은 따옴표로 닫아 주세요.');
        e.col = sCol; e.colEnd = sCol + 1;
        throw e;
      };
      for (;;) {
        if (i >= src.length) unterminated();
        if (!triple && src[i] === '\n') unterminated();
        if (triple && src.slice(i, i + 3) === q.repeat(3)) { i += 3; break; }
        if (!triple && src[i] === q) { i++; break; }
        if (src[i] === '\\') {
          sawEscape = true;
          const e = src[i + 1];
          if (rPrefix) {
            // 날 문자열에서는 \d, \s 처럼 역슬래시를 그대로 남긴다 (따옴표 탈출만 처리)
            out += (e === q ? e : '\\' + e);
            i += 2;
            continue;
          }
          out += e === 'n' ? '\n' : e === 't' ? '\t' : e === '\\' ? '\\'
            : e === "'" ? "'" : e === '"' ? '"' : e === '\n' ? '' : '\\' + e;
          i += 2;
          if (e === '\n') newline();
          continue;
        }
        if (src[i] === '\n') { out += src[i++]; newline(); continue; }
        out += src[i++];
      }
      push(fPrefix ? 'FSTRING' : 'STRING', out, sLine, sCol);
      // f-string 안쪽 식의 자리를 셀 수 있는가 — 한 줄이고 역슬래시가 없으면 글자 자리가 그대로 맞는다
      if (fPrefix) toks[toks.length - 1].innerCol = !sawEscape && sLine === line ? sCol + 1 + (triple ? 3 : 1) : null;
      continue;
    }

    // ── 숫자 ──
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1]))) {
      const sCol = i - lineStart;
      let s = '';
      while (i < src.length && /[0-9_]/.test(src[i])) s += src[i++];
      let float = false;
      if (src[i] === '.' && /[0-9]/.test(src[i + 1] || '')) {
        float = true; s += src[i++];
        while (i < src.length && /[0-9_]/.test(src[i])) s += src[i++];
      } else if (src[i] === '.' && !/[a-zA-Z_]/.test(src[i + 1] || '')) {
        float = true; s += src[i++];
      }
      if (src[i] === 'e' || src[i] === 'E') {
        float = true; s += src[i++];
        if (src[i] === '+' || src[i] === '-') s += src[i++];
        while (i < src.length && /[0-9]/.test(src[i])) s += src[i++];
      }
      // 아주 큰 정수 글자(9999…)는 BigInt 로 — parseFloat 로 읽으면 끝자리가 뭉개진다
      const digits = s.replace(/_/g, '');
      const v = !float && digits.length > 15 ? BigInt(digits) : parseFloat(digits);
      push('NUMBER', { v, float }, line, sCol);
      continue;
    }

    // ── 이름·키워드 (한글 이름도 허용) ──
    if (/[A-Za-z_가-힣ㄱ-ㆎ]/.test(c)) {
      const sCol = i - lineStart;
      let s = '';
      while (i < src.length && /[A-Za-z0-9_가-힣ㄱ-ㆎ]/.test(src[i])) s += src[i++];
      push(KEYWORDS.has(s) ? 'KEY' : 'NAME', s, line, sCol);
      continue;
    }

    // ── 연산자·구두점 ──
    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) {
      const sCol = i - lineStart;
      i += op.length;
      push('OP', op, line, sCol);
      if ('([{'.includes(op)) { depth++; brackets.push(toks[toks.length - 1]); }
      if (')]}'.includes(op)) { depth = Math.max(0, depth - 1); brackets.pop(); }
      continue;
    }

    const e = new PyError('SyntaxError',
      c.charCodeAt(0) > 127 ? `invalid character '${c}' (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})` : 'invalid syntax',
      line, '한글 자판으로 입력된 기호가 섞였는지 확인해 보세요.');
    e.col = i - lineStart; e.colEnd = e.col + 1;
    throw e;
  }

  // 닫히지 않은 괄호 — 진짜 파이썬은 문법을 읽어 가다 「파일 끝」 에 닿았을 때 비로소 알린다.
  // 그 전에 다른 문법 오류를 만나면 그쪽을 먼저 알린다 (예: def f(: 는 invalid syntax).
  // 그래서 여기서는 적어 두기만 하고, 끝에 붙이는 토큰들에 표시를 해 둔다.
  const realEnd = toks.length;
  if (toks.length && toks[toks.length - 1].type !== 'NEWLINE') push('NEWLINE', '\n');
  while (indents.length > 1) { indents.pop(); push('DEDENT', 0); }
  push('EOF', null);
  for (let k = realEnd; k < toks.length; k++) toks[k].synthetic = true;
  if (brackets.length) toks.unclosed = brackets[brackets.length - 1];
  return toks;
}

/* ══════════════════════════════ ② 구문 분석 ═══════════════════════════════ */

/* 블록 종류 → 진짜 파이썬의 「expected an indented block after …」 문구 */
const BLOCK_KIND = {
  def: 'function definition', class: 'class definition', if: "'if' statement", elif: "'elif' statement",
  else: "'else' statement", for: "'for' statement", while: "'while' statement", try: "'try' statement",
  except: "'except' statement", finally: "'finally' statement",
};

class Parser {
  constructor(toks) { this.toks = toks; this.p = 0; this.last = null; }

  peek(n = 0) { return this.toks[this.p + n]; }
  get line() { return this.peek().line; }
  next() { const t = this.toks[this.p++]; this.last = t; return t; }
  at(type, value) {
    const t = this.peek();
    return t.type === type && (value === undefined || t.value === value);
  }
  eat(type, value) { if (this.at(type, value)) { return this.next(); } return null; }
  /** 토큰 하나를 꼭 받아야 할 때. 없으면 진짜 파이썬처럼 SyntaxError 를 낸다.
   *  (한국어 설명은 도움말 말풍선으로 따로 붙는다) */
  expect(type, value, what) {
    if (this.at(type, value)) return this.next();
    const t = this.peek();
    const got = t.type === 'NEWLINE' ? '줄바꿈' : t.type === 'EOF' ? '코드 끝'
      : t.type === 'INDENT' ? '들여쓰기' : t.type === 'DEDENT' ? '내어쓰기' : `'${t.value}'`;
    const hint = `${what || `'${value ?? type}'`} 이(가) 필요한데 ${got} 을(를) 만났습니다.`;
    if (value === ':' && this.last) {
      // 콜론을 빠뜨리면 — 바로 앞 토큰이 끝난 칸에 ^ 하나
      const L = this.last;
      synErr('SyntaxError', "expected ':'", { line: L.endLine, col: L.end, end: L.end + 1 }, hint);
    }
    synErr('SyntaxError', 'invalid syntax', t, hint);
  }
  skipNewlines() { while (this.eat('NEWLINE')) { /* 빈 줄 넘기기 */ } }
  /** 노드에 자리(시작 칸 ~ 방금 읽은 토큰의 끝)를 적는다 */
  mark(node, startCol, startLine) {
    node.col = startCol;
    if (node.line == null) node.line = startLine;
    node.end = this.last.end;
    node.endLine = this.last.endLine;
    return node;
  }

  parseProgram() {
    const body = [];
    this.skipNewlines();
    while (!this.at('EOF')) {
      body.push(...this.statement());
      this.skipNewlines();
    }
    return { type: 'Module', body };
  }

  /** ':' 다음의 블록. 여러 줄이거나 한 줄로 붙여 쓴 형태 모두 받는다. */
  block(what, kind, headLine) {
    this.expect('OP', ':', `'${what}' 뒤의 콜론(:)`);
    if (this.eat('NEWLINE')) {
      this.skipNewlines();
      if (!this.at('INDENT')) {
        const t = this.peek();
        const e = new PyError('IndentationError', `expected an indented block after ${BLOCK_KIND[kind] || "'" + kind + "' statement"} on line ${headLine}`,
          t.line, `${what} 다음 줄은 스페이스 4칸으로 들여 써야 합니다.`);
        e.col = t.type === 'EOF' ? null : t.col; e.colEnd = e.col == null ? null : e.col + 1;
        if (t.type === 'EOF') e.line = this.toks[this.p - 1] ? this.toks[this.p - 1].line + 1 : t.line;
        throw e;
      }
      this.next();
      const body = [];
      this.skipNewlines();
      while (!this.at('DEDENT') && !this.at('EOF')) {
        body.push(...this.statement());
        this.skipNewlines();
      }
      this.eat('DEDENT');
      return body;
    }
    return this.simpleLine(); // 예) if x : print(x)
  }

  /** 세미콜론으로 이어 쓴 한 줄 */
  simpleLine() {
    const out = [this.simpleStatement()];
    while (this.eat('OP', ';')) {
      if (this.at('NEWLINE')) break;
      out.push(this.simpleStatement());
    }
    if (!this.at('NEWLINE') && !this.at('EOF')) {
      // pip install gtts 처럼 낱말을 그냥 이어 쓰면 — 둘째 낱말 아래에 밑줄
      synErr('SyntaxError', 'invalid syntax', this.peek(), '한 줄에 문장 하나만 씁니다. 낱말과 낱말 사이에 연산자나 쉼표가 빠졌는지 확인해 보세요.');
    }
    this.eat('NEWLINE');
    return out;
  }

  /* 교안 범위를 넘는 문법들 — 그냥 SyntaxError 를 내면 학생이 원인을 못 찾으므로
   * 무엇이 지원되지 않는지 이름을 대어 알려 준다. */
  checkUnsupported() {
    const t = this.peek();
    if (t.type !== 'NAME') return;
    const guide = {
      assert: '단정문(assert)', with: 'with 문',
      yield: 'yield', nonlocal: 'nonlocal 선언', async: 'async 문법', await: 'await 문법',
    }[t.value];
    if (!guide) return;
    const nx = this.peek(1);
    if (nx && nx.type === 'OP' && ['=', '(', '.', '[', ')', ','].includes(nx.value)) return; // 그 이름을 변수로 쓴 경우
    // 조사를 붙이면 어색해지므로 줄표로 잇는다
    err('지원하지 않는 문법', `${guide} — 이 앱에서는 쓸 수 없습니다`, t.line,
      'if · for · while · def · import 로 바꿔 써 보세요.');
  }

  statement() {
    if (this.at('INDENT')) {
      // 블록이 시작되지 않았는데 들여 썼다 — 진짜 파이썬도 밑줄 없이 이렇게만 알린다
      const t = this.peek();
      const e = new PyError('IndentationError', 'unexpected indent', t.line,
        '앞 줄이 콜론(:)으로 끝나지 않았는데 들여 썼습니다. 맨 앞의 빈칸을 지우세요.');
      e.noCaret = true;
      throw e;
    }
    this.checkUnsupported();
    const t = this.peek();
    if (t.type === 'KEY') {
      switch (t.value) {
        case 'class': return [this.classDef()];
        case 'def': return [this.funcDef()];
        case 'if': return [this.ifStmt()];
        case 'while': return [this.whileStmt()];
        case 'for': return [this.forStmt()];
        case 'try': return [this.tryStmt()];
        case 'except': case 'finally':
          synErr('SyntaxError', 'invalid syntax', t,
            `${t.value} 앞에 짝이 되는 try 가 없습니다. ${t.value} 는 try 블록 바로 뒤에, try 와 같은 들여쓰기로 써야 합니다.`);
          break;
        case 'else': case 'elif':
          synErr('SyntaxError', 'invalid syntax', t,
            `${t.value} 앞에 짝이 되는 if 가 없습니다. 들여쓰기가 짝과 같은지 확인해 보세요.`);
          break;
      }
    }
    return this.simpleLine();
  }

  /* try 문 — try 블록 하나 + except 여러 개 + else + finally */
  tryStmt() {
    const line = this.line;
    this.next(); // try
    const body = this.block('try', 'try', line);
    const handlers = [];
    let orelse = [], finalbody = [], hasFinally = false;
    this.skipNewlines();
    while (this.at('KEY', 'except')) {
      const hl = this.line;
      this.next();
      let typeExpr = null, name = null;
      if (!this.at('OP', ':')) {
        typeExpr = this.expr();
        if (this.at('OP', ',')) {
          err('SyntaxError', 'multiple exception types must be parenthesized', hl,
            '여러 예외를 한꺼번에 잡을 때는 괄호로 묶어야 합니다. 예) except (ValueError, TypeError):');
        }
        if (this.eat('KEY', 'as')) name = this.expect('NAME', undefined, "'as' 뒤의 이름").value;
      }
      const prev = handlers[handlers.length - 1];
      if (prev && !prev.typeExpr) {
        err('SyntaxError', "default 'except:' must be last", prev.line,
          '종류를 적지 않은 except: 는 모든 예외를 잡으므로 맨 마지막에만 올 수 있습니다.');
      }
      const hb = this.block('except', 'except', hl);
      handlers.push({ typeExpr, name, body: hb, line: hl });
      this.skipNewlines();
    }
    if (this.at('KEY', 'else')) {
      const el = this.line;
      if (!handlers.length) synErr('SyntaxError', 'invalid syntax', this.peek(), 'try 뒤에 except 없이 else 를 쓸 수 없습니다.');
      this.next();
      orelse = this.block('else', 'else', el);
      this.skipNewlines();
    }
    if (this.at('KEY', 'finally')) {
      const fl = this.line;
      this.next();
      hasFinally = true;
      finalbody = this.block('finally', 'finally', fl);
    }
    if (!handlers.length && !hasFinally) {
      synErr('SyntaxError', "expected 'except' or 'finally' block", this.peek(),
        'try 블록 바로 아래에, try 와 같은 들여쓰기로 except 종류: 를 써 주세요.');
    }
    return { type: 'Try', body, handlers, orelse, finalbody, line };
  }

  classDef() {
    const line = this.line;
    this.next(); // class
    const name = this.expect('NAME', undefined, '클래스 이름').value;

    /* 상속은 수업 범위 밖이라 예외 클래스만 받는다. class Foo(object) : 는 그냥 통과시킨다. */
    if (this.eat('OP', '(')) {
      const bases = [];
      let d = 1;
      while (d > 0 && !this.at('EOF')) {
        const x = this.next();
        if (x.type === 'OP' && x.value === '(') d++;
        else if (x.type === 'OP' && x.value === ')') d--;
        else if (x.type === 'NAME' && d === 1) bases.push(x.value);
      }
      const real = bases.filter((b) => b !== 'object');
      if (real.length === 1) {
        const body = this.block(`class ${name}`, 'class', line);
        return { type: 'ClassDef', name, body, line, base: real[0] };
      }
      if (real.length) {
        err('지원하지 않는 문법', `class ${name}(${real.join(', ')}) — 이 앱은 예외 클래스만 물려받을 수 있습니다`, line,
          `나만의 예외를 만들려면 class ${name}(Exception): 처럼 예외 클래스를 물려받으세요.`);
      }
    }

    const body = this.block(`class ${name}`, 'class', line);
    return { type: 'ClassDef', name, body, line };
  }

  funcDef() {
    const line = this.line;
    this.next(); // def
    const nt = this.peek();
    if (nt.type !== 'NAME' && nt.type !== 'KEY') this.expect('NAME', undefined, '함수 이름');
    const name = this.next().value;
    this.expect('OP', '(', `'def ${name}' 뒤의 여는 괄호`);
    const params = [];
    if (!this.at('OP', ')')) {
      do {
        if (this.at('OP', ')')) break;
        if (this.eat('OP', '*')) { this.eat('OP', '*'); this.expect('NAME'); continue; } // *args 무시
        const pn = this.expect('NAME', undefined, '매개변수 이름').value;
        let def = null;
        if (this.eat('OP', '=')) def = this.expr();
        params.push({ name: pn, def });
      } while (this.eat('OP', ','));
    }
    this.expect('OP', ')', '닫는 괄호');
    if (this.eat('OP', '->')) this.expr(); // 반환 자료형 표시는 무시
    const body = this.block(`def ${name}`, 'def', line);
    return { type: 'FuncDef', name, params, body, line };
  }

  ifStmt() {
    const line = this.line;
    const kw = this.next().value; // if 또는 elif
    const test = this.expr();
    const body = this.block(kw, kw, line);
    let orelse = [];
    this.skipNewlines();
    if (this.at('KEY', 'elif')) orelse = [this.ifStmt()];
    else if (this.at('KEY', 'else')) { const el = this.line; this.next(); orelse = this.block('else', 'else', el); }
    return { type: 'If', test, body, orelse, line };
  }

  whileStmt() {
    const line = this.line;
    this.next();
    const test = this.expr();
    const body = this.block('while', 'while', line);
    return { type: 'While', test, body, line };
  }

  forStmt() {
    const line = this.line;
    this.next();
    const targets = [this.expect('NAME', undefined, '반복 변수 이름').value];
    while (this.eat('OP', ',')) targets.push(this.expect('NAME').value);
    this.expect('KEY', 'in', "'in'");
    const iter = this.expr();
    const body = this.block('for', 'for', line);
    return { type: 'For', targets, iter, body, line };
  }

  /* ── import 문 ─────────────────────────────────────────────────────────
   *   import 모듈                 import 패키지.모듈            import 모듈 as 별명
   *   from 모듈 import 이름       from 패키지 import 모듈       from 패키지.모듈 import 이름
   *   from 모듈 import *          from . import 모듈 (점은 「지금 패키지」)
   * 모듈 이름은 파이썬 「이름」 이어야 한다 — 그래서 my-calc 처럼 붙임표를 쓴 파일은 불러올 수 없다. */
  dottedName(what) {
    const first = this.peek();
    if (first.type !== 'NAME') {
      synErr('SyntaxError', 'invalid syntax', first,
        `${what} 자리에는 이름이 와야 합니다. 따옴표·숫자·기호로 시작할 수 없습니다.`);
    }
    let name = this.next().value;
    while (this.at('OP', '.')) {
      this.next();
      const t = this.peek();
      if (t.type !== 'NAME') synErr('SyntaxError', 'invalid syntax', t, '점(.) 뒤에는 모듈 이름이 와야 합니다.');
      name += '.' + this.next().value;
    }
    return name;
  }
  /** import … / from … import … 뒤에 올 수 있는 것은 쉼표·as·줄 끝뿐이다 */
  afterImportName() {
    const t = this.peek();
    if (t.type === 'NEWLINE' || t.type === 'EOF' || (t.type === 'OP' && (t.value === ',' || t.value === ';' || t.value === ')')) || (t.type === 'KEY' && t.value === 'as')) return;
    synErr('SyntaxError', 'invalid syntax', t,
      t.type === 'OP' && t.value === '-'
        ? '모듈 이름에는 붙임표(-)를 쓸 수 없습니다. 파일 이름을 밑줄(_)로 바꿔 주세요. 예) my_calc.py'
        : t.type === 'OP' && t.value === '/'
          ? '폴더와 모듈 사이는 / 가 아니라 점(.)으로 잇습니다. 예) import mypackage.module1'
          : '모듈 이름 뒤에 쓸 수 없는 것이 왔습니다.');
  }
  importStmt() {
    const line = this.line, col = this.peek().col;
    this.next(); // import
    const names = [];
    do {
      const name = this.dottedName('import 뒤의 모듈 이름');
      this.afterImportName();
      let asname = null;
      if (this.eat('KEY', 'as')) asname = this.expect('NAME', undefined, "'as' 뒤의 별명").value;
      names.push({ name, asname });
    } while (this.eat('OP', ','));
    return this.mark({ type: 'Import', names, line }, col, line);
  }
  fromStmt() {
    const line = this.line, col = this.peek().col;
    this.next(); // from
    let level = 0;
    while (this.at('OP', '.') || this.at('OP', '...')) level += this.next().value.length;
    let mod = '';
    if (!this.at('KEY', 'import')) {
      mod = this.dottedName('from 뒤의 모듈 이름');
      const t = this.peek();
      if (!(t.type === 'KEY' && t.value === 'import')) {
        synErr('SyntaxError', 'invalid syntax', t,
          t.type === 'OP' && t.value === '-' ? '모듈 이름에는 붙임표(-)를 쓸 수 없습니다. 파일 이름을 밑줄(_)로 바꿔 주세요.'
            : "from 모듈 이름 다음에는 import 가 와야 합니다.");
      }
    } else if (!level) {
      synErr('SyntaxError', 'invalid syntax', this.peek(), 'from 뒤에 모듈 이름이 빠졌습니다.');
    }
    this.expect('KEY', 'import', "'import'");
    const names = [];
    if (this.eat('OP', '*')) names.push('*');
    else {
      const paren = !!this.eat('OP', '(');
      do {
        if (paren && this.at('OP', ')')) break;
        const t = this.peek();
        if (t.type !== 'NAME') synErr('SyntaxError', 'invalid syntax', t, 'import 뒤에는 가져올 이름이 와야 합니다.');
        const name = this.next().value;
        this.afterImportName();
        let asname = null;
        if (this.eat('KEY', 'as')) asname = this.expect('NAME', undefined, "'as' 뒤의 별명").value;
        names.push({ name, asname });
      } while (this.eat('OP', ','));
      if (paren) this.expect('OP', ')', '닫는 괄호');
    }
    return this.mark({ type: 'FromImport', level, mod, names, line }, col, line);
  }

  simpleStatement() {
    const line = this.line;
    const t = this.peek();

    if (t.type === 'KEY') {
      if (t.value === 'pass') { this.next(); return { type: 'Pass', line }; }
      if (t.value === 'break') { this.next(); return { type: 'Break', line }; }
      if (t.value === 'continue') { this.next(); return { type: 'Continue', line }; }
      if (t.value === 'global' || t.value === 'del') { // 수업 범위 밖 — 조용히 넘긴다
        while (!this.at('NEWLINE') && !this.at('EOF')) this.next();
        return { type: 'Pass', line };
      }
      if (t.value === 'raise') {
        this.next();
        const exc = this.at('NEWLINE') || this.at('EOF') || this.at('OP', ';') ? null : this.expr();
        if (exc && this.eat('KEY', 'from')) this.expr(); // raise … from … 의 뒷부분은 무시
        return { type: 'Raise', exc, line };
      }
      if (t.value === 'return') {
        this.next();
        const value = this.at('NEWLINE') || this.at('EOF') || this.at('OP', ';') ? null : this.expr();
        return { type: 'Return', value, line };
      }
      if (t.value === 'import') return this.importStmt();
      if (t.value === 'from') return this.fromStmt();
    }

    const first = this.expr();
    const aug = ['+=', '-=', '*=', '/=', '//=', '%=', '**='];
    for (const a of aug) {
      if (this.at('OP', a)) {
        this.next();
        return { type: 'AugAssign', target: first, op: a.slice(0, -1), value: this.expr(), line };
      }
    }
    if (this.at('OP', '=')) {
      const targets = [first];
      let value = null;
      while (this.eat('OP', '=')) {
        const e = this.expr();
        if (this.at('OP', '=')) targets.push(e); else value = e;
      }
      for (const tg of targets) {
        if (!['Name', 'Attribute', 'Subscript'].includes(tg.type)) {
          err('SyntaxError', 'cannot assign to expression here', line,
            '= 왼쪽에는 변수 이름이나 self.속성명 같은 것만 올 수 있습니다.');
        }
      }
      return { type: 'Assign', targets, value, line };
    }
    return { type: 'Expr', value: first, line };
  }

  /* ── 식(expression) 파싱: 우선순위가 낮은 것부터 ──
   * 식마다 자리(col ~ end)를 적어 둔다. 오류가 나면 그 자리 아래에 ^^^ 를 긋는다. */
  expr() { return this.orTest(); }

  binNode(type, op, l, r, opTok) {
    const n = { type, op, l, r, line: l.line, col: outCol(l), end: outEnd(r), endLine: outEndLine(r) };
    if (type === 'Bin' && opTok && opTok.line === l.line && outEndLine(r) === l.line) {
      // ~~^~~ — 연산자 자리에 ^, 나머지는 ~
      n.anchors = { left: opTok.col - n.col, right: opTok.col - n.col + opTok.value.length };
    }
    return n;
  }
  orTest() {
    let n = this.andTest();
    while (this.at('KEY', 'or')) { const o = this.next(); n = this.binNode('Bool', 'or', n, this.andTest(), o); }
    return n;
  }
  andTest() {
    let n = this.notTest();
    while (this.at('KEY', 'and')) { const o = this.next(); n = this.binNode('Bool', 'and', n, this.notTest(), o); }
    return n;
  }
  notTest() {
    if (this.at('KEY', 'not')) {
      const t = this.next();
      const v = this.notTest();
      return { type: 'Not', v, line: t.line, col: t.col, end: outEnd(v), endLine: outEndLine(v) };
    }
    return this.comparison();
  }
  comparison() {
    const line = this.line;
    let left = this.arith();
    const ops = [];
    for (;;) {
      let op = null;
      for (const o of ['==', '!=', '<=', '>=', '<', '>']) if (this.at('OP', o)) { op = o; this.next(); break; }
      if (!op && this.at('KEY', 'in')) { op = 'in'; this.next(); }
      if (!op && this.at('KEY', 'not') && this.peek(1).type === 'KEY' && this.peek(1).value === 'in') { op = 'not in'; this.next(); this.next(); }
      if (!op && this.at('KEY', 'is')) {
        this.next();
        op = this.eat('KEY', 'not') ? 'is not' : 'is';
      }
      if (!op) break;
      ops.push({ op, right: this.arith() });
    }
    if (!ops.length) return left;
    const r = ops[ops.length - 1].right;
    return { type: 'Compare', left, ops, line, col: outCol(left), end: outEnd(r), endLine: outEndLine(r) };
  }
  arith() {
    let n = this.term();
    for (;;) {
      if (this.at('OP', '+') || this.at('OP', '-')) { const o = this.next(); n = this.binNode('Bin', o.value, n, this.term(), o); }
      else break;
    }
    return n;
  }
  term() {
    let n = this.factor();
    for (;;) {
      let o = null;
      for (const op of ['*', '//', '/', '%']) if (this.at('OP', op)) { o = this.next(); break; }
      if (!o) break;
      n = this.binNode('Bin', o.value, n, this.factor(), o);
    }
    return n;
  }
  factor() {
    if (this.at('OP', '-')) {
      const t = this.next();
      const v = this.factor();
      return { type: 'Unary', op: '-', v, line: t.line, col: t.col, end: outEnd(v), endLine: outEndLine(v) };
    }
    if (this.at('OP', '+')) { this.next(); return this.factor(); }
    return this.power();
  }
  power() {
    const base = this.atomExpr();
    if (this.at('OP', '**')) { const o = this.next(); return this.binNode('Bin', '**', base, this.factor(), o); }
    return base;
  }

  atomExpr() {
    let n = this.atom();
    for (;;) {
      const line = n.line;
      const sc = outCol(n);
      if (this.at('OP', '(')) {
        this.next();
        const args = [];
        if (!this.at('OP', ')')) {
          do {
            if (this.at('OP', ')')) break; // 뒤에 붙은 쉼표
            // 키워드 인수 예) print(x, end='')
            let a;
            if ((this.at('NAME')) && this.peek(1).type === 'OP' && this.peek(1).value === '='
                && !(this.peek(2).type === 'OP' && this.peek(2).value === '=')) {
              const kw = this.next().value; this.next();
              a = { kw, value: this.expr() };
            } else a = { kw: null, value: this.expr() };
            args.push(a);
            const nt = this.peek();
            if (nt.type === 'NAME' || nt.type === 'NUMBER' || nt.type === 'STRING' || nt.type === 'FSTRING') {
              // print("합계" 합) — 쉼표를 빠뜨렸다
              const e = new PyError('SyntaxError', 'invalid syntax. Perhaps you forgot a comma?', a.value.line,
                '괄호 안의 값과 값 사이에는 쉼표(,)가 있어야 합니다.');
              e.col = outCol(a.value); e.colEnd = nt.end;
              throw e;
            }
          } while (this.eat('OP', ','));
        }
        this.expect('OP', ')', '닫는 괄호');
        n = this.mark({ type: 'Call', func: n, args, line }, sc);
      } else if (this.at('OP', '.')) {
        this.next();
        const nt = this.peek();
        if (nt.type !== 'NAME' && nt.type !== 'KEY') this.expect('NAME', undefined, '점(.) 뒤의 이름');
        const attr = this.next().value;
        n = this.mark({ type: 'Attribute', obj: n, attr, line }, sc);
      } else if (this.at('OP', '[')) {
        const lb = this.next();
        // 잘라내기(슬라이스) 지원 — 글[2:5], 글[:5], 글[2:]
        const start = this.at('OP', ':') ? null : this.expr();
        let node;
        if (this.at('OP', ':')) {
          this.next();
          const end = this.at('OP', ']') ? null : this.expr();
          this.expect('OP', ']', '닫는 대괄호');
          node = { type: 'Slice', obj: n, start, end, line };
        } else {
          this.expect('OP', ']', '닫는 대괄호');
          node = { type: 'Subscript', obj: n, index: start, line };
        }
        this.mark(node, sc);
        if (lb.line === node.line && this.last.line === node.line) {
          // ~~~^^^ — 대괄호 부분에 ^
          node.anchors = { left: lb.col - sc, right: this.last.end - sc };
        }
        n = node;
      } else break;
    }
    return n;
  }

  atom() {
    const t = this.peek();
    const line = t.line;
    const tok = (node) => Object.assign(node, { col: t.col, end: t.end, endLine: t.endLine });
    if (t.type === 'NUMBER') { this.next(); return tok({ type: 'Num', v: t.value.v, float: t.value.float, line }); }
    if (t.type === 'STRING') {
      this.next();
      let s = t.value;
      while (this.at('STRING')) s += this.next().value; // 붙여 쓴 문자열
      return this.mark({ type: 'Str', v: s, line }, t.col);
    }
    if (t.type === 'FSTRING') { this.next(); return tok(parseFString(t.value, line, t.innerCol)); }
    if (t.type === 'NAME') {
      if (t.value === 'lambda') {
        err('지원하지 않는 문법', '이 앱은 lambda 를 지원하지 않습니다', line,
          'def 로 함수를 정의해 주세요.');
      }
      this.next();
      return tok({ type: 'Name', id: t.value, line });
    }
    if (t.type === 'KEY') {
      if (t.value === 'True') { this.next(); return tok({ type: 'Const', v: BOOL(true), line }); }
      if (t.value === 'False') { this.next(); return tok({ type: 'Const', v: BOOL(false), line }); }
      if (t.value === 'None') { this.next(); return tok({ type: 'Const', v: NONE, line }); }
    }
    if (t.type === 'OP' && t.value === '(') {
      this.next();
      if (this.eat('OP', ')')) return this.mark({ type: 'ListLit', items: [], tuple: true, line }, t.col);
      const e = this.expr();
      if (this.at('OP', ',')) {
        const items = [e];
        while (this.eat('OP', ',')) { if (this.at('OP', ')')) break; items.push(this.expr()); }
        this.expect('OP', ')', '닫는 괄호');
        return this.mark({ type: 'ListLit', items, tuple: true, line }, t.col);
      }
      this.expect('OP', ')', '닫는 괄호');
      // (a + b) — 식의 자리는 괄호 안쪽 그대로, 괄호까지 넣은 바깥 자리는 따로 적어 둔다
      e.pcol = t.col; e.pend = this.last.end; e.pendLine = this.last.endLine;
      return e;
    }
    if (t.type === 'OP' && t.value === '[') {
      this.next();
      if (this.at('OP', ']')) { this.next(); return this.mark({ type: 'ListLit', items: [], line }, t.col); }
      const first = this.expr();
      // 리스트 컴프리헨션 — [토큰 for 토큰 in 토큰들 if 조건]
      if (this.at('KEY', 'for')) {
        this.next();
        const targets = [this.expect('NAME', undefined, '변수 이름').value];
        while (this.eat('OP', ',')) targets.push(this.expect('NAME', undefined, '변수 이름').value);
        this.expect('KEY', 'in', "'in'");
        const iter = this.expr();
        let cond = null;
        if (this.eat('KEY', 'if')) cond = this.expr();
        this.expect('OP', ']', '닫는 대괄호');
        return this.mark({ type: 'ListComp', elt: first, targets, iter, cond, line }, t.col);
      }
      const items = [first];
      while (this.eat('OP', ',')) { if (this.at('OP', ']')) break; items.push(this.expr()); }
      this.expect('OP', ']', '닫는 대괄호');
      return this.mark({ type: 'ListLit', items, line }, t.col);
    }
    if (t.type === 'OP' && t.value === '{') {
      this.next();
      const pairs = [];
      if (!this.at('OP', '}')) {
        do {
          if (this.at('OP', '}')) break;
          const k = this.expr();
          this.expect('OP', ':', '딕셔너리의 콜론(:)');
          pairs.push([k, this.expr()]);
        } while (this.eat('OP', ','));
      }
      this.expect('OP', '}', '닫는 중괄호');
      return this.mark({ type: 'DictLit', pairs, line }, t.col);
    }
    const got = t.type === 'NEWLINE' ? '줄바꿈' : t.type === 'EOF' ? '코드 끝' : `'${t.value}'`;
    synErr('SyntaxError', 'invalid syntax', t, `값이 올 자리에 ${got} 이(가) 있습니다.`);
  }
}

/** 노드에 적힌 자리를 지운다 — f-string 안쪽 식은 자리가 문자열 기준이라 밑줄이 엉뚱한 곳에 그어지므로 */
function stripPos(n) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) { n.forEach(stripPos); return; }
  delete n.col; delete n.end; delete n.endLine; delete n.anchors; delete n.pcol; delete n.pend; delete n.pendLine;
  for (const v of Object.values(n)) if (v && typeof v === 'object' && !(v.k)) stripPos(v);
}

/** f'점수: {score}점' → '점수: ' + str(score) + '점' 으로 바꿔 준다.
 *  innerCol — 그 줄에서 f-string 의 글자가 시작하는 칸. 알 수 있으면 안쪽 식에도 자리를 적는다
 *  (파이썬 3.12 부터 f-string 안의 오류에도 정확한 밑줄이 그어진다). */
function parseFString(raw, line, innerCol = null) {
  const parts = [];
  let buf = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '{' && raw[i + 1] === '{') { buf += '{'; i++; continue; }
    if (c === '}' && raw[i + 1] === '}') { buf += '}'; i++; continue; }
    if (c === '{') {
      if (buf) { parts.push({ type: 'Str', v: buf, line }); buf = ''; }
      let d = 1, code = '';
      i++;
      const codeStart = i;
      while (i < raw.length && d > 0) {
        if (raw[i] === '{') d++;
        if (raw[i] === '}') { d--; if (!d) break; }
        code += raw[i++];
      }
      const cut = code.search(/[:!](?![=])/);
      let spec = '';
      if (cut > 0) { spec = code.slice(cut); code = code.slice(0, cut); }
      const ts = tokenize(code);
      // 안쪽 식의 토큰을 바깥 줄의 진짜 자리로 옮긴다
      for (const tk of ts) { tk.line = line; tk.endLine = line; if (innerCol != null) { tk.col += innerCol + codeStart; tk.end += innerCol + codeStart; } }
      const inner = new Parser(ts).parseProgram();
      const e = inner.body[0] && inner.body[0].type === 'Expr' ? inner.body[0].value : { type: 'Str', v: '', line };
      if (innerCol == null) stripPos(e);
      // 줄 번호를 바깥 줄로 맞춘다
      const relabel = (n) => { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) { n.forEach(relabel); return; } if (n.line != null) n.line = line; if (n.endLine != null) n.endLine = line; for (const v of Object.values(n)) if (v && typeof v === 'object' && !v.k) relabel(v); };
      relabel(e);
      const m = /^:\.(\d+)f$/.exec(spec);
      parts.push(m
        ? { type: 'Call', func: { type: 'Name', id: '__fmt_fixed', line }, args: [{ kw: null, value: e }, { kw: null, value: { type: 'Num', v: Number(m[1]), float: false, line } }], line }
        : { type: 'Call', func: { type: 'Name', id: 'str', line }, args: [{ kw: null, value: e }], line });
      continue;
    }
    buf += c;
  }
  if (buf) parts.push({ type: 'Str', v: buf, line });
  if (!parts.length) return { type: 'Str', v: '', line };
  return parts.reduce((l, r) => ({ type: 'Bin', op: '+', l, r, line }));
}

/** 소스 → 문법 나무. 조건 점검기(checker.js)도 이 나무를 읽는다. */
export function parse(src) {
  const toks = tokenize(src);
  try {
    return new Parser(toks).parseProgram();
  } catch (e) {
    const b = toks.unclosed;
    if (b && e instanceof PyError && (!e.atTok || e.atTok.synthetic)) {
      const x = new PyError('SyntaxError', `'${b.value}' was never closed`, b.line, '연 괄호를 닫는 괄호로 짝을 맞춰 주세요.');
      x.col = b.col; x.colEnd = b.end;
      throw x;
    }
    throw e;
  }
}

/* ══════════════════════════════ ③ 실행 ════════════════════════════════════ */

const RETURN = Symbol('return');
const BREAK = Symbol('break');
const CONTINUE = Symbol('continue');
class Signal { constructor(kind, value) { this.kind = kind; this.value = value; } }

/** 비공개 속성 이름 맹글링: 클래스 Car 안의 __speed → _Car__speed */
function mangle(name, clsName) {
  if (!clsName) return name;
  if (!name.startsWith('__')) return name;
  if (name.endsWith('__')) return name; // __init__, __str__ 는 그대로
  return `_${clsName}${name}`;
}
/** 화면에 보여 줄 때는 _Car__speed 를 다시 __speed 로 되돌린다. */
export function unmangle(name) {
  return name.replace(/^_[A-Za-z_가-힣][A-Za-z0-9_가-힣]*__/, '__');
}

/** 파이썬처럼 실수는 5.0, 정수는 5 로 보이게 만든다. */
function numText(x) {
  if (x.k === 'int') return String(x.v);
  if (!isFinite(x.v)) return x.v > 0 ? 'inf' : (Number.isNaN(x.v) ? 'nan' : '-inf');
  if (Number.isInteger(x.v) && Math.abs(x.v) < 1e16) return `${x.v}.0`;
  const s = String(x.v);
  return s.includes('e') ? s : s;
}

export class Interp {
  constructor(opts = {}) {
    this.out = [];              // 출력이 끝난 줄 모음
    this.buf = '';              // 아직 줄바꿈을 만나지 않은 조각 (end='' 대응)
    this.globals = new Map();
    this.instances = [];        // 만들어진 인스턴스 (상자 그림용)
    this.trace = [];            // 메소드 호출 기록
    this.frames = [];           // 호출 중인 메소드 스택 (속성 변화 기록용)
    this.inputs = (opts.inputs || []).slice();
    this.echo = !!opts.echo;    // input( ) 에 넣은 값을 콘솔처럼 화면에 함께 찍는다
    this.inputFn = opts.inputFn || null; // (질문, 몇 번째) → 넣을 값
    this.inputCount = 0;
    // 가상 폴더 — { 'main.py': '…', 'mytools/calc.py': '…' } · 빈 폴더는 dirs 에
    this.files = opts.files || {};
    this.dirs = new Set(opts.dirs || []);
    for (const p of Object.keys(this.files)) { const parts = p.split('/'); for (let k = 1; k < parts.length; k++) this.dirs.add(parts.slice(0, k).join('/')); }
    this.installed = new Set(opts.installed || []); // pip 로 설치한 외부 라이브러리 (흉내)
    this.onWrite = opts.onWrite || null;           // 프로그램이 파일을 만들 때 (gtts 의 save)
    this.root = opts.root || 'C:\\project';        // 화면에 보일 프로젝트 폴더 경로
    this.sysModules = new Map();  // 이미 불러온 모듈 — 두 번째 import 는 여기서 꺼내기만 한다
    this.events = [];             // 불러오기 기록 — [{kind:'load'|'cache', name, file}]
    this.calls = [];              // 내가 만든 함수가 불린 기록 — [{file, name}]
    this.G = this.globals;        // 지금 실행 중인 코드의 전역 이름표 (모듈마다 따로)
    this.curFile = null;          // 지금 실행 중인 파일
    this.curMod = null;           // 지금 실행 중인 모듈 객체
    this.caught = [];           // except 가 잡아낸 기록 — [{type, msg, line, at}]
    this.ran = new Set();       // 실행된 줄 번호 (실행되지 못한 줄을 흐리게 보이려고)
    this.excStack = [];         // 지금 처리 중인 예외 (except 안의 raise 가 다시 던질 것)
    this.excTypes = new Map();  // 예외 클래스 객체 — 이름으로 찾는다
    for (const name of Object.keys(EXC_PARENT)) {
      this.excTypes.set(name, { k: 'exctype', name, parent: EXC_PARENT[name] ? this.excTypes.get(EXC_PARENT[name]) : null, user: false });
    }
    this.steps = 0;
    this.maxSteps = opts.maxSteps || 400000;
    this.nextId = 1;
    this.depth = 0;
  }

  write(s) {
    this.out.push(s);
    if (this.out.length > 3000) fatal('RuntimeError', '출력이 너무 많습니다 (3000줄 초과)', 0,
      '반복문이 끝나지 않는지 확인해 보세요.');
  }
  /** 글자를 출력 흐름에 흘려 보낸다. 줄바꿈을 만날 때마다 한 줄이 완성된다. */
  emit(s) {
    this.buf += s;
    let at;
    while ((at = this.buf.indexOf('\n')) >= 0) {
      this.write(this.buf.slice(0, at));
      this.buf = this.buf.slice(at + 1);
    }
  }
  /** 마지막에 남은 조각도 한 줄로 마무리한다. */
  flush() {
    if (this.buf !== '') { this.out.push(this.buf); this.buf = ''; }
  }
  tick(line) {
    if (++this.steps > this.maxSteps) {
      fatal('RuntimeError', '실행이 너무 오래 걸려 멈췄습니다', line,
        'while 문의 조건이 언제 거짓이 되는지 확인해 보세요. (무한 반복 의심)');
    }
  }

  /* ── 값 → 글자 ── */
  str(x, line) {
    switch (x.k) {
      case 'int': case 'float': return numText(x);
      case 'str': return x.v;
      case 'bool': return x.v ? 'True' : 'False';
      case 'none': return 'None';
      case 'list': return `[${x.v.map((e) => this.repr(e, line)).join(', ')}]`;
      case 'tuple': return `(${x.v.map((e) => this.repr(e, line)).join(', ')}${x.v.length === 1 ? ',' : ''})`;
      // 딕셔너리의 키는 원시값(문자열·숫자)으로 저장되므로 파이썬 값으로 되돌려 찍는다
      case 'dict': return `{${[...x.v.entries()].map(([k, v]) => `${this.repr(wrapKey(k), line)}: ${this.repr(v, line)}`).join(', ')}}`;
      case 'class': return `<class '${x.mod || '__main__'}.${x.name}'>`;
      case 'typeobj': return `<class '${x.name}'>`;
      case 'func': return `<function ${x.name} at 0x${(0x1f3a2c0 + (x.line || 1) * 0x40).toString(16).padStart(16, '0').toUpperCase()}>`;
      case 'bound': case 'builtin': return x.k === 'builtin' ? `<built-in function ${x.name}>` : `<bound method ${x.name}>`;
      case 'module': return moduleRepr(x);
      case 'opaque': return x.s;
      case 'file': return `<_io.TextIOWrapper name='${x.name}' mode='r' encoding='UTF-8'>`;
      case 'exctype': return x.user ? `<class '__main__.${x.name}'>` : `<class '${x.name}'>`;
      case 'exc': {
        // str(e) — 값이 하나면 그 값, KeyError 만은 따옴표를 붙여(repr) 보인다
        if (!x.args.length) return '';
        if (x.args.length === 1) return x.cls.name === 'KeyError' || this.isSub(x.cls, 'KeyError') ? this.repr(x.args[0], line) : this.str(x.args[0], line);
        return `(${x.args.map((a) => this.repr(a, line)).join(', ')})`;
      }
      case 'obj': {
        const m = this.findMethod(x.cls, '__str__');
        if (m) {
          const r = this.callFunc(m, [x], line);
          if (r.k !== 'str') {
            err('TypeError', `__str__ 이 문자열이 아니라 ${this.typeName(r)} 을(를) 돌려주었습니다`, line,
              '__str__ 메소드는 반드시 문자열을 return 해야 합니다. 숫자는 str( ) 로 감싸 주세요.');
          }
          return r.v;
        }
        return `<${x.cls.mod || '__main__'}.${x.cls.name} object at 0x${(0x1a2b000 + x.id * 0x30).toString(16).padStart(16, '0').toUpperCase()}>`;
      }
      default: return String(x.v);
    }
  }
  repr(x, line) {
    if (x.k === 'str') {
      // 진짜 파이썬처럼 — 역슬래시·줄바꿈·탭은 \\ \n \t 로, 작은따옴표가 있고 큰따옴표가 없으면 큰따옴표로 감싼다
      const body = x.v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      return x.v.includes("'") && !x.v.includes('"') ? `"${body}"` : `'${body.replace(/'/g, "\\'")}'`;
    }
    if (x.k === 'exc') return `${x.cls.name}(${x.args.map((a) => this.repr(a, line)).join(', ')})`;
    return this.str(x, line);
  }
  /** cls 가 target(이름 또는 예외 클래스)과 같거나 그 자손인가 — 예외의 족보 따라 올라가기 */
  isSub(cls, target) {
    for (let c = cls; c; c = c.parent) {
      if (typeof target === 'string' ? (!c.user && c.name === target) : c === target) return true;
    }
    return false;
  }
  /** 해석기 안에서 난 오류(PyError)를 파이썬 예외 객체로 바꾼다 */
  excValue(e) {
    if (e.exc) return e.exc;
    const cls = this.excTypes.get(e.type) || this.excTypes.get('Exception');
    e.exc = { k: 'exc', cls, args: e.args || [STR(e.message)] };
    return e.exc;
  }
  typeName(x) {
    return { int: 'int', float: 'float', str: 'str', bool: 'bool', none: 'NoneType', list: 'list',
      tuple: 'tuple', dict: 'dict', class: 'type', exctype: 'type', builtin: 'builtin_function_or_method',
      func: 'function', file: 'TextIOWrapper', module: 'module', bound: 'method', opaque: 'object',
      obj: x.k === 'obj' ? x.cls.name : 'object', exc: x.k === 'exc' ? x.cls.name : '' }[x.k] || x.k;
  }
  truthy(x) {
    switch (x.k) {
      case 'none': return false;
      case 'bool': return x.v;
      case 'int': case 'float': return x.v !== 0;
      case 'str': return x.v.length > 0;
      case 'list': case 'tuple': return x.v.length > 0;
      case 'dict': return x.v.size > 0;
      default: return true;
    }
  }

  /* ── 프로그램 실행 ── */
  run(src) {
    const ast = parse(src);
    this.execBlock(ast.body, this.globals, null);
    return this.result();
  }

  result() {
    this.flush();
    // 전역 변수 이름을 인스턴스에 붙여 준다 (상자 그림의 이름표)
    for (const inst of this.instances) inst.names = [];
    for (const [name, val] of this.globals) {
      if (val && val.k === 'obj') val.names.push(name);
    }
    return {
      output: this.out.join('\n'),
      lines: this.out.slice(),
      instances: this.instances.map((o) => ({
        id: o.id,
        cls: o.cls.name,
        names: o.names.slice(),
        attrs: [...o.attrs.entries()].map(([k, v]) => ({
          name: unmangle(k),
          private: unmangle(k) !== k || k.startsWith('__'),
          value: this.str(v, 0),
        })),
        methods: [...o.cls.methods.keys()],
      })),
      trace: this.trace,
    };
  }

  execBlock(body, env, clsName) {
    for (const st of body) {
      const sig = this.exec(st, env, clsName);
      if (sig) return sig;
    }
    return null;
  }

  exec(st, env, clsName) {
    this.tick(st.line);
    this.ran.add(st.line);
    switch (st.type) {
      case 'Expr': this.eval(st.value, env, clsName); return null;
      case 'Pass': return null;
      case 'Break': return new Signal(BREAK);
      case 'Continue': return new Signal(CONTINUE);
      case 'Return': return new Signal(RETURN, st.value ? this.eval(st.value, env, clsName) : NONE);

      case 'Assign': {
        const v = this.eval(st.value, env, clsName);
        for (const t of st.targets) this.assign(t, v, env, clsName);
        return null;
      }
      case 'AugAssign': {
        const cur = this.eval(st.target, env, clsName);
        const v = this.binop(st.op, cur, this.eval(st.value, env, clsName), st.line);
        this.assign(st.target, v, env, clsName);
        return null;
      }

      case 'If': {
        if (this.truthy(this.eval(st.test, env, clsName))) return this.execBlock(st.body, env, clsName);
        return this.execBlock(st.orelse, env, clsName);
      }
      case 'While': {
        while (this.truthy(this.eval(st.test, env, clsName))) {
          this.tick(st.line);
          const sig = this.execBlock(st.body, env, clsName);
          if (sig) {
            if (sig.kind === BREAK) break;
            if (sig.kind === CONTINUE) continue;
            return sig;
          }
        }
        return null;
      }
      case 'For': {
        const it = this.iterate(this.eval(st.iter, env, clsName), st.line);
        for (const item of it) {
          this.tick(st.line);
          if (st.targets.length === 1) env.set(st.targets[0], item);
          else {
            const parts = item.k === 'list' || item.k === 'tuple' ? item.v : [item];
            st.targets.forEach((n, i) => env.set(n, parts[i] ?? NONE));
          }
          const sig = this.execBlock(st.body, env, clsName);
          if (sig) {
            if (sig.kind === BREAK) break;
            if (sig.kind === CONTINUE) continue;
            return sig;
          }
        }
        return null;
      }

      case 'FuncDef': {
        // 함수는 「자기가 태어난 모듈」의 전역 이름표를 기억한다 — calc.add( ) 안에서 쓰는 이름은 calc.py 에서 찾는다
        env.set(st.name, { k: 'func', name: st.name, params: st.params, body: st.body, env, clsName, line: st.line,
          g: this.G, file: this.curFile, mod: this.curMod ? this.curMod.name : '__main__' });
        return null;
      }
      case 'ClassDef': {
        if (st.base) return this.defineException(st, env, clsName);
        const methods = new Map();
        const classEnv = new Map();
        const modName = this.curMod ? this.curMod.name : '__main__';
        for (const m of st.body) {
          if (m.type === 'FuncDef') {
            methods.set(m.name, { k: 'func', name: m.name, params: m.params, body: m.body, env: classEnv, clsName: st.name, line: m.line,
              g: this.G, file: this.curFile, mod: modName });
          } else if (m.type === 'Assign') {
            // 클래스 변수는 수업 범위 밖이지만 오류를 내지 않고 담아 둔다
            this.exec(m, classEnv, st.name);
          }
        }
        env.set(st.name, { k: 'class', name: st.name, methods, classEnv, line: st.line, mod: modName });
        return null;
      }

      /* import 모듈 · import 패키지.모듈 · import 모듈 as 별명
       *   import a.b.c 는 a → a.b → a.b.c 를 차례로 불러오고, 이름표에는 맨 앞 a 만 붙인다.
       *   as 를 쓰면 맨 끝 a.b.c 에 별명을 붙인다. */
      case 'Import': {
        for (const al of st.names) {
          const m = this.importModule(al.name, st);
          if (al.asname) env.set(al.asname, m);
          else env.set(al.name.split('.')[0], this.sysModules.get(al.name.split('.')[0]));
        }
        return null;
      }
      /* from 모듈 import 이름 — 모듈 안의 이름을 꺼내 내 이름표에 바로 붙인다.
       *   이름이 모듈 안에 없고, 모듈이 패키지라면 「그 이름의 하위 모듈」을 찾아 불러온다
       *   (from mypackage import module1 이 되는 까닭). */
      case 'FromImport': {
        const full = this.resolveRelative(st);
        const m = this.importModule(full, st);
        if (st.names.includes('*')) {
          const all = m.members.get('__all__');
          const listed = all && (all.k === 'list' || all.k === 'tuple');
          const keys = listed ? all.v.map((x) => x.v) : [...m.members.keys()].filter((k) => !k.startsWith('_'));
          // 패키지의 __all__ 에 적힌 이름이 아직 없으면 그 이름의 하위 모듈을 불러온다
          // (진짜 파이썬의 _handle_fromlist — __init__.py 에 __all__ = ['milk', …] 를 적으면 * 로 모듈이 따라오는 까닭)
          if (listed && m.isPkg) {
            for (const k of keys) {
              if (m.members.has(k)) continue;
              const sub = `${full}.${k}`;
              try { this.importModule(sub, st, false); } catch (e) {
                if (!(e instanceof PyError && e.type === 'ModuleNotFoundError' && e.missingName === sub)) throw e;
              }
            }
          }
          for (const k of keys) if (m.members.has(k)) env.set(k, m.members.get(k));
          return null;
        }
        for (const al of st.names) {
          let v = m.members.get(al.name);
          if (v === undefined && m.isPkg) {
            const sub = `${full}.${al.name}`;
            try {
              v = this.importModule(sub, st, false);
            } catch (e) {
              // 하위 모듈 파일 자체가 없으면 → 「cannot import name」 으로 바꿔 알린다 (진짜 파이썬과 같다)
              if (!(e instanceof PyError && e.type === 'ModuleNotFoundError' && e.missingName === sub)) throw e;
              v = undefined;
            }
          }
          if (v === undefined) {
            const where = m.disk || 'unknown location';
            const e = new PyError('ImportError', `cannot import name '${al.name}' from '${full}' (${where})`, st.line, '', null);
            e.wrongName = al.name;
            e.candidates = dirOf(m);
            e.importFrom = { mod: full, name: al.name, isPkg: !!m.isPkg, file: m.file };
            throw e;
          }
          env.set(al.asname || al.name, v);
        }
        return null;
      }
      case 'Try': return this.execTry(st, env, clsName);
      case 'Raise': return this.execRaise(st, env, clsName);
      default: err('SyntaxError', `아직 지원하지 않는 문장입니다 (${st.type})`, st.line);
    }
  }

  /* ── try 문 실행 ─────────────────────────────────────────────────────
   * ① try 블록을 실행한다.
   * ② 예외가 나면 except 들을 위에서부터 보며 「종류가 맞는」 첫 번째 것 하나만 실행한다.
   *    맞는 것이 없으면 예외는 그대로 바깥으로 날아간다(= 프로그램이 멈춘다).
   * ③ 예외가 안 났으면 else 를 실행한다.
   * ④ 무슨 일이 있었든 finally 를 마지막에 실행한다. */
  execTry(st, env, clsName) {
    let sig = null;
    try {
      let raised = false;
      try {
        sig = this.execBlock(st.body, env, clsName);
      } catch (e) {
        if (!(e instanceof PyError) || e.fatal || e.type === 'SyntaxError') throw e;
        raised = true;
        const exc = this.excValue(e);
        let handler = null;
        for (const h of st.handlers) {
          if (this.handles(h, exc, env, clsName)) { handler = h; break; }
        }
        if (!handler) throw e; // 맞는 except 가 없다 → 바깥으로
        this.ran.add(handler.line);
        this.caught.push({ type: exc.cls.name, msg: this.str(exc, handler.line), line: e.line, at: handler.line });
        if (handler.name) env.set(handler.name, exc);
        this.excStack.push(e);
        try {
          sig = this.execBlock(handler.body, env, clsName);
        } finally {
          this.excStack.pop();
          if (handler.name) env.delete(handler.name); // 파이썬도 except 가 끝나면 e 를 지운다
        }
      }
      if (!raised && !sig && st.orelse.length) sig = this.execBlock(st.orelse, env, clsName);
    } finally {
      if (st.finalbody.length) {
        const fsig = this.execBlock(st.finalbody, env, clsName);
        if (fsig) return fsig; // finally 안의 return 은 모든 것을 덮는다 (파이썬과 같다)
      }
    }
    return sig;
  }

  /** 이 except 가 이 예외를 잡는가? */
  handles(h, exc, env, clsName) {
    if (!h.typeExpr) return true; // except: — 무엇이든 잡는다
    // ⚠ 종류 이름은 예외가 났을 때 비로소 계산된다. 그래서 except valueError: 같은 오타는
    //   평소에는 조용하다가 예외가 날 때 NameError 로 터진다. (진짜 파이썬도 그렇다)
    const t = this.eval(h.typeExpr, env, clsName);
    const list = t.k === 'tuple' ? t.v : [t];
    for (const c of list) {
      if (c.k !== 'exctype') {
        err('TypeError', 'catching classes that do not inherit from BaseException is not allowed', h.line,
          'except 뒤에는 ValueError 같은 예외 이름을 써야 합니다.');
      }
    }
    return list.some((c) => this.isSub(exc.cls, c));
  }

  /* raise — 예외를 직접 일으킨다. 「고장」을 내가 정한 규칙으로 알리는 방법이다. */
  execRaise(st, env, clsName) {
    if (!st.exc) {
      const cur = this.excStack[this.excStack.length - 1];
      if (!cur) err('RuntimeError', 'No active exception to reraise', st.line, 'raise 만 홀로 쓰는 것은 except 블록 안에서만 됩니다.');
      throw cur; // 처리하던 예외를 그대로 다시 던진다
    }
    let v = this.eval(st.exc, env, clsName);
    if (v.k === 'exctype') v = { k: 'exc', cls: v, args: [] };
    if (v.k !== 'exc') {
      err('TypeError', 'exceptions must derive from BaseException', st.line,
        'raise 뒤에는 ValueError("돈은 0원보다 커야 해요") 처럼 예외를 써야 합니다.');
    }
    const e = new PyError(v.cls.name, this.str(v, st.line), st.line, '', v.args);
    e.exc = v;
    e.raised = true;
    throw e;
  }

  /* class 품절(Exception): pass — 나만의 예외 */
  defineException(st, env, clsName) {
    const base = this.eval({ type: 'Name', id: st.base, line: st.line }, env, clsName);
    if (base.k !== 'exctype') {
      err('지원하지 않는 문법', `class ${st.name}(${st.base}) — 이 앱은 예외 클래스만 물려받을 수 있습니다`, st.line,
        `나만의 예외를 만들려면 class ${st.name}(Exception): 처럼 예외 클래스를 물려받으세요.`);
    }
    for (const m of st.body) {
      const ok = m.type === 'Pass' || (m.type === 'Expr' && m.value.type === 'Str');
      if (!ok) {
        err('지원하지 않는 문법', '이 앱에서 나만의 예외 클래스 안에는 pass 만 쓸 수 있습니다', m.line,
          'class 품절에러(Exception):\n    pass  처럼 만들고, 메시지는 raise 품절에러("…") 로 넘기세요.');
      }
    }
    env.set(st.name, { k: 'exctype', name: st.name, parent: base, user: true, line: st.line });
    return null;
  }

  assign(target, value, env, clsName) {
    if (target.type === 'Name') { env.set(target.id, value); return; }
    if (target.type === 'Attribute') {
      const obj = this.eval(target.obj, env, clsName);
      const real = mangle(target.attr, clsName);
      if (obj.k !== 'obj') {
        err('AttributeError', `${this.typeName(obj)} 에는 속성을 새로 만들 수 없습니다`, target.line,
          '속성은 클래스로 만든 인스턴스(객체)에만 붙일 수 있습니다.');
      }
      // 메소드 호출 기록에 "무엇이 어떻게 바뀌었는지" 남긴다
      const frame = this.frames[this.frames.length - 1];
      if (frame && frame.self === obj) {
        const before = obj.attrs.has(real) ? this.str(obj.attrs.get(real), target.line) : '(없음)';
        frame.changes.push({ attr: unmangle(real), before, after: this.str(value, target.line) });
      }
      obj.attrs.set(real, value);
      return;
    }
    if (target.type === 'Subscript') {
      const obj = this.eval(target.obj, env, clsName);
      const idx = this.eval(target.index, env, clsName);
      if (obj.k === 'list') {
        let i = this.intOf(idx, target.line);
        if (i < 0) i += obj.v.length;
        if (i < 0 || i >= obj.v.length) err('IndexError', 'list assignment index out of range', target.line);
        obj.v[i] = value;
        return;
      }
      if (obj.k === 'dict') { obj.v.set(this.key(idx, target.line), value); return; }
      err('TypeError', `${this.typeName(obj)} 에는 [ ] 로 값을 넣을 수 없습니다`, target.line);
    }
  }

  /* ── 식 계산 ── */
  eval(e, env, clsName) {
    this.tick(e.line);
    switch (e.type) {
      case 'Num': return e.float ? FLT(e.v) : INT(e.v);
      case 'Str': return STR(e.v);
      case 'Const': return e.v;
      case 'ListComp': {
        // [바꿀값 for 변수 in 무엇 if 조건] — 일반 for 문과 결과가 똑같다.
        const src = this.iterate(this.eval(e.iter, env, clsName), e.line);
        const out = [];
        for (const item of src) {
          this.tick(e.line);
          if (e.targets.length === 1) env.set(e.targets[0], item);
          else {
            const parts = item.k === 'list' || item.k === 'tuple' ? item.v : [item];
            e.targets.forEach((n, i) => env.set(n, parts[i] ?? NONE));
          }
          if (e.cond && !this.truthy(this.eval(e.cond, env, clsName))) continue;
          out.push(this.eval(e.elt, env, clsName));
        }
        return LIST(out);
      }
      case 'ListLit': {
        const items = e.items.map((x) => this.eval(x, env, clsName));
        return e.tuple ? { k: 'tuple', v: items } : LIST(items);
      }
      case 'DictLit': {
        const m = new Map();
        for (const [k, v] of e.pairs) m.set(this.key(this.eval(k, env, clsName), e.line), this.eval(v, env, clsName));
        return DICT(m);
      }
      case 'Name': {
        // 이름 찾는 차례 — ① 함수 안의 이름 ② 이 모듈(파일)의 전역 이름 ③ 내장 이름(print·len…)
        // ⚠ 다른 파일(모듈)의 이름은 여기서 찾지 않는다. 그래서 import calc 만 하고 add( ) 를 부르면 NameError.
        if (env.has(e.id)) return env.get(e.id);
        if (this.G.has(e.id)) return this.G.get(e.id);
        if (this.excTypes.has(e.id)) return this.excTypes.get(e.id);
        const b = this.builtin(e.id);
        if (b) return b;
        const selfObj = env.get('self');
        const extra = {
          wrongName: e.id,
          // 진짜 파이썬처럼 세 번 나눠 찾는다 — ① 이 함수의 지역 이름 ② 이 모듈의 전역 이름 ③ 내장 이름
          candidates: [env !== this.G ? (env.varnames || [...env.keys()]) : [], [...this.G.keys()], PYINFO.builtins],
          selfHint: selfObj && selfObj.k === 'obj' && (selfObj.attrs.has(e.id) || selfObj.cls.methods.has(e.id)) ? `self.${e.id}` : null,
          forgotImport: PYINFO.stdlib.includes(e.id),
        };
        errAt('NameError', `name '${e.id}' is not defined`, e, nameHint(e.id), null, extra);
      }
      case 'Not': return BOOL(!this.truthy(this.eval(e.v, env, clsName)));
      case 'Bool': {
        const l = this.eval(e.l, env, clsName);
        if (e.op === 'and') return this.truthy(l) ? this.eval(e.r, env, clsName) : l;
        return this.truthy(l) ? l : this.eval(e.r, env, clsName);
      }
      case 'Unary': {
        const v = this.eval(e.v, env, clsName);
        if (!isNum(v)) errAt('TypeError', `bad operand type for unary -: '${this.typeName(v)}'`, e, '글자 앞에는 - 를 붙일 수 없습니다.');
        return v.k === 'int' ? INT(-v.v) : FLT(-v.v);
      }
      case 'Bin': {
        const a = this.eval(e.l, env, clsName), b = this.eval(e.r, env, clsName);
        try { return this.binop(e.op, a, b, e.line); } catch (x) { throw this.here(x, e); }
      }
      case 'Compare': {
        let left = this.eval(e.left, env, clsName);
        for (const { op, right } of e.ops) {
          const r = this.eval(right, env, clsName);
          let ok;
          try { ok = this.compare(op, left, r, e.line); } catch (x) { throw this.here(x, e); }
          if (!ok) return BOOL(false);
          left = r;
        }
        return BOOL(true);
      }
      case 'Slice': {
        const obj = this.eval(e.obj, env, clsName);
        const len = obj.k === 'str' ? [...obj.v].length
          : (obj.k === 'list' || obj.k === 'tuple') ? obj.v.length : -1;
        if (len < 0) err('TypeError', `${this.typeName(obj)} 은(는) 잘라낼 수 없습니다`, e.line, '문자열과 리스트만 [a:b] 로 자를 수 있습니다.');
        const norm = (node, dflt) => {
          if (!node) return dflt;
          let i = this.intOf(this.eval(node, env, clsName), e.line);
          if (i < 0) i += len;
          return Math.max(0, Math.min(len, i));
        };
        const a = norm(e.start, 0);
        const b = norm(e.end, len);
        if (obj.k === 'str') return STR([...obj.v].slice(a, b).join(''));
        const cut = obj.v.slice(a, b);
        return obj.k === 'tuple' ? { k: 'tuple', v: cut } : LIST(cut);
      }
      case 'Subscript': {
        const obj = this.eval(e.obj, env, clsName);
        const idx = this.eval(e.index, env, clsName);
        try { return this.subscript(obj, idx, e); } catch (x) { throw this.here(x, e); }
      }
      case 'Attribute': {
        const obj = this.eval(e.obj, env, clsName);
        try { return this.getAttr(obj, e.attr, e.line, clsName); } catch (x) { throw this.here(x, e); }
      }
      case 'Call': return this.evalCall(e, env, clsName);
      default: err('SyntaxError', `아직 지원하지 않는 식입니다 (${e.type})`, e.line);
    }
  }

  /** 이 식(node)을 계산하다 난 오류라면 — 밑줄을 그을 자리를 이 식으로 정해 둔다.
   *  (더 안쪽에서 이미 자리를 정했으면 그대로 둔다) */
  here(x, node) {
    if (x instanceof PyError && !x.fatal && x.curPos == null && x.cur === node.line && !x.posLocked) x.curPos = spanOf(node);
    return x;
  }

  /** 리스트[자리] · 딕셔너리[키] · 문자열[자리] */
  subscript(obj, idx, e) {
    {
      {
        if (obj.k === 'str' || obj.k === 'list' || obj.k === 'tuple') {
          const kind = obj.k === 'str' ? 'string' : obj.k;
          if (idx.k !== 'int' && idx.k !== 'bool') {
            err('TypeError', `${kind} indices must be integers${obj.k === 'str' ? '' : ' or slices'}, not ${this.typeName(idx)}`, e.line,
              '[ ] 안의 자리 번호는 정수여야 합니다. 글자를 정수형으로 바꾸려면 int( ) 를 쓰세요.');
          }
          if (isBig(idx.v) && (idx.v > 9223372036854775807n || idx.v < -9223372036854775808n)) {
            err('IndexError', "cannot fit 'int' into an index-sized integer", e.line, '자리 번호가 너무 커서 컴퓨터가 자리로 바꿀 수조차 없습니다.');
          }
          let i = Number(idx.k === 'bool' ? (idx.v ? 1 : 0) : idx.v);
          const len = obj.v.length;
          if (i < 0) i += len;
          if (i < 0 || i >= len) err('IndexError', `${kind} index out of range`, e.line, `자리 번호는 0 부터 ${len - 1} 까지(뒤에서 세면 -1 부터 -${len} 까지)만 있습니다.`);
          return obj.k === 'str' ? STR(obj.v[i]) : obj.v[i];
        }
        if (obj.k === 'dict') {
          const key = this.key(idx, e.line);
          if (!obj.v.has(key)) err('KeyError', this.repr(idx, e.line), e.line, `딕셔너리에 ${this.repr(idx, e.line)} 라는 키가 없습니다. 대소문자와 띄어쓰기까지 똑같아야 합니다.`, [idx]);
          return obj.v.get(key);
        }
        err('TypeError', `'${this.typeName(obj)}' object is not subscriptable`, e.line, '[ ] 는 리스트·문자열·딕셔너리에만 쓸 수 있습니다.');
      }
    }
  }

  /* ── 속성 읽기: 여기서 정보 은닉이 살아난다 ── */
  getAttr(obj, attr, line, clsName) {
    const real = mangle(attr, clsName);

    if (obj.k === 'obj') {
      if (obj.attrs.has(real)) return obj.attrs.get(real);
      const m = this.findMethod(obj.cls, real) || this.findMethod(obj.cls, attr);
      if (m) return { k: 'bound', name: attr, self: obj, func: m };
      if (obj.cls.classEnv && obj.cls.classEnv.has(real)) return obj.cls.classEnv.get(real);

      // __로 시작하는 이름을 클래스 밖에서 쓴 경우 → 바로 이 지점이 '정보 은닉'
      const hidden = attr.startsWith('__') && !attr.endsWith('__') && !clsName;
      const bare = attr.replace(/^__/, '');
      const getter = `get${bare.charAt(0).toUpperCase()}${bare.slice(1)}`;
      err('AttributeError', `'${obj.cls.name}' object has no attribute '${attr}'`, line,
        hidden
          ? `${attr} 는 비공개 속성입니다. 클래스 밖에서는 이렇게 꺼낼 수 없으니 ${getter}( ) 같은 접근자 메소드를 만들어 쓰세요.`
          : `${obj.cls.name} 클래스에 '${attr}' 속성이나 메소드가 있는지 확인해 보세요.`);
    }
    if (obj.k === 'class') {
      if (obj.methods.has(attr)) return obj.methods.get(attr);
      if (obj.classEnv && obj.classEnv.has(attr)) return obj.classEnv.get(attr);
      err('AttributeError', `type object '${obj.name}' has no attribute '${attr}'`, line);
    }
    if (obj.k === 'exc') {
      if (attr === 'args') return { k: 'tuple', v: obj.args.slice() };
      if (attr === '__class__') return obj.cls;
      err('AttributeError', `'${obj.cls.name}' object has no attribute '${attr}'`, line,
        '예외 객체에서는 str(e) 로 메시지를, type(e).__name__ 으로 종류 이름을 꺼낼 수 있습니다.');
    }
    if (obj.k === 'exctype' || obj.k === 'typeobj') {
      if (attr === '__name__') return STR(obj.name.replace(/^__main__\./, ''));
      err('AttributeError', `type object '${obj.name}' has no attribute '${attr}'`, line);
    }
    if (obj.k === 'module') {
      if (obj.members.has(attr)) return obj.members.get(attr);
      // 진짜 파이썬에는 있는데 이 앱이 아직 흉내 내지 못한 기능 (예: math.gcd)
      if (obj.realDir && obj.realDir.includes(attr)) {
        err('지원하지 않는 기능', `${obj.name}.${attr} — 진짜 파이썬에는 있지만 이 앱에서는 쓸 수 없습니다`, line,
          `이 앱의 ${obj.name} 모듈에는 ${[...obj.members.keys()].filter((k) => !k.startsWith('_')).join(', ')} 만 들어 있습니다.`);
      }
      const e = new PyError('AttributeError', `module '${obj.name}' has no attribute '${attr}'`, line, '');
      e.wrongName = attr;
      e.candidates = dirOf(obj);
      e.attrOf = { mod: obj.name, attr, isPkg: !!obj.isPkg, file: obj.file, kind: obj.kind };
      throw e;
    }
    const m = this.dataMethod(obj, attr, line);
    if (m) return m;
    const e = new PyError('AttributeError', `'${this.typeName(obj)}' object has no attribute '${attr}'`, line);
    e.wrongName = attr;
    e.candidates = PYINFO.dir[this.typeName(obj)] || null;
    throw e;
  }

  findMethod(cls, name) { return cls.methods.get(name) || null; }

  /* ── 호출 ── */
  evalCall(e, env, clsName) {
    // 진짜 파이썬처럼 「부를 것」을 먼저 찾고, 그다음 괄호 안의 값을 계산한다
    const callee = this.eval(e.func, env, clsName);
    const args = [];
    const kwargs = new Map();
    for (const a of e.args) {
      const v = this.eval(a.value, env, clsName);
      if (a.kw) kwargs.set(a.kw, v); else args.push(v);
    }
    try {
      return this.callValue(callee, args, kwargs, e.line, e);
    } catch (x) {
      // 부른 함수 안에서 났거나(호출 줄로 올라옴) 부르는 순간 난 오류 — 밑줄은 이 호출식 전체에
      if (x instanceof PyError && !x.fatal && x.curPos == null && x.cur === e.line) x.curPos = spanOf(e);
      throw x;
    }
  }

  callValue(callee, args, kwargs, line, node) {
    switch (callee.k) {
      case 'builtin': return callee.fn(args, kwargs, line);
      case 'bound': {
        if (callee.func.k === 'builtin') return callee.func.fn(args, kwargs, line);
        return this.callFunc(callee.func, [callee.self, ...args], line, kwargs);
      }
      case 'func': return this.callFunc(callee, args, line, kwargs);
      case 'class': return this.instantiate(callee, args, kwargs, line);
      case 'exctype': return { k: 'exc', cls: callee, args };
      default:
        err('TypeError', `'${this.typeName(callee)}' object is not callable`, line,
          node && node.func && node.func.type === 'Attribute'
            ? `'${node.func.attr}' 이(가) 메소드가 아니라 속성일 수 있습니다. 괄호를 빼 보세요.`
            : '함수·메소드·클래스 이름이 맞는지 확인해 보세요.');
    }
  }

  instantiate(cls, args, kwargs, line) {
    const inst = { k: 'obj', cls, attrs: new Map(), id: this.nextId++, names: [] };
    this.instances.push(inst);
    if (this.instances.length > 200) err('RuntimeError', '인스턴스를 너무 많이 만들었습니다 (200개 초과)', line);
    const init = this.findMethod(cls, '__init__');
    if (init) this.callFunc(init, [inst, ...args], line, kwargs, `${cls.name}()`);
    else if (args.length) {
      err('TypeError', `${cls.name}() 는 값을 받지 않습니다`, line,
        `값을 받고 싶다면 def __init__(self, 매개변수) : 형태로 생성자를 만들어야 합니다.`);
    }
    return inst;
  }

  callFunc(fn, args, line, kwargs, label) {
    if (fn.k === 'builtin') return fn.fn(args, kwargs, line);
    if (++this.depth > 60) { this.depth--; err('RecursionError', 'maximum recursion depth exceeded', line, '함수가 자기 자신을 끝없이 부르고 있습니다.'); }

    const env = new Map();
    // 이 함수의 지역 이름 목록 (매개변수 + 함수 안에서 값을 넣는 이름) — 「Did you mean」 의 첫 후보
    env.varnames = fn.varnames || (fn.varnames = localNames(fn));
    const ps = fn.params;
    const self = ps.length && ps[0].name === 'self' && args[0] && args[0].k === 'obj' ? args[0] : null;

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (i < args.length) { env.set(p.name, args[i]); continue; }
      if (kwargs && kwargs.has(p.name)) { env.set(p.name, kwargs.get(p.name)); continue; }
      if (p.def) { env.set(p.name, this.eval(p.def, env, fn.clsName)); continue; }
      this.depth--;
      const need = ps.filter((q) => !q.def).length;
      const miss = ps.slice(i).filter((q) => !q.def && !(kwargs && kwargs.has(q.name))).map((q) => `'${q.name}'`);
      const missText = miss.length <= 2 ? miss.join(' and ') : `${miss.slice(0, -1).join(', ')}, and ${miss[miss.length - 1]}`;
      err('TypeError', `${label || qualName(fn)}() missing ${miss.length} required positional argument${miss.length > 1 ? 's' : ''}: ${missText}`, line,
        ps[0] && ps[0].name === 'self'
          ? `self 는 자동으로 넘어갑니다. def ${fn.name}(${ps.map((q) => q.name).join(', ')}) 이므로 괄호 안에 ${Math.max(0, need - 1)}개를 넣어 주세요.`
          : `def ${fn.name}(${ps.map((q) => q.name).join(', ')}) 의 매개변수 개수와 맞춰 주세요.`);
    }
    if (args.length > ps.length) {
      this.depth--;
      const given = args.length;
      err('TypeError', `${label || qualName(fn)}() takes ${ps.length} positional argument${ps.length === 1 ? '' : 's'} but ${given} ${given === 1 ? 'was' : 'were'} given`, line,
        'def 줄의 매개변수 개수를 확인해 보세요.');
    }

    // 메소드 호출 기록 (인스턴스 메소드일 때만)
    let frame = null;
    if (self) {
      frame = {
        self,
        cls: fn.clsName || self.cls.name,
        method: fn.name,
        args: args.slice(1).map((a) => this.repr(a, line)),
        changes: [],
        returned: null,
      };
      this.frames.push(frame);
    }

    // 함수가 태어난 모듈로 잠깐 건너간다 — 그 안에서 쓰는 이름은 그 모듈(파일)의 것이다
    const saved = [this.G, this.curFile, this.curMod];
    if (fn.g) { this.G = fn.g; this.curFile = fn.file; this.curMod = this.modOfFile(fn.file); }
    if (this.calls.length < 2000) this.calls.push({ file: fn.file, name: fn.name, cls: fn.clsName || null });

    let ret = NONE;
    try {
      const sig = this.execBlock(fn.body, env, fn.clsName);
      if (sig && sig.kind === RETURN) ret = sig.value;
    } catch (e) {
      // Traceback 한 칸: 이 함수 안의 어느 줄에서 났는지 적고, 부른 자리로 올라간다
      if (e instanceof PyError && !e.fatal) {
        e.tb.unshift({ file: fn.file, where: fn.name, line: e.cur, pos: e.curPos });
        e.cur = line;
        e.curPos = null;
      }
      throw e;
    } finally {
      [this.G, this.curFile, this.curMod] = saved;
      this.depth--;
      if (frame) {
        this.frames.pop();
        frame.returned = ret.k === 'none' ? null : this.repr(ret, line);
        if (this.trace.length < 200) this.trace.push(frame);
      }
    }
    return ret;
  }

  /* ── 연산 ── */
  binop(op, a, b, line) {
    if (op === '+') {
      if (a.k === 'str' && b.k === 'str') return STR(a.v + b.v);
      if (a.k === 'list' && b.k === 'list') return LIST([...a.v, ...b.v]);
      if (a.k === 'str') {
        err('TypeError', `can only concatenate str (not "${this.typeName(b)}") to str`, line,
          `글자와 숫자는 + 로 이을 수 없습니다. 숫자를 글자에 붙이려면 str( ) 로 감싸 주세요.`);
      }
    }
    if (a.k === 'bool') a = INT(a.v ? 1 : 0);
    if (b.k === 'bool') b = INT(b.v ? 1 : 0);
    if (a.k === 'int' && b.k === 'int' && (isBig(a.v) || isBig(b.v) || ['+', '-', '*', '**'].includes(op))) {
      const r = this.bigArith(op, a.v, b.v, line);
      if (r) return r;
    }
    if (isNum(a) && isNum(b)) {
      const x = Number(a.v), y = Number(b.v);
      const bothInt = a.k === 'int' && b.k === 'int';
      switch (op) {
        case '+': return bothInt ? INT(x + y) : FLT(x + y);
        case '-': return bothInt ? INT(x - y) : FLT(x - y);
        case '*': return bothInt ? INT(x * y) : FLT(x * y);
        case '/':
          if (y === 0) err('ZeroDivisionError', 'division by zero', line, '0으로는 나눌 수 없습니다.');
          return FLT(x / y); // 파이썬의 / 는 언제나 실수
        case '//':
          if (y === 0) err('ZeroDivisionError', 'integer division or modulo by zero', line, '0으로는 나눌 수 없습니다.');
          return bothInt ? INT(Math.floor(x / y)) : FLT(Math.floor(x / y));
        case '%':
          if (y === 0) err('ZeroDivisionError', bothInt ? 'integer modulo by zero' : 'float modulo', line, '0으로는 나눌 수 없습니다.');
          return bothInt ? INT(((x % y) + y) % y) : FLT(((x % y) + y) % y);
        case '**': {
          const r = Math.pow(x, y);
          return bothInt && y >= 0 ? INT(r) : FLT(r);
        }
      }
    }
    if (op === '*' && ((a.k === 'str' && b.k === 'int') || (a.k === 'int' && b.k === 'str'))) {
      const s = a.k === 'str' ? a.v : b.v, n = a.k === 'int' ? a.v : b.v;
      return STR(n > 0 ? s.repeat(n) : '');
    }
    if (op === '*' && ((a.k === 'list' && b.k === 'int') || (a.k === 'int' && b.k === 'list'))) {
      const l = a.k === 'list' ? a.v : b.v, n = a.k === 'int' ? a.v : b.v;
      const out = [];
      for (let i = 0; i < n; i++) out.push(...l);
      return LIST(out);
    }
    err('TypeError', `unsupported operand type(s) for ${op}: '${this.typeName(a)}' and '${this.typeName(b)}'`, line,
      a.k === 'str' || b.k === 'str'
        ? '글자(str)와 숫자는 서로 계산할 수 없습니다. 둘 중 하나의 자료형이 예상과 다릅니다.'
        : '두 값의 자료형을 확인해 보세요.');
  }

  /** 정수끼리의 계산 — 결과가 커지면 BigInt 로 정확히 셈한다. 처리 못 하면 null. */
  bigArith(op, x, y, line) {
    const anyBig = isBig(x) || isBig(y);
    if (!anyBig && op !== '**') {
      const r = op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : null;
      if (r !== null && Number.isSafeInteger(r)) return INT(r);
    }
    const X = big(x), Y = big(y);
    switch (op) {
      case '+': return INT(X + Y);
      case '-': return INT(X - Y);
      case '*': return INT(X * Y);
      case '**':
        if (Y < 0n) return null;          // 음수 거듭제곱은 실수 → 아래에서
        if (Y > 10000n) return null;
        return INT(X ** Y);
      case '//':
        if (Y === 0n) err('ZeroDivisionError', 'integer division or modulo by zero', line, '0으로는 나눌 수 없습니다.');
        return INT(bigFloorDiv(X, Y));
      case '%':
        if (Y === 0n) err('ZeroDivisionError', 'integer modulo by zero', line, '0으로는 나눌 수 없습니다.');
        return INT(bigMod(X, Y));
      case '/':
        if (Y === 0n) err('ZeroDivisionError', 'division by zero', line, '0으로는 나눌 수 없습니다.');
        return FLT(Number(X) / Number(Y));
      default: return null;
    }
  }

  compare(op, a, b, line) {
    if (op === 'is') return a === b || (a.k === 'none' && b.k === 'none');
    if (op === 'is not') return !(a === b || (a.k === 'none' && b.k === 'none'));
    if (op === 'in' || op === 'not in') {
      let found = false;
      if (b.k === 'str') found = a.k === 'str' && b.v.includes(a.v);
      else if (b.k === 'list' || b.k === 'tuple') found = b.v.some((x) => this.eq(x, a));
      else if (b.k === 'dict') found = b.v.has(this.key(a, line));
      else err('TypeError', `${this.typeName(b)} 안에서는 in 을 쓸 수 없습니다`, line);
      return op === 'in' ? found : !found;
    }
    if (op === '==') return this.eq(a, b);
    if (op === '!=') return !this.eq(a, b);
    if (isNum(a) && isNum(b)) {
      // 보통 숫자와 BigInt 는 크기 비교가 그대로 된다
      switch (op) { case '<': return a.v < b.v; case '<=': return a.v <= b.v; case '>': return a.v > b.v; case '>=': return a.v >= b.v; }
    }
    if (a.k === 'str' && b.k === 'str') {
      switch (op) { case '<': return a.v < b.v; case '<=': return a.v <= b.v; case '>': return a.v > b.v; case '>=': return a.v >= b.v; }
    }
    err('TypeError', `'${op}' not supported between instances of '${this.typeName(a)}' and '${this.typeName(b)}'`, line,
      '숫자끼리 또는 문자열끼리만 크기를 비교할 수 있습니다.');
  }
  eq(a, b) {
    // eslint-disable-next-line eqeqeq
    if (isNum(a) && isNum(b)) return a.v == b.v; // 1n == 1 — BigInt 와 보통 숫자를 함께 견준다
    if (a.k === 'bool' && isNum(b)) return (a.v ? 1 : 0) === b.v;
    if (isNum(a) && b.k === 'bool') return a.v === (b.v ? 1 : 0);
    if (a.k !== b.k) return false;
    if (a.k === 'str' || a.k === 'bool') return a.v === b.v;
    if (a.k === 'none') return true;
    if (a.k === 'list' || a.k === 'tuple') return a.v.length === b.v.length && a.v.every((x, i) => this.eq(x, b.v[i]));
    return a === b;
  }
  key(x, line) {
    if (x.k === 'str' || x.k === 'int' || x.k === 'float' || x.k === 'bool') return x.v;
    err('TypeError', `unhashable type: '${this.typeName(x)}'`, line, '리스트는 딕셔너리의 키로 쓸 수 없습니다.');
  }
  intOf(x, line) {
    if (x.k === 'int' || x.k === 'bool') return x.k === 'bool' ? (x.v ? 1 : 0) : Number(x.v);
    err('TypeError', `'${this.typeName(x)}' object cannot be interpreted as an integer`, line, '여기에는 정수가 와야 합니다.');
  }
  iterate(x, line) {
    if (x.k === 'list' || x.k === 'tuple') return x.v.slice();
    if (x.k === 'str') return [...x.v].map(STR);
    if (x.k === 'dict') return [...x.v.keys()].map((k) => (typeof k === 'string' ? STR(k) : INT(k)));
    err('TypeError', `'${this.typeName(x)}' object is not iterable`, line,
      'range( ), 리스트, 문자열만 for 문에 쓸 수 있습니다.');
  }

  /* ── 내장 함수 ── */
  builtin(name) {
    const self = this;
    const B = (fn) => ({ k: 'builtin', name, fn });
    const need = (args, n, line) => {
      if (args.length < n) err('TypeError', `${name}() 에 넣을 값이 부족합니다`, line);
    };
    switch (name) {
      case 'print': return B((args, kw, line) => {
        const sep = kw && kw.has('sep') ? self.str(kw.get('sep'), line) : ' ';
        const end = kw && kw.has('end') ? self.str(kw.get('end'), line) : '\n';
        self.emit(args.map((a) => self.str(a, line)).join(sep) + end);
        return NONE;
      });
      case 'len': return B((args, kw, line) => {
        need(args, 1, line);
        const x = args[0];
        if (x.k === 'str' || x.k === 'list' || x.k === 'tuple') return INT(x.v.length);
        if (x.k === 'dict') return INT(x.v.size);
        err('TypeError', `object of type '${self.typeName(x)}' has no len()`, line);
      });
      case 'str': return B((args, kw, line) => STR(args.length ? self.str(args[0], line) : ''));
      case 'repr': return B((args, kw, line) => { need(args, 1, line); return STR(self.repr(args[0], line)); });
      // 파일 열기 — 가짜 파일만 읽는다
      case 'open': return B((args, kw, line) => {
        need(args, 1, line);
        const name = args[0];
        const mode = args[1] ? args[1] : (kw && kw.get('mode')) || STR('r');
        if (name.k !== 'str') err('TypeError', `expected str, bytes or os.PathLike object, not ${self.typeName(name)}`, line);
        if (!(mode.k === 'str' && (mode.v === 'r' || mode.v === 'rt'))) {
          err('지원하지 않는 문법', `open( ) 의 '${self.str(mode, line)}' — 이 앱에서는 파일을 읽기('r')로만 열 수 있습니다`, line,
            '수업에서는 open("파일 이름", "r") 처럼 읽기만 합니다.');
        }
        if (!Object.prototype.hasOwnProperty.call(self.files, name.v)) {
          err('FileNotFoundError', `[Errno 2] No such file or directory: ${self.repr(name, line)}`, line,
            `「${name.v}」 라는 파일이 없습니다. 파일 이름(띄어쓰기·확장자까지)을 확인해 보세요.`);
        }
        return { k: 'file', name: name.v, text: String(self.files[name.v]), pos: 0, closed: false };
      });
      case 'int': return B((args, kw, line) => {
        if (!args.length) return INT(0);
        const x = args[0];
        if (x.k === 'int') return x;
        if (x.k === 'float') {
          if (!Number.isFinite(x.v)) {
            if (Number.isNaN(x.v)) err('ValueError', 'cannot convert float NaN to integer', line);
            err('OverflowError', 'cannot convert float infinity to integer', line, '무한대는 정수로 바꿀 수 없습니다.');
          }
          return INT(Math.trunc(x.v));
        }
        if (x.k === 'bool') return INT(x.v ? 1 : 0);
        if (x.k === 'str') {
          // 진짜 파이썬처럼: 앞뒤 공백은 무시, 1_000 의 밑줄 허용, 전각 숫자(１２３)도 숫자로 본다
          const t = x.v.trim().replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xFF10));
          if (!/^[+-]?\d+(_\d+)*$/.test(t)) err('ValueError', `invalid literal for int() with base 10: ${self.repr(x, line)}`, line,
            intHint(x.v));
          return INT(BigInt(t.replace(/_/g, '')));
        }
        err('TypeError', `int() argument must be a string, a bytes-like object or a real number, not '${self.typeName(x)}'`, line);
      });
      case 'float': return B((args, kw, line) => {
        if (!args.length) return FLT(0);
        const x = args[0];
        if (isNum(x)) return FLT(x.v);
        if (x.k === 'bool') return FLT(x.v ? 1 : 0);
        if (x.k === 'str') {
          const t = x.v.trim().replace(/_/g, '');
          const special = { inf: Infinity, '+inf': Infinity, '-inf': -Infinity, infinity: Infinity, '+infinity': Infinity, '-infinity': -Infinity, nan: NaN, '+nan': NaN, '-nan': NaN }[t.toLowerCase()];
          if (special !== undefined) return FLT(special);
          if (t !== '' && /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return FLT(Number(t));
          err('ValueError', `could not convert string to float: ${self.repr(x, line)}`, line, '숫자로 된 글자만 float( ) 로 바꿀 수 있습니다.');
        }
        err('TypeError', `float() argument must be a string or a real number, not '${self.typeName(x)}'`, line);
      });
      case 'bool': return B((args) => BOOL(args.length ? self.truthy(args[0]) : false));
      case 'abs': return B((args, kw, line) => {
        need(args, 1, line);
        const x = args[0];
        if (!isNum(x)) err('TypeError', `bad operand type for abs(): '${self.typeName(x)}'`, line);
        if (x.k === 'int') return INT(isBig(x.v) ? (x.v < 0n ? -x.v : x.v) : Math.abs(x.v));
        return FLT(Math.abs(x.v));
      });
      case 'round': return B((args, kw, line) => {
        need(args, 1, line);
        const x = args[0], d = args[1] ? self.intOf(args[1], line) : 0;
        if (!isNum(x)) err('TypeError', 'round( ) 에는 숫자를 넣어야 합니다', line);
        const f = Math.pow(10, d);
        // 파이썬처럼 .5 는 짝수 쪽으로 (은행가 반올림)
        const scaled = x.v * f;
        let r = Math.round(scaled);
        if (Math.abs(scaled % 1) === 0.5 && r % 2 !== 0) r -= 1;
        return args[1] ? FLT(r / f) : INT(r / f);
      });
      case 'sum': return B((args, kw, line) => {
        need(args, 1, line);
        const l = self.iterate(args[0], line);
        let acc = INT(0);
        for (const v of l) acc = self.binop('+', acc, v, line);
        return acc;
      });
      case 'max': case 'min': return B((args, kw, line) => {
        const list = args.length === 1 ? self.iterate(args[0], line) : args;
        if (!list.length) err('ValueError', `${name}() arg is an empty sequence`, line);
        return list.reduce((a, b) => (self.compare(name === 'max' ? '>' : '<', b, a, line) ? b : a));
      });
      case 'range': return B((args, kw, line) => {
        need(args, 1, line);
        const n = args.map((a) => self.intOf(a, line));
        const [start, stop, step] = n.length === 1 ? [0, n[0], 1] : n.length === 2 ? [n[0], n[1], 1] : n;
        if (step === 0) err('ValueError', 'range() arg 3 must not be zero', line);
        const count = Math.max(0, Math.ceil((stop - start) / step));
        if (count > 200000) err('RuntimeError', 'range( ) 가 너무 큽니다 (20만 초과)', line);
        const out = [];
        for (let i = 0, v = start; i < count; i++, v += step) out.push(INT(v));
        return LIST(out);
      });
      case 'list': return B((args, kw, line) => LIST(args.length ? self.iterate(args[0], line) : []));
      case 'type': return B((args, kw, line) => {
        need(args, 1, line);
        const x = args[0];
        if (x.k === 'exc') return x.cls;
        return { k: 'typeobj', name: x.k === 'obj' ? `__main__.${x.cls.name}` : self.typeName(x) };
      });
      case 'input': return B((args, kw, line) => {
        const prompt = args.length ? self.str(args[0], line) : '';
        if (self.inputFn) {
          // 질문 문구를 보고 값을 골라 준다 — 학생이 input 의 순서를 바꿔 써도 채점이 흔들리지 않는다
          const v = self.inputFn(prompt, self.inputCount++);
          if (v === null || v === undefined) err('EOFError', 'EOF when reading a line', line, '입력할 값이 준비되어 있지 않습니다.');
          if (self.echo) self.emit(prompt + v + '\n');
          return STR(String(v));
        }
        if (prompt) self.emit(prompt); // 안내 문구는 줄바꿈 없이
        if (!self.inputs.length) {
          err('EOFError', 'EOF when reading a line', line, '입력할 값이 준비되어 있지 않습니다.');
        }
        const v = self.inputs.shift();
        if (self.echo) self.emit(v + '\n'); // 콘솔처럼 친 값이 보이게
        return STR(v);
      });
      case 'isinstance': return B((args, kw, line) => {
        need(args, 2, line);
        const [x, t] = args;
        const one = (c) => (c.k === 'exctype' ? x.k === 'exc' && self.isSub(x.cls, c)
          : c.k === 'class' ? x.k === 'obj' && x.cls === c
            : c.k === 'builtin' ? self.typeName(x) === c.name || (c.name === 'int' && x.k === 'bool') : false);
        if (t.k === 'tuple') return BOOL(t.v.some(one));
        if (t.k === 'class' || t.k === 'exctype') return BOOL(one(t));
        if (t.k === 'builtin') return BOOL(self.typeName(x) === t.name);
        return BOOL(false);
      });

      /* ── 텍스트 분석 수업에서 꼭 필요한 것들을 더 넣었다 ───────────────── */
      case 'sorted': return B((args, kw, line) => {
        need(args, 1, line);
        const list = self.iterate(args[0], line);
        const keyFn = kw && kw.get('key');
        const rev = kw && kw.get('reverse') ? self.truthy(kw.get('reverse')) : false;
        const keyed = list.map((v) => ({ v, k: keyFn ? self.callValue(keyFn, [v], new Map(), line) : v }));
        keyed.sort((a, bb) => {
          if (self.eq(a.k, bb.k)) return 0;
          return self.compare('<', a.k, bb.k, line) ? -1 : 1;
        });
        if (rev) keyed.reverse();
        return LIST(keyed.map((x) => x.v));
      });
      case 'reversed': return B((args, kw, line) => {
        need(args, 1, line);
        return LIST(self.iterate(args[0], line).reverse());
      });
      case 'enumerate': return B((args, kw, line) => {
        need(args, 1, line);
        const start = args[1] ? self.intOf(args[1], line) : (kw && kw.has('start') ? self.intOf(kw.get('start'), line) : 0);
        return LIST(self.iterate(args[0], line).map((v, i) => ({ k: 'tuple', v: [INT(i + start), v] })));
      });
      case 'zip': return B((args, kw, line) => {
        if (args.length < 2) err('TypeError', 'zip( ) 에는 두 개 이상을 넣어야 합니다', line);
        const lists = args.map((a) => self.iterate(a, line));
        const n = Math.min(...lists.map((l) => l.length));
        const out = [];
        for (let i = 0; i < n; i++) out.push({ k: 'tuple', v: lists.map((l) => l[i]) });
        return LIST(out);
      });
      case 'set': return B((args, kw, line) => {
        // ⚠️ 이 앱의 set( ) 은 「중복을 없앤 리스트」를 돌려준다.
        //    파이썬의 진짜 집합과 달리 순서가 유지되고 리스트처럼 쓸 수 있다.
        //    수업에서 set( ) 을 쓰는 자리(어휘 만들기)에서는 결과가 같다.
        if (!args.length) return LIST([]);
        const out = [];
        for (const v of self.iterate(args[0], line)) {
          if (!out.some((x) => self.eq(x, v))) out.push(v);
        }
        return LIST(out);
      });
      case 'any': case 'all': return B((args, kw, line) => {
        need(args, 1, line);
        const l = self.iterate(args[0], line);
        return BOOL(name === 'any' ? l.some((v) => self.truthy(v)) : l.every((v) => self.truthy(v)));
      });
      case 'tuple': return B((args, kw, line) => ({ k: 'tuple', v: args.length ? self.iterate(args[0], line) : [] }));
      case 'dict': return B((args, kw, line) => {
        const m = new Map();
        if (args.length) {
          for (const pair of self.iterate(args[0], line)) {
            const p = pair.k === 'tuple' || pair.k === 'list' ? pair.v : null;
            if (!p || p.length !== 2) err('TypeError', 'dict( ) 에는 (키, 값) 짝을 넣어야 합니다', line);
            m.set(self.key(p[0], line), p[1]);
          }
        }
        if (kw) for (const [k, v] of kw) m.set(k, v);
        return DICT(m);
      });
      // dir(모듈) — 모듈 안에 어떤 이름이 들어 있는지 (정렬해서)
      case 'dir': return B((args, kw, line) => {
        if (!args.length) return LIST([...self.G.keys()].sort().map(STR));
        const x = args[0];
        if (x.k === 'module') return LIST(dirOf(x).map(STR));
        if (x.k === 'obj') return LIST([...new Set([...PYINFO.dir.object, '__dict__', '__module__', '__weakref__', ...x.cls.methods.keys(), ...x.attrs.keys()])].sort().map(STR));
        const d = PYINFO.dir[self.typeName(x)];
        if (d) return LIST(d.map(STR));
        err('지원하지 않는 기능', `dir( ) 에 ${self.typeName(x)} 을(를) 넣는 것은 이 앱에서 볼 수 없습니다`, line);
      });
      // f'{값:.2f}' — 소수점 아래 자리를 맞춰 보인다 (f-string 이 안에서 부른다)
      case '__fmt_fixed': return B((args, kw, line) => {
        const x = args[0], d = self.intOf(args[1], line);
        if (!isNum(x) && x.k !== 'bool') err('ValueError', `Unknown format code 'f' for object of type '${self.typeName(x)}'`, line);
        return STR(Number(x.v).toFixed(d));
      });
      default: return null;
    }
  }

  /* ── 문자열·리스트·딕셔너리의 메소드 ── */
  dataMethod(obj, attr, line) {
    const self = this;
    const B = (fn) => ({ k: 'bound', name: attr, self: obj, func: { k: 'builtin', name: attr, fn } });

    if (obj.k === 'str') {
      const s = obj.v;
      switch (attr) {
        case 'upper': return B(() => STR(s.toUpperCase()));
        case 'lower': return B(() => STR(s.toLowerCase()));
        case 'title': return B(() => STR(s.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())));
        case 'strip': return B(() => STR(s.trim()));
        case 'count': return B((a) => INT(a[0] && a[0].v ? s.split(a[0].v).length - 1 : 0));
        case 'replace': return B((a) => STR(s.split(a[0].v).join(a[1].v)));
        case 'find': return B((a) => INT(s.indexOf(a[0].v)));
        case 'startswith': return B((a) => BOOL(s.startsWith(a[0].v)));
        case 'endswith': return B((a) => BOOL(s.endsWith(a[0].v)));
        case 'split': return B((a) => LIST((a.length ? s.split(a[0].v) : s.trim().split(/\s+/)).filter((x, i, arr) => a.length || x !== '' || arr.length === 1).map(STR)));
        case 'join': return B((a, kw, ln) => STR(self.iterate(a[0], ln).map((x) => {
          if (x.k !== 'str') err('TypeError', 'join( ) 에는 문자열 리스트만 넣을 수 있습니다', ln);
          return x.v;
        }).join(s)));
        case 'isdigit': return B(() => BOOL(/^\d+$/.test(s)));
        case 'format': return B((a) => { let i = 0; return STR(s.replace(/\{\}/g, () => self.str(a[i++] || NONE, line))); });
      }
      return null;
    }
    if (obj.k === 'list') {
      const l = obj.v;
      switch (attr) {
        case 'append': return B((a, kw, ln) => { if (!a.length) err('TypeError', 'append( ) 에 넣을 값이 없습니다', ln); l.push(a[0]); return NONE; });
        case 'pop': return B((a, kw, ln) => {
          if (!l.length) err('IndexError', 'pop from empty list', ln);
          const i = a.length ? self.intOf(a[0], ln) : l.length - 1;
          return l.splice(i < 0 ? i + l.length : i, 1)[0];
        });
        case 'insert': return B((a, kw, ln) => { l.splice(self.intOf(a[0], ln), 0, a[1]); return NONE; });
        case 'remove': return B((a, kw, ln) => {
          const i = l.findIndex((x) => self.eq(x, a[0]));
          if (i < 0) err('ValueError', 'list.remove(x): x not in list', ln);
          l.splice(i, 1); return NONE;
        });
        case 'index': return B((a, kw, ln) => {
          const i = l.findIndex((x) => self.eq(x, a[0]));
          if (i < 0) err('ValueError', `${self.repr(a[0], ln)} is not in list`, ln);
          return INT(i);
        });
        case 'count': return B((a) => INT(l.filter((x) => self.eq(x, a[0])).length));
        case 'sort': return B((a, kw, ln) => { l.sort((x, y) => (self.compare('<', x, y, ln) ? -1 : self.eq(x, y) ? 0 : 1)); return NONE; });
        case 'reverse': return B(() => { l.reverse(); return NONE; });
        case 'clear': return B(() => { l.length = 0; return NONE; });
      }
      return null;
    }
    if (obj.k === 'file') {
      const f = obj;
      const live = (ln) => { if (f.closed) err('ValueError', 'I/O operation on closed file.', ln, '이미 close( ) 한 파일입니다.'); };
      switch (attr) {
        case 'read': return B((a, kw, ln) => { live(ln); const t = f.text.slice(f.pos); f.pos = f.text.length; return STR(t); });
        case 'readline': return B((a, kw, ln) => {
          live(ln);
          const at = f.text.indexOf('\n', f.pos);
          const end = at < 0 ? f.text.length : at + 1;
          const t = f.text.slice(f.pos, end); f.pos = end; return STR(t);
        });
        case 'readlines': return B((a, kw, ln) => {
          live(ln);
          const rest = f.text.slice(f.pos); f.pos = f.text.length;
          return LIST((rest.match(/[^\n]*\n|[^\n]+$/g) || []).map(STR));
        });
        case 'close': return B(() => { f.closed = true; return NONE; });
      }
      return null;
    }
    if (obj.k === 'dict') {
      const d = obj.v;
      const wrap = (k) => (typeof k === 'string' ? STR(k) : typeof k === 'boolean' ? BOOL(k) : Number.isInteger(k) ? INT(k) : FLT(k));
      switch (attr) {
        case 'keys': return B(() => LIST([...d.keys()].map(wrap)));
        case 'values': return B(() => LIST([...d.values()]));
        case 'items': return B(() => LIST([...d.entries()].map(([k, v]) => ({ k: 'tuple', v: [wrap(k), v] }))));
        case 'get': return B((a, kw, ln) => (d.has(self.key(a[0], ln)) ? d.get(self.key(a[0], ln)) : (a[1] || NONE)));
        case 'pop': return B((a, kw, ln) => { const key = self.key(a[0], ln); const v = d.get(key); d.delete(key); return v ?? NONE; });
        case 'most_common': return B((a, kw, ln) => {
          const n = a.length ? self.intOf(a[0], ln) : d.size;
          const rows = [...d.entries()]
            .filter(([, v]) => isNum(v))
            .sort((x, y) => y[1].v - x[1].v || String(x[0]).localeCompare(String(y[0]), 'ko'))
            .slice(0, n);
          return LIST(rows.map(([k, v]) => ({ k: 'tuple', v: [wrap(k), v] })));
        });
      }
      return null;
    }
    return null;
  }

  /* ══════════════════════ 모듈 찾기 · 불러오기 ══════════════════════════
   * 진짜 파이썬이 import 를 만나면 하는 일을 그대로 따라 한다.
   *   ① 이미 불러온 적이 있나? (sys.modules) → 있으면 그것을 그대로 쓴다. 파일을 다시 실행하지 않는다.
   *   ② 없으면 찾는다 — 차례가 중요하다.
   *        내장 모듈(math·time·sys) → 「실행한 파일이 있는 폴더」 → 표준 라이브러리(random…) → pip 로 설치한 것
   *      그래서 내 폴더에 random.py 가 있으면 파이썬의 random 대신 내 파일이 불려 온다(가림).
   *      반대로 math 는 파이썬 안에 들어 있는 내장 모듈이라, 내 math.py 가 있어도 언제나 진짜 math 가 이긴다.
   *   ③ 찾은 파일을 위에서부터 한 번 실행하고, 그 결과(전역 이름표)가 곧 모듈이 된다.
   * ===================================================================== */

  /** 실행 중인 파일 → 그 모듈 객체 */
  modOfFile(file) {
    if (this.mainMod && this.mainMod.file === file) return this.mainMod;
    for (const m of this.sysModules.values()) if (m.file === file && m.kind === 'user') return m;
    return null;
  }
  hasFile(p) { return Object.prototype.hasOwnProperty.call(this.files, p); }

  /** 모듈 하나 불러오기 — import a.b.c 면 a → a.b → a.b.c 를 차례로 */
  importModule(fullname, st, top = true) {
    if (this.sysModules.has(fullname)) {
      // 학생이 쓴 import 문이 다시 부른 것만 적는다 (a.b 를 부르며 a 를 다시 찾는 것은 빼고)
      if (top) this.events.push({ kind: 'cache', name: fullname });
      return this.sysModules.get(fullname);
    }
    const parts = fullname.split('.');
    const notFound = (msg) => {
      const e = new PyError('ModuleNotFoundError', msg, st.line, '');
      e.missingName = fullname;
      throw e;
    };
    let parent = null;
    if (parts.length > 1) {
      const parentName = parts.slice(0, -1).join('.');
      parent = this.importModule(parentName, st, false);
      // 부모의 __init__.py 가 이미 불러왔을 수도 있다 (from . import x)
      if (this.sysModules.has(fullname)) return this.sysModules.get(fullname);
      if (!parent.isPkg) notFound(`No module named '${fullname}'; '${parentName}' is not a package`);
    }
    const spec = parent ? this.findInPackage(parts[parts.length - 1], parent) : this.findTop(fullname);
    if (!spec) notFound(`No module named '${fullname}'`);
    const m = this.loadModule(fullname, spec, st);
    // 불러온 하위 모듈은 부모 패키지의 속성이 된다 — 그래서 import a.b 다음에 a.b.함수( ) 가 된다
    if (parent) parent.members.set(parts[parts.length - 1], m);
    return m;
  }

  /** 맨 위 이름(점이 없는 이름)을 찾는다 */
  findTop(name) {
    if (PYINFO.builtinModules.includes(name)) return { kind: BUILTIN_IMPL[name] ? 'builtin' : 'unsupported', name };
    const local = this.findIn(this.scriptDir, name);
    if (local && local.kind !== 'ns') return local;
    if (STDLIB_IMPL[name]) return { kind: 'std', name };
    if (PYINFO.stdlib.includes(name)) return { kind: 'unsupported', name };
    if (EXTERNAL[name] && this.installed.has(EXTERNAL[name].pip)) return { kind: 'ext', name };
    if (KNOWN_EXTERNAL[name] && this.installed.has(KNOWN_EXTERNAL[name])) return { kind: 'unsupported-ext', name };
    return local; // 이름공간 패키지(__init__.py 없는 폴더)는 맨 나중에
  }
  /** 패키지 폴더 안에서 하위 모듈을 찾는다 */
  findInPackage(child, parent) {
    if (!parent.path) return null;
    let ns = null;
    for (const d of parent.path) {
      const s = this.findIn(d, child);
      if (s && s.kind !== 'ns') return s;
      if (s && !ns) ns = s;
    }
    return ns;
  }
  /** 폴더 하나에서 찾기 — ① __init__.py 가 있는 폴더(패키지) ② 이름.py(모듈) ③ 그냥 폴더(이름공간 패키지) */
  findIn(dir, name) {
    const p = dir ? `${dir}/${name}` : name;
    if (this.dirs.has(p) && this.hasFile(`${p}/__init__.py`)) return { kind: 'pkg', dir: p, file: `${p}/__init__.py` };
    if (this.hasFile(`${p}.py`)) return { kind: 'mod', file: `${p}.py` };
    if (this.dirs.has(p)) return { kind: 'ns', dir: p };
    return null;
  }

  /** 찾은 것을 실제로 불러와 모듈 객체로 만든다 */
  loadModule(fullname, spec, st) {
    if (spec.kind === 'unsupported-ext') {
      err('지원하지 않는 기능', `import ${fullname} — 설치는 되었지만(흉내) 이 앱 안에서는 실행할 수 없습니다`, st.line,
        '이 앱 안에서 실제로 돌려 볼 수 있는 외부 라이브러리는 gtts 하나뿐입니다. 진짜 라이브러리는 VS Code 나 코랩에서 써 보세요.');
    }
    if (spec.kind === 'unsupported') {
      err('지원하지 않는 기능', `import ${fullname} — 진짜 파이썬에는 있는 모듈이지만 이 앱에서는 쓸 수 없습니다`, st.line,
        `이 앱에서는 ${Object.keys(BUILTIN_IMPL).concat(Object.keys(STDLIB_IMPL)).join(', ')} 모듈과 내가 만든 모듈만 불러올 수 있습니다.`);
    }
    if (spec.kind === 'builtin' || spec.kind === 'std' || spec.kind === 'ext') {
      const m = this.fakeModule(fullname, spec.kind);
      this.sysModules.set(fullname, m);
      this.events.push({ kind: 'load', name: fullname, lib: spec.kind });
      if (m.subs) for (const [k, f] of Object.entries(m.subs)) { const sm = f(); this.sysModules.set(`${fullname}.${k}`, sm); }
      return m;
    }
    const isPkg = spec.kind === 'pkg' || spec.kind === 'ns';
    const parentName = fullname.split('.').slice(0, -1).join('.');
    const m = { k: 'module', kind: 'user', name: fullname, file: spec.file || null, isPkg, ns: spec.kind === 'ns',
      path: isPkg ? [spec.dir] : null, pathDisk: isPkg ? [fileOnDisk(this.root, spec.dir)] : null,
      disk: spec.file ? fileOnDisk(this.root, spec.file) : null, members: new Map() };
    // 진짜 파이썬이 모듈에 처음 붙여 두는 이름들 (같은 차례로 — 「Did you mean」 고르기에 쓰인다)
    const g = m.members;
    g.set('__name__', STR(fullname));
    g.set('__doc__', NONE);
    g.set('__package__', STR(isPkg ? fullname : parentName));
    g.set('__loader__', OPAQUE(spec.kind === 'ns' ? '<_frozen_importlib_external.NamespaceLoader object>' : '<_frozen_importlib_external.SourceFileLoader object>'));
    g.set('__spec__', OPAQUE(`ModuleSpec(name='${fullname}')`));
    if (isPkg) g.set('__path__', LIST([STR(fileOnDisk(this.root, spec.dir))]));
    if (spec.file) {
      g.set('__file__', STR(fileOnDisk(this.root, spec.file)));
      g.set('__cached__', STR(cachedPath(this.root, spec.file)));
      g.set('__builtins__', OPAQUE("<module 'builtins' (built-in)>"));
    }
    this.sysModules.set(fullname, m);
    this.events.push({ kind: 'load', name: fullname, file: spec.file || null, ns: spec.kind === 'ns', dir: spec.dir || null });
    if (spec.file) this.execModuleSource(m, st);
    return m;
  }

  /** 모듈 파일을 위에서부터 한 번 실행한다. 이때 만들어진 이름들이 곧 모듈의 속성이 된다. */
  execModuleSource(m, st) {
    let ast;
    try {
      ast = parse(this.files[m.file]);
    } catch (e) {
      this.sysModules.delete(m.name);
      if (e instanceof PyError) {
        // 불러온 파일 안의 문법 오류 — 그 파일의 줄을 따로 적어 두고, 지금 칸은 import 문으로 올라간다
        e.synFile = m.file;
        e.synLine = e.line;
        e.cur = st.line;
        e.curPos = null;
      }
      throw e;
    }
    const saved = [this.G, this.curFile, this.curMod];
    this.G = m.members; this.curFile = m.file; this.curMod = m;
    try {
      this.execBlock(ast.body, m.members, null);
    } catch (e) {
      // 실행하다 실패한 모듈은 「불러온 모듈」 목록에서 빠진다 (진짜 파이썬과 같다)
      this.sysModules.delete(m.name);
      if (e instanceof PyError && !e.fatal) {
        e.tb.unshift({ file: m.file, where: '<module>', line: e.cur, pos: e.curPos });
        e.cur = st.line;
        e.curPos = null;
      }
      throw e;
    } finally {
      [this.G, this.curFile, this.curMod] = saved;
    }
  }

  /** from . import x · from .calc import add — 점은 「이 파일이 들어 있는 패키지」 */
  resolveRelative(st) {
    if (!st.level) return st.mod;
    const cm = this.curMod;
    const pkg = !cm || cm === this.mainMod ? '' : (cm.isPkg ? cm.name : cm.name.split('.').slice(0, -1).join('.'));
    if (!pkg) {
      err('ImportError', 'attempted relative import with no known parent package', st.line,
        '점(.)으로 시작하는 import 는 패키지 안의 파일끼리만 씁니다. 직접 실행하는 파일(main.py)에서는 from 패키지 import 모듈 처럼 이름을 적어 주세요.');
    }
    const bits = pkg.split('.');
    if (st.level - 1 >= bits.length) err('ImportError', 'attempted relative import beyond top-level package', st.line);
    const base = bits.slice(0, bits.length - (st.level - 1)).join('.');
    return st.mod ? `${base}.${st.mod}` : base;
  }

  /** math · time · sys · random · gtts — 파이썬이 처음부터 가진 모듈과 pip 로 설치한 모듈의 흉내 */
  fakeModule(name, kind) {
    const self = this;
    const B = (n, fn) => ({ k: 'builtin', name: n, fn });
    const M = (members, extra) => {
      const mm = new Map([['__name__', STR(name)], ['__doc__', NONE], ['__package__', STR('')],
        ['__loader__', OPAQUE('<class \'_frozen_importlib.BuiltinImporter\'>')], ['__spec__', OPAQUE(`ModuleSpec(name='${name}')`)]]);
      for (const [k, v] of Object.entries(members)) mm.set(k, v);
      return { k: 'module', kind, name, members: mm, realDir: PYINFO.dir[name] || null, ...extra };
    };
    if (name === 'math') {
      const f1 = (n, fn) => B(n, (a, kw, ln) => {
        if (!a.length || !(isNum(a[0]) || a[0].k === 'bool')) err('TypeError', 'must be real number, not ' + (a.length ? self.typeName(a[0]) : 'nothing'), ln);
        return FLT(fn(Number(a[0].v)));
      });
      return M({
        pi: FLT(Math.PI), e: FLT(Math.E), inf: FLT(Infinity), tau: FLT(2 * Math.PI),
        sqrt: B('sqrt', (a, kw, ln) => {
          if (!a.length || !isNum(a[0])) err('TypeError', 'must be real number, not ' + (a.length ? self.typeName(a[0]) : 'nothing'), ln);
          if (a[0].v < 0) err('ValueError', 'math domain error', ln, '음수의 제곱근은 구할 수 없습니다.');
          return FLT(Math.sqrt(Number(a[0].v)));
        }),
        floor: B('floor', (a, kw, ln) => INT(Math.floor(Number(a[0].v)))),
        ceil: B('ceil', (a, kw, ln) => INT(Math.ceil(Number(a[0].v)))),
        trunc: B('trunc', (a, kw, ln) => INT(Math.trunc(Number(a[0].v)))),
        pow: B('pow', (a, kw, ln) => FLT(Math.pow(Number(a[0].v), Number(a[1].v)))),
        sin: f1('sin', Math.sin), cos: f1('cos', Math.cos), tan: f1('tan', Math.tan),
        log: B('log', (a, kw, ln) => FLT(a.length > 1 ? Math.log(Number(a[0].v)) / Math.log(Number(a[1].v)) : Math.log(Number(a[0].v)))),
        log10: f1('log10', Math.log10), fabs: f1('fabs', Math.abs),
        factorial: B('factorial', (a, kw, ln) => {
          const n = self.intOf(a[0], ln);
          if (n < 0) err('ValueError', 'factorial() not defined for negative values', ln);
          let r = 1n; for (let i = 2n; i <= BigInt(n); i++) r *= i; return INT(r);
        }),
        gcd: B('gcd', (a, kw, ln) => { let x = Math.abs(self.intOf(a[0], ln)), y = Math.abs(self.intOf(a[1], ln)); while (y) [x, y] = [y, x % y]; return INT(x); }),
      }, { builtin: true });
    }
    if (name === 'time') {
      return M({
        sleep: B('sleep', () => NONE), // 이 앱에서는 기다리지 않고 바로 넘어간다
        time: B('time', () => FLT(Date.now() / 1000)),
      }, { builtin: true });
    }
    if (name === 'sys') {
      const r = 'C:\\Python312';
      const here = self.scriptDir ? fileOnDisk(self.root, self.scriptDir) : self.root;
      return M({
        path: LIST([here, `${r}\\python312.zip`, `${r}\\DLLs`, `${r}\\Lib`, r, `${r}\\Lib\\site-packages`].map(STR)),
        version: STR('3.12.3 (이 앱의 흉내)'),
      }, { builtin: true });
    }
    if (name === 'random') {
      return M({
        randint: B('randint', (a, kw, ln) => {
          const lo = self.intOf(a[0], ln), hi = self.intOf(a[1], ln);
          if (hi < lo) err('ValueError', `empty range in randrange(${lo}, ${hi + 1})`, ln);
          return INT(lo + Math.floor(Math.random() * (hi - lo + 1)));
        }),
        random: B('random', () => FLT(Math.random())),
        choice: B('choice', (a, kw, ln) => {
          const l = self.iterate(a[0], ln);
          if (!l.length) err('IndexError', 'Cannot choose from an empty sequence', ln);
          return l[Math.floor(Math.random() * l.length)];
        }),
        randrange: B('randrange', (a, kw, ln) => {
          const n = a.map((x) => self.intOf(x, ln));
          const [lo, hi] = n.length === 1 ? [0, n[0]] : n;
          return INT(lo + Math.floor(Math.random() * (hi - lo)));
        }),
        shuffle: B('shuffle', (a, kw, ln) => {
          if (a[0].k !== 'list') err('TypeError', 'shuffle( ) 에는 리스트를 넣어야 합니다', ln);
          const l = a[0].v;
          for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
          return NONE;
        }),
      }, { disk: 'C:\\Python312\\Lib\\random.py', file: null });
    }
    if (name === 'gtts') {
      // pip install gtts 로 설치한 「흉내」 — 진짜 gtts 는 글을 인터넷으로 보내 mp3 를 받아 온다
      const tts = B('gTTS', (a, kw, ln) => {
        const text = a[0] || (kw && kw.get('text'));
        if (!text) err('TypeError', "gTTS.__init__() missing 1 required positional argument: 'text'", ln);
        const lang = a[1] || (kw && kw.get('lang')) || STR('en');
        const obj = { k: 'obj', cls: { name: 'gTTS', mod: 'gtts.tts', methods: new Map() }, attrs: new Map(), id: self.nextId++, names: [] };
        obj.attrs.set('text', text);
        obj.attrs.set('lang', lang);
        obj.attrs.set('save', B('save', (sa, skw, sln) => {
          const fname = sa[0] ? self.str(sa[0], sln) : 'output.mp3';
          self.written.push({ path: fname, kind: 'tts', text: self.str(text, sln), lang: self.str(lang, sln) });
          return NONE;
        }));
        return obj;
      });
      return M({ gTTS: tts }, { isPkg: true, path: [], disk: 'C:\\Python312\\Lib\\site-packages\\gtts\\__init__.py' });
    }
    return M({});
  }
}

/* 이 앱이 흉내 내는 모듈들 */
const BUILTIN_IMPL = { math: true, time: true, sys: true };   // 파이썬 안에 들어 있는 내장 모듈
const STDLIB_IMPL = { random: true };                        // 표준 라이브러리 폴더(Lib)에 있는 .py 모듈
/** pip 로 설치해야 쓸 수 있는 외부 라이브러리 (import 이름 → pip 이름) */
export const EXTERNAL = { gtts: { pip: 'gtts' } };
/** 이름만 알려 주는 유명한 외부 라이브러리 — import 하면 「pip install 하세요」 를 알려 준다 */
export const KNOWN_EXTERNAL = {
  gtts: 'gtts', numpy: 'numpy', pandas: 'pandas', matplotlib: 'matplotlib', requests: 'requests',
  sklearn: 'scikit-learn', pygame: 'pygame', PIL: 'pillow', bs4: 'beautifulsoup4', seaborn: 'seaborn',
  pyhwpx: 'pyhwpx', pymupdf: 'pymupdf', fitz: 'pymupdf', cv2: 'opencv-python',
};

const OPAQUE = (s) => ({ k: 'opaque', s });

/** 가상 폴더의 경로 → 화면에 보일 윈도우 경로 */
export function fileOnDisk(root, p) { return p ? `${root}\\${p.replace(/\//g, '\\')}` : root; }
function cachedPath(root, p) {
  const parts = p.split('/');
  const base = parts.pop().replace(/\.py$/, '');
  return fileOnDisk(root, [...parts, '__pycache__', `${base}.cpython-312.pyc`].join('/'));
}
/** 문자열의 repr — 윈도우 경로의 역슬래시가 두 개씩 보인다 */
const pyrepr = (s) => (s.includes("'") && !s.includes('"') ? `"${s.replace(/\\/g, '\\\\')}"` : `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`);
/** print(모듈) — <module 'calc' from 'C:\\project\\calc.py'> */
function moduleRepr(m) {
  if (m.kind === 'builtin') return `<module '${m.name}' (built-in)>`;
  if (m.ns) return `<module '${m.name}' (namespace) from [${(m.pathDisk || []).map(pyrepr).join(', ')}]>`;
  if (m.disk) return `<module '${m.name}' from ${pyrepr(m.disk)}>`;
  return `<module '${m.name}'>`;
}
/** dir(모듈) — 정렬된 이름 목록 */
function dirOf(m) {
  if (m.realDir) return m.realDir;
  return [...m.members.keys()].sort();
}
/** 함수의 이름 — 메소드면 클래스.메소드 (파이썬 3.10 부터 오류 문구가 이렇게 적는다) */
function qualName(fn) { return fn.clsName ? `${fn.clsName}.${fn.name}` : fn.name; }
/** 함수의 지역 이름 — 매개변수, 그리고 함수 안에서 값을 넣는(=, for, import, def) 이름을 나온 차례대로 */
function localNames(fn) {
  const out = fn.params.map((p) => p.name);
  const add = (n) => { if (n && !out.includes(n)) out.push(n); };
  const walk = (body) => {
    for (const st of body || []) {
      switch (st.type) {
        case 'Assign': st.targets.forEach((t) => t.type === 'Name' && add(t.id)); break;
        case 'AugAssign': if (st.target.type === 'Name') add(st.target.id); break;
        case 'For': st.targets.forEach(add); walk(st.body); break;
        case 'While': walk(st.body); break;
        case 'If': walk(st.body); walk(st.orelse); break;
        case 'Try': walk(st.body); st.handlers.forEach((h) => { add(h.name); walk(h.body); }); walk(st.orelse); walk(st.finalbody); break;
        case 'FuncDef': case 'ClassDef': add(st.name); break;
        case 'Import': st.names.forEach((a) => add(a.asname || a.name.split('.')[0])); break;
        case 'FromImport': st.names.forEach((a) => a !== '*' && add(a.asname || a.name)); break;
        default: break;
      }
    }
  };
  walk(fn.body);
  return out;
}

/* ── 「Did you mean」 — 파이썬 3.12 가 실제로 쓰는 셈법(Python/suggestions.c)을 그대로 옮겼다 ──
 *   이름을 UTF-8 바이트로 바꿔 견준다(한글 한 글자 = 3바이트).
 *   바이트를 바꾸는 값 2, 영문 대소문자만 다르면 1. 두 이름 길이의 1/3 넘게 바뀌어야 하면 후보에서 뺀다.
 *   같은 거리면 먼저 나온 이름이 이긴다 — 그래서 후보의 차례까지 진짜 파이썬과 같아야 한다.
 *   (⚠ Lib/traceback.py 에도 같은 셈법이 있지만 3.12 의 화면 출력은 C 판을 쓴다. 둘은 조금 다르다) */
const MOVE = 2, CASE = 1, MAX_STR = 40, MAX_ITEMS = 750;
const utf8 = (s) => Array.from(new TextEncoder().encode(s));
const lowerByte = (c) => (c >= 65 && c <= 90 ? c + 32 : c);
function subCost(a, b) { if (a === b) return 0; if (lowerByte(a) === lowerByte(b)) return CASE; return MOVE; }
function levenshtein(a, b, maxCost) {
  let as = 0, ae = a.length, bs = 0, be = b.length;
  while (as < ae && bs < be && a[as] === b[bs]) { as++; bs++; }
  while (as < ae && bs < be && a[ae - 1] === b[be - 1]) { ae--; be--; }
  a = a.slice(as, ae); b = b.slice(bs, be);
  if (!a.length || !b.length) return MOVE * (a.length + b.length);
  if (a.length > MAX_STR || b.length > MAX_STR) return maxCost + 1;
  if (b.length < a.length) [a, b] = [b, a];
  if ((b.length - a.length) * MOVE > maxCost) return maxCost + 1;
  const row = [];
  for (let k = 1; k <= a.length; k++) row.push(k * MOVE);
  let result = 0;
  for (let bi = 0; bi < b.length; bi++) {
    const bc = b[bi];
    let distance = bi * MOVE; result = distance;
    let minimum = Infinity;
    for (let ai = 0; ai < a.length; ai++) {
      const substitute = distance + subCost(bc, a[ai]);
      distance = row[ai];
      const insertDelete = Math.min(result, distance) + MOVE;
      result = Math.min(insertDelete, substitute);
      row[ai] = result;
      if (result < minimum) minimum = result;
    }
    if (minimum > maxCost) return maxCost + 1;
  }
  return result;
}
/** 후보 목록 하나에서 가장 가까운 이름 */
function suggestFrom(wrong, list) {
  if (!list || list.length >= MAX_ITEMS) return null;
  const w = utf8(wrong);
  let best = Infinity, sug = null;
  for (const name of list) {
    if (name === wrong) continue;
    const n = utf8(name);
    let maxD = Math.floor((w.length + n.length + 3) * MOVE / 6);
    maxD = Math.min(maxD, best - 1);
    const d = levenshtein(w, n, maxD);
    if (d > maxD) continue;
    if (!sug || d < best) { sug = name; best = d; }
  }
  return sug;
}
/** candidates 가 목록의 목록이면 차례로 본다 (NameError: 함수 안 이름 → 모듈 전역 → 내장 이름) */
export function suggest(wrong, candidates) {
  if (!wrong || !candidates) return null;
  const passes = Array.isArray(candidates[0]) ? candidates : [candidates];
  for (const p of passes) { const s = suggestFrom(wrong, p); if (s) return s; }
  return null;
}

/** 마지막 줄 — 「NameError: name 'ad' is not defined. Did you mean: 'id'?」 */
export function lastLine(e) {
  let s = `${e.type}${e.message !== '' ? ': ' + e.message : ''}`;
  if (['NameError', 'AttributeError', 'ImportError'].includes(e.type) && e.wrongName) {
    const sug = e.selfHint || suggest(e.wrongName, e.candidates);
    if (sug) s += `. Did you mean: '${sug}'?`;
    if (e.type === 'NameError' && e.forgotImport) s += sug ? ` Or did you forget to import '${e.wrongName}'?` : `. Did you forget to import '${e.wrongName}'?`;
  }
  return s;
}

/** NameError 도움말 — 예외 이름의 대소문자를 틀린 경우를 짚어 준다 */
function nameHint(id) {
  const close = [...EXC_NAMES].find((n) => n.toLowerCase() === id.toLowerCase());
  if (close) return `예외 이름은 대소문자까지 정확해야 합니다. ${id} → ${close}`;
  return '';
}
/** int( ) 가 실패한 글자를 보고 왜 안 되는지 짚어 준다 */
function intHint(t) {
  if (t.trim() === '') return '아무것도 넣지 않았습니다. 빈 글자는 정수형으로 바꿀 수 없습니다.';
  if (/^[+-]?\d*\.\d+$|^[+-]?\d+\.\d*$/.test(t.trim())) return 'int( ) 는 소수점이 있는 글자를 바꾸지 못합니다.';
  if (/\d/.test(t)) return '숫자 말고 다른 글자(단위·쉼표·한글)가 섞여 있습니다.';
  return '숫자로 된 글자만 int( ) 로 바꿀 수 있습니다.';
}

/* ── 글자 폭 — 한글은 터미널에서 두 칸을 차지한다. 밑줄(^^^)도 두 칸씩 긋는다 ── */
function isWide(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x1100 && c <= 0x115F) || (c >= 0x2E80 && c <= 0x303E) || (c >= 0x3041 && c <= 0x33FF)
    || (c >= 0x3400 && c <= 0x4DBF) || (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0xA000 && c <= 0xA4CF)
    || (c >= 0xA960 && c <= 0xA97F) || (c >= 0xAC00 && c <= 0xD7A3) || (c >= 0xF900 && c <= 0xFAFF)
    || (c >= 0xFE30 && c <= 0xFE4F) || (c >= 0xFF00 && c <= 0xFF60) || (c >= 0xFFE0 && c <= 0xFFE6)
    || (c >= 0x1F300 && c <= 0x1F64F) || (c >= 0x1F900 && c <= 0x1F9FF);
}
const width = (s) => { let w = 0; for (const ch of s) w += isWide(ch) ? 2 : 1; return w; };

/** 한 칸의 Traceback 줄들 — File "…", line N, in 이름 / 그 줄 / 밑줄 */
function frameLines(fileDisk, lineNo, where, srcLine, pos) {
  const out = [`  File "${fileDisk}", line ${lineNo}${where ? `, in ${where}` : ''}`];
  if (srcLine == null || srcLine.trim() === '') return out;
  const stripped = srcLine.trim();
  out.push(`    ${stripped}`);
  if (!pos) return out;
  const lead = srcLine.length - srcLine.trimStart().length;
  const start = pos.col;
  const multi = pos.endLine != null && pos.endLine !== lineNo;
  const end = multi ? srcLine.trimEnd().length : pos.end;
  const anchors = multi ? null : pos.anchors;
  // 밑줄이 그 줄 전체를 덮으면 긋지 않는다 (진짜 파이썬과 같다)
  if (!(end - start < stripped.length || (anchors && anchors.right - anchors.left > 0))) return out;
  const dpStart = width(srcLine.slice(0, start)) + 1;
  const dpEnd = width(srcLine.slice(0, end)) + 1;
  let marks;
  if (anchors) {
    const seg = srcLine.slice(start, end);
    const l = width(seg.slice(0, anchors.left)), r = width(seg.slice(0, anchors.right));
    marks = '~'.repeat(l) + '^'.repeat(r - l) + '~'.repeat(dpEnd - dpStart - r);
  } else marks = '^'.repeat(dpEnd - dpStart);
  out.push('    ' + ' '.repeat(dpStart - 1 - lead) + marks);
  return out;
}

/** 진짜 파이썬처럼 Traceback 을 글자로 만든다 (여러 파일에 걸쳐서) */
export function formatTraceback(e, files, entry, root = 'C:\\project') {
  const src = (f) => normalize(files[f] || '').split('\n');
  const lineOf = (f, n) => src(f)[n - 1];
  const synType = ['SyntaxError', 'IndentationError'].includes(e.type);
  const synBlock = (file, lineNo) => {
    const out = [`  File "${fileOnDisk(root, file)}", line ${lineNo}`];
    const text = lineOf(file, lineNo);
    if (text != null && text.trim() !== '') {
      const stripped = text.trim();
      out.push(`    ${stripped}`);
      if (!e.noCaret && e.col != null) {
        // ⚠ 문법 오류의 밑줄은 글자 「개수」 로 센다 (한글도 한 칸) — 3.12 의 실제 출력이 그렇다
        const lead = text.length - text.trimStart().length;
        const s = Math.max(e.col, lead);
        const en = Math.max(e.colEnd ?? s + 1, s + 1);
        out.push('    ' + ' '.repeat(s - lead) + '^'.repeat(en - s));
      }
    }
    return out;
  };
  if (synType && !e.synFile) {
    return [...synBlock(entry, e.line), lastLine(e)].join('\n');
  }
  const frames = [{ file: entry, where: '<module>', line: e.cur, pos: e.curPos }, ...e.tb];
  const out = ['Traceback (most recent call last):'];
  for (const f of frames) out.push(...frameLines(fileOnDisk(root, f.file), f.line, f.where, lineOf(f.file, f.line), f.pos));
  if (e.synFile) out.push(...synBlock(e.synFile, e.synLine));
  out.push(lastLine(e));
  return out.join('\n');
}

/**
 * 프로젝트(여러 파일)를 실행한다 — 터미널에 「python main.py」 를 친 것과 같다.
 *   files     { 'main.py': '…', 'mytools/__init__.py': '', … }
 *   dirs      빈 폴더까지 포함한 폴더 목록
 *   entry     실행할 파일 (보통 'main.py'. VS Code 의 ▶ 는 「지금 열린 파일」)
 *   installed pip 로 설치한 것들 (흉내)
 * 돌려주는 것 — 화면 출력(stdout) · Traceback(stderr) · 불러오기 기록 · 함수 호출 기록 · 만든 파일
 */
export function runProject({ files, dirs = [], entry = 'main.py', inputs = [], installed = [], root = 'C:\\project', maxSteps } = {}) {
  const it = new Interp({ files, dirs, inputs, installed, root, maxSteps });
  it.written = [];
  it.scriptDir = entry.includes('/') ? entry.split('/').slice(0, -1).join('/') : '';
  const main = { k: 'module', kind: 'user', name: '__main__', file: entry, isPkg: false, members: it.globals, disk: fileOnDisk(root, entry) };
  // 직접 실행한 파일의 처음 이름표 (진짜 파이썬과 같은 차례)
  const g = it.globals;
  g.set('__name__', STR('__main__'));
  g.set('__doc__', NONE);
  g.set('__package__', NONE);
  g.set('__loader__', OPAQUE('<_frozen_importlib_external.SourceFileLoader object>'));
  g.set('__spec__', NONE);
  g.set('__annotations__', DICT(new Map()));
  g.set('__builtins__', OPAQUE("<module 'builtins' (built-in)>"));
  g.set('__file__', STR(fileOnDisk(root, entry)));
  g.set('__cached__', NONE);
  it.mainMod = main;
  it.curMod = main;
  it.curFile = entry;
  const base = () => ({
    entry,
    stdout: (it.flush(), it.out.join('\n')),
    lines: it.out.slice(),
    events: it.events.slice(),
    calls: it.calls.slice(),
    written: it.written.slice(),
    loaded: [...it.sysModules.values()].filter((m) => m.kind === 'user').map((m) => ({ name: m.name, file: m.file, isPkg: !!m.isPkg, ns: !!m.ns })),
  });
  if (!Object.prototype.hasOwnProperty.call(files, entry)) {
    return { ok: false, ...base(), stderr: `C:\\Python312\\python.exe: can't open file '${fileOnDisk(root, entry)}': [Errno 2] No such file or directory`, errorType: 'FileNotFound', errorMsg: '' };
  }
  try {
    const ast = parse(files[entry]);
    it.execBlock(ast.body, it.globals, null);
    return { ok: true, ...base(), stderr: '' };
  } catch (e) {
    if (e instanceof PyError) {
      if (e.fatal) return { ok: false, fatal: true, ...base(), stderr: `${e.type}: ${e.message}`, errorType: e.type, errorMsg: e.message, errorHint: e.hint };
      const tb = formatTraceback(e, files, entry, root);
      const frames = [{ file: entry, where: '<module>', line: e.cur }, ...e.tb.map((f) => ({ file: f.file, where: f.where, line: f.line }))];
      const last = e.synFile ? { file: e.synFile, line: e.synLine } : (['SyntaxError', 'IndentationError'].includes(e.type) ? { file: entry, line: e.line } : frames[frames.length - 1]);
      return {
        ok: false, ...base(), stderr: tb,
        errorType: e.type, errorMsg: e.message, errorLast: lastLine(e), errorHint: e.hint,
        errorFile: last.file, errorLine: last.line, frames,
        missingName: e.missingName || null, importFrom: e.importFrom || null, attrOf: e.attrOf || null,
        wrongName: e.wrongName || null,
      };
    }
    if (e instanceof RangeError) return { ok: false, fatal: true, ...base(), stderr: 'RecursionError: 실행이 너무 깊어져 멈췄습니다', errorType: 'RecursionError' };
    return { ok: false, fatal: true, ...base(), stderr: `(앱 안의 오류) ${e.message}`, errorType: 'InternalError', errorMsg: e.message };
  }
}

/** 파일 하나짜리 코드 실행 (확인 문제·짧은 예제용) */
export function runPython(src, opts = {}) {
  return runProject({ files: { 'main.py': src, ...(opts.files || {}) }, dirs: opts.dirs || [], entry: 'main.py', inputs: opts.inputs || [], installed: opts.installed || [] });
}
