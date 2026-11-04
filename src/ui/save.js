/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  「💾 지금까지 한 활동 HTML 로 저장」 — 학번·이름을 받아 바탕 화면에 「학번_이름_패키지 공작소.html」 로 저장한다.
 *
 *  크롬·엣지·웨일은 파일 시스템 접근 API 로 저장 창을 「바탕 화면」 에서 연다.
 *  두 번째부터는 같은 파일에 창 없이 덮어쓴다(같은 학번·이름, 같은 탭에서).
 *  그 기능이 없는 브라우저(파이어폭스 등)·막힌 환경은 보통 내려받기(다운로드 폴더)로 대신한다.
 *
 *  ⚠ 저장 창은 단추를 누른 「바로 그 순간」 에만 열 수 있다(사용자 동작 권한이 곧 사라진다).
 *    그래서 [저장] 을 누르자마자 창부터 열고, 그다음에 파일 내용을 만든다.
 *  ⚠ 저장 창에 id 를 주지 않는다 — id 가 있으면 지난번 폴더가 startIn('desktop') 보다 앞선다.
 *    (ds_performance/offline-exam 에서 겪은 것)
 *  ⚠ 학번·이름은 이 탭의 메모리에만 둔다 — localStorage 에 남기지 않는다(개인정보).
 */
import { h, toast } from './dom.js';
import { S } from '../lib/store.js';
import { buildReport, reportFileName } from '../lib/report.js';

let remembered = { id: '', name: '' };
const handles = new Map(); // 파일 이름 → 저장해 둔 파일 손잡이 (덮어쓰기용)

const canPick = () => typeof window.showSaveFilePicker === 'function';
async function pickFile(suggestedName) {
  if (!canPick()) return 'download';
  try {
    return await window.showSaveFilePicker({ suggestedName, startIn: 'desktop', types: [{ description: '활동 기록 (HTML)', accept: { 'text/html': ['.html'] } }] });
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

export function openSaveDialog() {
  const idIn = h('input', { inputmode: 'numeric', autocomplete: 'off', placeholder: '예) 20101', value: remembered.id, maxlength: '10' });
  const nameIn = h('input', { autocomplete: 'off', placeholder: '예) 홍길동', value: remembered.name, maxlength: '20' });
  const preview = h('code', {});
  const msg = h('div', { class: 'small', style: { color: 'var(--bad)', minHeight: '1.4em' } });
  const upd = () => { preview.textContent = reportFileName(idIn.value.trim() || '학번', nameIn.value.trim() || '이름'); msg.textContent = ''; };
  idIn.addEventListener('input', upd); nameIn.addEventListener('input', upd);
  upd();
  const close = () => { cover.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'Enter' && document.activeElement && document.activeElement.tagName === 'INPUT') doSave(); };

  // 저장 — 단추를 누른 바로 그 순간에 저장 창부터 연다
  function doSave() {
    const id = idIn.value.trim(), name = nameIn.value.trim();
    if (!/^\d{4,6}$/.test(id)) { msg.textContent = '학번을 숫자로 적어 주세요 (예: 20101).'; idIn.focus(); return; }
    if (!name) { msg.textContent = '이름을 적어 주세요.'; nameIn.focus(); return; }
    const fname = reportFileName(id, name);
    const again = handles.get(fname);
    const picking = again ? Promise.resolve(again) : pickFile(fname);
    remembered = { id, name };
    picking.then(async (target) => {
      if (target === null) { toast('저장을 취소했어요'); return; }
      try {
        const where = await writeTo(target, buildReport(S, { id, name }), fname);
        if (where === 'file') {
          handles.set(fname, target);
          close();
          toast(again ? `💾 ${target.name} 에 덮어썼어요` : `💾 ${target.name} 으로 저장했어요`, 'good');
        } else {
          close();
          toast(`💾 ${fname} 을 내려받았어요 — 「다운로드」 폴더에서 바탕 화면으로 옮겨 주세요`, 'good');
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
      h('div', { class: 'note small', html: '저장 창이 <b>바탕 화면</b>에서 열려요. 그대로 [저장] 을 누르세요. 같은 이름으로 다시 저장하면 <b>덮어써요</b>.<br>학번·이름은 <b>이 파일 안에만</b> 들어가고 이 컴퓨터(브라우저)에는 남지 않아요.' }),
      msg),
    h('div', { class: 'modal-btns' },
      h('button', { class: 'btn', onClick: close }, '그만두기'),
      h('button', { class: 'btn primary', onClick: doSave }, '💾 바탕 화면에 저장')));
  const cover = h('div', { class: 'overlay', onClick: (e) => { if (e.target === cover) close(); } }, box);
  document.body.appendChild(cover);
  document.addEventListener('keydown', onKey);
  setTimeout(() => (remembered.id ? nameIn : idIn).focus(), 0);
}
