/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  우리 해석기 ↔ 진짜 파이썬 3.12.
 *  화면 출력(stdout)과 오류 문구(stderr — Traceback·밑줄·Did you mean 까지)가 글자 하나까지 같아야 한다.
 *  ④ 수행평가 사례는 정답이 들어 있어 test/local/ 에만 있다 — 그 폴더가 없는 곳(깃허브 Actions)에서는 건너뛴다.
 */
import { existsSync, readFileSync } from 'node:fs';
import { 묶음, 확인 } from './harness.mjs';
import { runProject } from '../src/lib/pymini.js';
import { cases, examCases } from './golden-cases.mjs';

function compare(title, list, golden) {
  묶음(title);
  확인('사례 수가 기준과 같다 (사례를 고쳤으면 npm run golden 을 다시 돌릴 것)', golden.cases.length, list.length);
  for (let i = 0; i < list.length; i++) {
    const c = list[i], g = golden.cases[i];
    if (!g || g.name !== c.name) { 확인(`${c.name} — 기준의 이름이 같다`, g && g.name, c.name); continue; }
    const r = runProject({ files: c.files, dirs: c.dirs, entry: c.entry, inputs: c.inputs || [] });
    확인(`${c.name} — 화면 출력`, r.stdout, g.stdout);
    확인(`${c.name} — 오류 문구`, r.stderr, g.stderr);
  }
}

compare('진짜 파이썬과 대조', cases(), JSON.parse(readFileSync(new URL('./golden.json', import.meta.url), 'utf-8')));

const exam = examCases();
const examGolden = new URL('./local/golden-exam.json', import.meta.url);
if (exam.length && existsSync(examGolden)) compare('진짜 파이썬과 대조 — ④ 수행평가 사례 (이 컴퓨터에만)', exam, JSON.parse(readFileSync(examGolden, 'utf-8')));
else if (exam.length) { 묶음('진짜 파이썬과 대조 — ④ 수행평가 사례'); 확인('test/local/golden-exam.json 이 있다 (npm run golden 을 돌릴 것)', existsSync(examGolden), true); }
else console.log('  (test/local/ 이 없어 ④ 수행평가 사례의 진짜 파이썬 대조는 건너뜁니다)');
