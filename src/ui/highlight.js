/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  파이썬 코드에 색을 입힌다 (편집기와 코드 상자가 함께 쓴다).
 *  import 뒤의 모듈 이름은 따로 표시해 「무엇을 불러오는지」 가 눈에 띄게 한다.
 */
import { esc } from './dom.js';

const KW = new Set(['import', 'from', 'as', 'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or',
  'class', 'pass', 'break', 'continue', 'try', 'except', 'finally', 'raise', 'True', 'False', 'None', 'is', 'global', 'with', 'lambda']);
const BI = new Set(['print', 'len', 'range', 'int', 'str', 'float', 'input', 'sum', 'max', 'min', 'list', 'dict', 'dir', 'type', 'round', 'abs', 'sorted', 'enumerate']);

/** 코드 한 덩어리 → 색을 입힌 HTML (줄바꿈은 그대로) */
export function highlight(src) {
  const re = /(#[^\n]*)|([fFrR]?"""[\s\S]*?(?:"""|$)|[fFrR]?'''[\s\S]*?(?:'''|$)|[fFrR]?"[^"\n]*"?|[fFrR]?'[^'\n]*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_가-힣][A-Za-z0-9_가-힣]*)|(\s+|.)/g;
  let out = '';
  let m, prev = '', afterImport = false;
  while ((m = re.exec(src))) {
    const [t, com, str, num, name] = m;
    if (com) out += `<span class="hl-com">${esc(com)}</span>`;
    else if (str) out += `<span class="hl-str">${esc(str)}</span>`;
    else if (num) out += `<span class="hl-num">${esc(num)}</span>`;
    else if (name) {
      if (KW.has(name)) out += `<span class="hl-kw">${name}</span>`;
      else if (afterImport) out += `<span class="hl-mod">${esc(name)}</span>`;
      else if (prev === 'def' || prev === 'class') out += `<span class="hl-fn">${esc(name)}</span>`;
      else if (BI.has(name)) out += `<span class="hl-bi">${name}</span>`;
      else out += esc(name);
      // import·from 뒤에 오는 이름(불러오는 대상)은 밑줄 색으로 — as 뒤의 별명과 줄이 바뀌면 끝
      if (name === 'import' || name === 'from') afterImport = true;
      else if (KW.has(name)) afterImport = false;
      prev = name;
    } else {
      out += esc(t);
      if (t.includes('\n')) afterImport = false;
    }
  }
  return out;
}
