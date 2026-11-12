# © 2026 티쳐무 · 모든 권리 보유
# 프로그래밍 노트 13·14쪽(플밍 학습지 ⑦ 모듈 · 패키지 · 라이브러리)의 교사용 답안지를 한글(.hwp)과 확인용 PDF 로 만든다.
#   powershell -ExecutionPolicy Bypass -File tools\make_note_key.ps1 [-Note <노트.hwp>]
# 1) 노트를 임시 폴더에 영문 이름으로 복사해 한글로 열고 HWPX 로 저장  2) make_note_key.py 가 13·14쪽만 남기고 정답을 넣고
# 3) 한글로 다시 열어 .hwp · .pdf 로 저장  4) 노트가 있는 폴더에 「플밍학습지⑦_모듈과패키지_교사용(13-14쪽)」 으로 둔다.
# 노트 원본은 건드리지 않는다. 한글 2024 가 설치된 PC 에서만 동작한다.
# ⚠ 경로에 한글이 있으면 한글 프로그램이 「파일 접근 허용」 창을 띄우고 멈출 수 있어 영문 이름으로 다룬다.
param([string]$Note = "D:\OneDrive - 와우고등학교\2. class\[은무] 수업완성\2026학년도 2학기 프로그래밍\프로그래밍 노트 2학기 v261111.hwp")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dir = Split-Path -Parent $Note
$name = "플밍학습지⑦_모듈과패키지_교사용(13-14쪽)"
$tmp = Join-Path $env:TEMP "plming7_key"
New-Item -ItemType Directory -Force $tmp | Out-Null
Copy-Item -LiteralPath $Note -Destination "$tmp\note.hwp" -Force

$hwp = New-Object -ComObject HWPFrame.HwpObject
[void]$hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
try {
    if (-not $hwp.Open("$tmp\note.hwp", "HWP", "forceopen:true")) { throw "노트 열기 실패" }
    if (-not $hwp.SaveAs("$tmp\note.hwpx", "HWPX", "")) { throw "hwpx 저장 실패" }
    $hwp.Clear(1)

    $env:PYTHONUTF8 = "1"
    python (Join-Path $root "tools\make_note_key.py") "$tmp\note.hwpx" "$tmp\key.hwpx"
    if ($LASTEXITCODE) { throw "make_note_key.py 실패" }

    if (-not $hwp.Open("$tmp\key.hwpx", "HWPX", "forceopen:true")) { throw "답안지 열기 실패" }
    $pages = $hwp.PageCount
    if ($pages -ne 2) { "⚠ 답안지가 $pages 쪽입니다 — 2쪽이어야 합니다(정답 글이 넘쳤는지 확인)." }
    if (-not $hwp.SaveAs("$tmp\key.hwp", "HWP", "")) { throw "hwp 저장 실패" }
    if (-not $hwp.SaveAs("$tmp\key.pdf", "PDF", "")) { throw "pdf 저장 실패" }
    "답안지 — $pages 쪽"
    $hwp.Clear(1)
} finally {
    $hwp.Quit()
}
foreach ($ext in @("hwp", "pdf")) {
    try { Copy-Item "$tmp\key.$ext" -Destination (Join-Path $dir "$name.$ext") -Force -ErrorAction Stop; "만듦: $name.$ext" }
    catch { "⚠ 열려 있어서 덮어쓰지 못함: $name.$ext  (새 판: $tmp\key.$ext)" }
}
