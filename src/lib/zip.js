/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  만든 프로젝트를 .zip 한 파일로 묶는다 — 내려받아 풀면 VS Code 로 그대로 열 수 있다.
 *  바깥 라이브러리 없이 ZIP 형식(압축 없이 담기만 하는 「stored」 방식)을 직접 쓴다.
 *  파일 이름은 UTF-8 (한글 이름도 윈도우 탐색기에서 깨지지 않도록 표시 비트를 켠다).
 */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** entries: [{ path, text }] (폴더는 path 끝에 / 를 붙이고 text 는 '') → Uint8Array */
export function makeZip(entries) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const u16 = (v) => [v & 0xFF, (v >>> 8) & 0xFF];
  const u32 = (v) => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)) & 0xFFFF;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
  for (const e of entries) {
    const name = enc.encode(e.path);
    const data = enc.encode(e.text || '');
    const crc = crc32(data);
    const flags = 0x0800; // 파일 이름이 UTF-8
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(flags), ...u16(0), ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    parts.push(local, name, data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(flags), ...u16(0), ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(e.path.endsWith('/') ? 0x10 : 0), ...u32(offset)]), name);
    offset += local.length + name.length + data.length;
  }
  const cdSize = central.reduce((s, x) => s + x.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((s, x) => s + x.length, 0));
  let p = 0;
  for (const x of all) { out.set(x, p); p += x.length; }
  return out;
}

/** 프로젝트 { files, dirs } → zip 항목 (맨 위 폴더 이름 하나로 감싼다) */
export function projectEntries(proj, top = 'my_package_project') {
  const out = [{ path: `${top}/`, text: '' }];
  const dirs = new Set(proj.dirs || []);
  for (const f of Object.keys(proj.files)) { const parts = f.split('/'); for (let k = 1; k < parts.length; k++) dirs.add(parts.slice(0, k).join('/')); }
  for (const d of [...dirs].sort()) out.push({ path: `${top}/${d}/`, text: '' });
  for (const [f, text] of Object.entries(proj.files)) if (!/\.mp3$/i.test(f)) out.push({ path: `${top}/${f}`, text: text.replace(/\r?\n/g, '\r\n') });
  return out;
}
