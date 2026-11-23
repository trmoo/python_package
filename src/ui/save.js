/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  「💾 지금까지 한 활동 HTML 로 저장」 — 이 앱 파일 그대로에 지금까지 한 활동을 심어
 *  바탕 화면에 「학번_이름_패키지 공작소.html」 로 저장한다. 다음 시간에 그 파일을 더블클릭하면 이어서 한다.
 *  (2026-11-23 사용자 지시 — 예전에는 보고서 HTML 을 저장해서, 열어도 이어서 할 수 없었다)
 *
 *  크롬·엣지·웨일은 파일 시스템 접근 API 로 저장 창을 「바탕 화면」 에서 연다.
 *  두 번째부터는 같은 파일에 창 없이 덮어쓴다(같은 학번·이름, 같은 탭에서).
 *  그 기능이 없는 브라우저(파이어폭스 등)·막힌 환경은 보통 내려받기(다운로드 폴더)로 대신한다.
 *
 *  ⚠ 저장 창은 단추를 누른 「바로 그 순간」 에만 열 수 있다(사용자 동작 권한이 곧 사라진다).
 *    그래서 [저장] 을 누르자마자 창부터 열고, 그다음에 파일 내용을 만든다.
 *  ⚠ 저장 창에 id 를 주지 않는다 — id 가 있으면 지난번 폴더가 startIn('desktop') 보다 앞선다.
 *    (ds_performance/offline-exam 에서 겪은 것)
 *  ⚠ 학번·이름은 저장하는 그 파일과 이 탭의 메모리에만 둔다 — localStorage 에 남기지 않는다(개인정보).
 */
import { h, toast, modal } from './dom.js';
import { S, EMBEDDED, FILE_MODE, LOADED_FROM, markSaved, confirmLoaded, resetAll } from '../lib/store.js';
import { SAVED_ID, APP_ID, embedState, saveFileName, maskName } from '../lib/savefile.js';
import { progressOf } from '../lib/progress.js';

/* ── 원본 앱 ──
 * 앱이 화면을 그리기 전의 이 파일 그대로 — 저장할 때 여기에 활동만 끼워 넣는다.
 * (이 모듈은 main.js 의 본문보다 먼저 실행되므로 화면이 아직 비어 있다)
 * outerHTML 은 <html> 바깥의 저작권 주석을 빠뜨리므로 문서의 맨 위 마디를 하나씩 옮긴다.
 * ⚠ 이전 활동 칸은 정규식이 아니라 DOM 에서 떼어 낸다(regression-lab 에서 겪은 것 — 앱 코드에도 'saved-work' 글자가 있다). */
const LT = String.fromCharCode(60); // '<' — HTML 주석을 여는 글자를 앱 코드에 그대로 두지 않는다(tools/check-syntax.mjs ⑧)
function captureOriginal() {
  return [...document.childNodes].map((n) => {
    if (n.nodeType === 10) return `${LT}!doctype html>`;
    if (n.nodeType === 8) return `${LT}!--${n.data}-->`;
    if (n === document.documentElement) {
      const copy = n.cloneNode(true);
      const old = copy.querySelector(`#${SAVED_ID}`);
      if (old) old.remove();
      return copy.outerHTML;
    }
    return n.outerHTML || '';
  }).join('\n');
}
const ORIGINAL = captureOriginal();
/** 개발 서버(npm start)의 화면은 스크립트를 따로 불러서 저장하면 빈 껍데기가 된다 */
const isDevServer = () => !!document.querySelector('script[type="module"][src]');

// 저장한 파일을 열었으면 그 파일의 학번·이름을 미리 채운다 (그 파일을 이어서 하는 중일 때만)
let remembered = FILE_MODE && S._file ? { ...EMBEDDED.who } : { id: '', name: '' };
const handles = new Map(); // 파일 이름 → 저장해 둔 파일 손잡이 (덮어쓰기용)

const canPick = () => typeof window.showSaveFilePicker === 'function';
async function pickFile(suggestedName) {
  if (!canPick()) return 'download';
  try {
    return await window.showSaveFilePicker({ suggestedName, startIn: 'desktop', types: [{ description: '패키지 공작소 (HTML)', accept: { 'text/html': ['.html', '.htm'] } }] });
  } catch (e) {
    if (e && e.name === 'AbortError') return null; // 학생이 취소
    return 'download';                              // 보안 설정으로 막힌 경우 — 내려받기로
  }
}
async function writeTo(target, text, name) {
  const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
  if (target && target !== 'download') {
    const w = await target.createWritable();
    await w.write(blob);
    await w.close();
    return 'file';
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'download';
}

/** 파일에 심을 것 — 학번·이름 · 저장한 때 · 활동 기록 */
const packOf = (who) => ({ app: APP_ID, v: 1, who, savedAt: new Date().toISOString(), state: S });

export function openSaveDialog() {
  if (isDevServer()) {
    modal('여기서는 저장할 수 없어요', '개발 서버 화면입니다. npm run build 로 만든 dist/index.html(또는 깃허브 주소)을 열어 저장해 주세요.');
    return;
  }
  const idIn = h('input', { inputmode: 'numeric', autocomplete: 'off', placeholder: '예) 20101', value: remembered.id, maxlength: '10' });
  const nameIn = h('input', { autocomplete: 'off', placeholder: '예) 홍길동', value: remembered.name, maxlength: '20' });
  const preview = h('code', {});
  const msg = h('div', { class: 'small', style: { color: 'var(--bad)', minHeight: '1.4em' } });
  const upd = () => { preview.textContent = saveFileName(idIn.value.trim() || '학번', nameIn.value.trim() || '이름'); msg.textContent = ''; };
  idIn.addEventListener('input', upd); nameIn.addEventListener('input', upd);
  upd();
  const close = () => { cover.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'Enter' && document.activeElement && document.activeElement.tagName === 'INPUT') doSave(); };

  // 저장 — 단추를 누른 바로 그 순간에 저장 창부터 연다
  function doSave() {
    const id = idIn.value.trim(), name = nameIn.value.trim();
    if (!/^\d{4,6}$/.test(id)) { msg.textContent = '학번을 숫자로 적어 주세요 (예: 20101).'; idIn.focus(); return; }
    if (!name) { msg.textContent = '이름을 적어 주세요.'; nameIn.focus(); return; }
    const fname = saveFileName(id, name);
    const again = handles.get(fname);
    const picking = again ? Promise.resolve(again) : pickFile(fname);
    remembered = { id, name };
    picking.then(async (target) => {
      if (target === null) { toast('저장을 취소했어요'); return; }
      try {
        const where = await writeTo(target, embedState(ORIGINAL, packOf({ id, name })), fname);
        markSaved();
        if (where === 'file') {
          handles.set(fname, target);
          close();
          toast(again ? `💾 ${target.name} 에 덮어썼어요` : `💾 ${target.name} 으로 저장했어요`, 'good');
        } else {
          close();
          modal('💾 내려받았어요', h('div', {},
            h('p', {}, h('b', {}, fname), ' 파일을 「다운로드」 폴더에 저장했어요.'),
            h('p', {}, '👉 ', h('b', {}, '이 파일을 바탕 화면으로 옮겨 두세요.'), ' 다음 시간에 그 파일을 더블클릭하면 이어서 할 수 있어요.')));
        }
      } catch (e) {
        handles.delete(fname);
        msg.textContent = '저장하지 못했어요. 다시 눌러 보세요.';
      }
    });
  }

  const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
    h('h3', {}, '💾 지금까지 한 활동을 HTML 로 저장'),
    h('div', { class: 'col', style: { gap: '10px' } },
      h('label', { class: 'field' }, '학번', idIn),
      h('label', { class: 'field' }, '이름', nameIn),
      h('div', { class: 'small' }, '파일 이름: ', preview),
      h('div', { class: 'note small', html: '이 앱이 지금까지 한 활동과 함께 통째로 저장돼요. <b>다음 시간에 바탕 화면의 이 파일을 더블클릭</b>하면 그대로 이어서 할 수 있어요.<br>'
        + '저장 창이 <b>바탕 화면</b>에서 열려요. 이름을 바꾸지 말고 [저장] 을 누르세요. 「이미 있습니다. 바꾸시겠습니까?」 가 나오면 <b>[예]</b> — 지난번 내 파일에 덮어써요.<br>'
        + '학번·이름은 <b>이 파일 안에만</b> 들어가고 이 컴퓨터(브라우저)에는 남지 않아요.' }),
      msg),
    h('div', { class: 'modal-btns' },
      h('button', { class: 'btn', onClick: close }, '그만두기'),
      h('button', { class: 'btn primary', onClick: doSave }, '💾 바탕 화면에 저장')));
  const cover = h('div', { class: 'overlay', onClick: (e) => { if (e.target === cover) close(); } }, box);
  document.body.appendChild(cover);
  document.addEventListener('keydown', onKey);
  setTimeout(() => (remembered.id ? nameIn : idIn).focus(), 0);
}

/** 💾 저장한 파일을 열었을 때 — 남의 파일을 열었을 수 있으니 먼저 묻는다.
 *  ⚠ Esc·바깥 누르기로 닫히지 않게 한다 — 실수로 눌러 「처음부터」 가 되면 안 된다. */
export async function confirmOwner() {
  if (LOADED_FROM !== 'file') return;
  const who = EMBEDDED.who;
  const when = EMBEDDED.savedAt ? new Date(EMBEDDED.savedAt).toLocaleString('ko-KR') : '';
  const prog = progressOf(S);
  const mine = await modal('📂 저장한 활동을 불러왔어요', h('div', {},
    h('p', { class: 'owner-id' }, `${who.id || '학번 없음'} · ${maskName(who.name) || '이름 없음'}`),
    when ? h('p', { class: 'small muted' }, `마지막 저장: ${when}`) : null,
    h('p', { class: 'small' }, `필수 활동 ${prog.done} / ${prog.total} 끝냄`),
    h('p', {}, '본인의 활동이 맞나요?')),
  { ok: '네, 이어서 할게요', cancel: '아니요, 처음부터', dismiss: false });
  if (mine) { confirmLoaded(); return; } // 이제 이 탭에 남긴다 — 새로 고쳐도 다시 묻지 않게
  remembered = { id: '', name: '' };
  resetAll();
  return 'reset';
}
