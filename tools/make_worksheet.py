# © 2026 티쳐무 · 모든 권리 보유
# 학습지(Claude Docs 를 워드로 내보낸 것)를 「프로그래밍 노트 2학기」(한글 문서)와 같은 모양의 워드 파일로 다시 짠다.
#   python tools/make_worksheet.py            → 학습지/플밍학습지7_모듈과패키지.docx
# 노트 모양 — A4 · 여백 10mm · 첫 쪽 머리 상자(티쳐무의 / 플밍 학습지 ⑦ · 와우고등학교 2학년 반 번 성명: · 주제) ·
#   둘째 쪽부터 오른쪽 위 「와우고등학교 2학년 반 번 성명:」 · 나눔고딕 10pt · 「1.」「1.1」 굵은 제목 · 「■」 소제목 ·
#   위 테두리가 굵은 표 · ( ) 빈칸 · 쪽 아래 「- 1 -」.
# ⚠ 한글(HWP)은 docx 의 줄 간격 「배수」를 넓혀 쪽이 밀린다(class-seats 에서 겪음) — 줄 간격은 모두 「고정값」으로 둔다.
# ⚠ 번호·글머리는 워드 번호 매기기 대신 글자로 적는다 — 한글로 열 때 번호가 흐트러지지 않게.
# 학습지 내용을 고칠 때는 Claude Docs 문서를 고치고 워드로 다시 내보낸 뒤 이 도구를 다시 돌린다.
import re
import sys
from pathlib import Path

import docx
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Mm, Pt, Emu

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / '학습지' / '패키지공작소_학습지.docx'
OUT = ROOT / '학습지' / '플밍학습지7_모듈과패키지.docx'

NO = '⑦'                                    # 노트의 학습지 번호 (노트의 마지막이 ⑥ 자판기)
TOPIC = '모듈 · 패키지 · 라이브러리 (패키지 공작소)'
SCHOOL = '와우고등학교  2학년      반      번   성명:'

# ⚠ 영문 칸에도 「나눔고딕」 — 「NanumGothic」 으로 적으면 LibreOffice 가 못 찾아 영문만 바탕체로 나온다
KO, EN, CODE = '나눔고딕', '나눔고딕', 'D2Coding'
PAGE_W, MARGIN = 210, 10                    # mm
TEXT_W = PAGE_W - 2 * MARGIN                # 190mm
BODY, SMALL, CELL = 10, 9, 9                # pt
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'


# ───────────────────────── 1. 원본 읽기 ─────────────────────────
def w(tag):
    return '{%s}%s' % (W, tag)


def list_formats(src):
    """numId → {수준: 'bullet' | 'decimal' …}"""
    part = src.part.numbering_part.element
    abstract = {}
    for an in part.findall(w('abstractNum')):
        abstract[an.get(w('abstractNumId'))] = {int(l.get(w('ilvl'))): l.find(w('numFmt')).get(w('val')) for l in an.findall(w('lvl'))}
    return {n.get(w('numId')): abstract[n.find(w('abstractNumId')).get(w('val'))] for n in part.findall(w('num'))}


def runs_of(p_el, src):
    """문단 하나 → [(글자, {'b','code'}…)] · 그림이 있으면 ('', {'img': 바이트})"""
    out = []

    def walk(el):
        for ch in el:
            tag = ch.tag.split('}')[1]
            if tag == 'r':
                rpr = ch.find(w('rPr'))
                flags = set()
                if rpr is not None:
                    b = rpr.find(w('b'))
                    if b is not None and b.get(w('val')) not in ('0', 'false'):
                        flags.add('b')
                    st = rpr.find(w('rStyle'))
                    if st is not None and 'Code' in st.get(w('val')):
                        flags.add('code')
                for x in ch:
                    t = x.tag.split('}')[1]
                    if t == 't':
                        out.append((x.text or '', frozenset(flags)))
                    elif t == 'br':
                        out.append(('\n', frozenset(flags)))
                    elif t == 'tab':
                        out.append(('\t', frozenset(flags)))
                    elif t == 'drawing':
                        blip = x.find('.//{http://schemas.openxmlformats.org/drawingml/2006/main}blip')
                        if blip is not None:
                            rid = blip.get(qn('r:embed'))
                            out.append(('', frozenset({('img', rid)})))
            elif tag in ('hyperlink', 'smartTag', 'ins'):
                walk(ch)

    walk(p_el)
    return out


def text_of(runs):
    return ''.join(t for t, _ in runs)


def read_blocks(path):
    src = docx.Document(str(path))
    fmts = list_formats(src)
    blocks = []
    for el in src.element.body.iterchildren():
        tag = el.tag.split('}')[1]
        if tag == 'p':
            p = docx.text.paragraph.Paragraph(el, src)
            style = p.style.name
            runs = runs_of(el, src)
            imgs = [f for _, fl in runs for f in fl if isinstance(f, tuple)]
            if imgs:
                blocks.append({'k': 'img', 'blob': src.part.related_parts[imgs[0][1]].blob})
                continue
            txt = text_of(runs)
            if style.startswith('Heading'):
                blocks.append({'k': 'h%d' % int(style.split()[-1]), 'text': txt.strip(), 'runs': runs})
            elif style == 'Code':
                blocks.append({'k': 'code', 'text': txt})
            elif el.find('.//' + w('numPr')) is not None:
                num = el.find('.//' + w('numPr'))
                nid = num.find(w('numId')).get(w('val'))
                lvl = int(num.find(w('ilvl')).get(w('val'))) if num.find(w('ilvl')) is not None else 0
                kind = fmts.get(nid, {}).get(lvl, 'bullet')
                blocks.append({'k': 'li', 'num': nid, 'lvl': lvl, 'kind': kind, 'runs': runs})
            elif txt.strip():
                blocks.append({'k': 'p', 'runs': runs})
        elif tag == 'tbl':
            t = docx.table.Table(el, src)
            rows = []
            for r in t.rows:
                row = []
                for c in r.cells:
                    cell = []
                    for i, cp in enumerate(c.paragraphs):
                        if i:
                            cell.append(('\n', frozenset()))
                        cell.extend(runs_of(cp._element, src))
                    row.append(cell)
                rows.append(row)
            blocks.append({'k': 'tbl', 'rows': rows})
    return blocks


# ───────────────────────── 2. 글자 다듬기 ─────────────────────────
EMOJI = re.compile('[\U0001F000-\U0001FFFF☀-⛿✀-➿️]')


def tidy(s):
    # ⚠ 나눔고딕은 \ 를 ₩ 로 그린다 — 코드가 아닌 글자의 \ 는 전각 ＼ 로 (「import 줄 \ 다음 줄」)
    s = s.replace('☐', '□').replace(' ', ' ').replace('\\', '＼')
    s = EMOJI.sub('', s).replace('  ', ' ') if EMOJI.search(s) else s
    # 빈칸 ＿＿＿＿ → 노트처럼 ( ) 괄호 빈칸. 밑줄 수만큼 넓게
    return re.sub('＿+', lambda m: '(' + '　' * max(2, len(m.group())) + ')', s)


# ───────────────────────── 3. 워드 꾸미기 도우미 ─────────────────────────
def set_font(run, size, bold=False, code=False):
    run.font.size = Pt(size)
    run.font.bold = bold
    rpr = run._element.get_or_add_rPr()
    fonts = rpr.find(qn('w:rFonts'))
    if fonts is None:
        fonts = OxmlElement('w:rFonts')
        rpr.insert(0, fonts)
    name_en, name_ko = (CODE, CODE) if code else (EN, KO)
    for k, v in (('w:ascii', name_en), ('w:hAnsi', name_en), ('w:eastAsia', name_ko), ('w:cs', name_en)):
        fonts.set(qn(k), v)


def fmt(p, size=BODY, before=0, after=2, align=None, left=0, hang=0, keep=False, line=None):
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    pf.line_spacing = Pt(line or round(size * 1.55, 1))
    if align is not None:
        p.alignment = align
    if left or hang:
        pf.left_indent = Mm(left + hang)
        pf.first_line_indent = Mm(-hang)
    if keep:
        pf.keep_with_next = True
    return p


def add_runs(p, runs, size=BODY, bold=False, prefix=None):
    if prefix:
        set_font(p.add_run(prefix), size, bold)
    for t, fl in runs:
        t = tidy(t) if 'code' not in fl else t.replace(' ', ' ')
        if not t:
            continue
        if t == '\n':
            p.add_run().add_break()
            continue
        code = 'code' in fl
        set_font(p.add_run(t), size - 0.5 if code else size, bold or 'b' in fl, code)
    return p


# 워드는 속성의 차례를 따진다(어긋나면 「읽을 수 없는 내용」) — 규격 차례대로 끼워 넣는다
ORDER = {
    'tblPr': ['tblStyle', 'tblpPr', 'tblOverlap', 'bidiVisual', 'tblStyleRowBandSize', 'tblStyleColBandSize', 'tblW', 'jc',
              'tblCellSpacing', 'tblInd', 'tblBorders', 'shd', 'tblLayout', 'tblCellMar', 'tblLook'],
    'trPr': ['cnfStyle', 'divId', 'gridBefore', 'gridAfter', 'wBefore', 'wAfter', 'cantSplit', 'trHeight', 'tblHeader',
             'tblCellSpacing', 'jc', 'hidden'],
    'tcPr': ['cnfStyle', 'tcW', 'gridSpan', 'hMerge', 'vMerge', 'tcBorders', 'shd', 'noWrap', 'tcMar', 'textDirection',
             'tcFitText', 'vAlign', 'hideMark'],
    'tblBorders': ['top', 'left', 'start', 'bottom', 'right', 'end', 'insideH', 'insideV'],
    'tcBorders': ['top', 'left', 'start', 'bottom', 'right', 'end', 'insideH', 'insideV', 'tl2br', 'tr2bl'],
}


def put(parent, child):
    """parent 안의 제자리에 child 를 넣는다 (같은 이름이 있으면 바꾼다)"""
    order = ORDER[parent.tag.split('}')[1]]
    name = child.tag.split('}')[1]
    for old in parent.findall(child.tag):
        parent.remove(old)
    later = order[order.index(name) + 1:]
    for i, ch in enumerate(parent):
        if ch.tag.split('}')[1] in later:
            parent.insert(i, child)
            return child
    parent.append(child)
    return child


def border(el_pr, tag, side, val='single', sz=4, color='000000'):
    box = el_pr.find(qn(tag))
    if box is None:
        box = put(el_pr, OxmlElement(tag))
    b = box.find(qn('w:' + side))
    if b is None:
        b = put(box, OxmlElement('w:' + side))
    b.set(qn('w:val'), val)
    b.set(qn('w:sz'), str(sz))
    b.set(qn('w:space'), '0')
    b.set(qn('w:color'), color)


def table_frame(t, widths_mm, top=12, edge=4, inner=4, lines=True):
    """표 너비·칸 너비를 고정하고 노트처럼 테두리를 긋는다 (위 테두리만 굵게)"""
    tbl = t._tbl
    tpr = tbl.tblPr
    tw = OxmlElement('w:tblW')
    tw.set(qn('w:w'), str(int(sum(widths_mm) * 56.7)))
    tw.set(qn('w:type'), 'dxa')
    put(tpr, tw)
    lay = OxmlElement('w:tblLayout')
    lay.set(qn('w:type'), 'fixed')
    put(tpr, lay)
    mar = OxmlElement('w:tblCellMar')
    for side, v in (('top', 25), ('left', 85), ('bottom', 25), ('right', 85)):
        e = OxmlElement('w:' + side)
        e.set(qn('w:w'), str(v))
        e.set(qn('w:type'), 'dxa')
        mar.append(e)
    put(tpr, mar)
    if lines:
        border(tpr, 'w:tblBorders', 'top', sz=top)
        for side in ('left', 'right', 'bottom'):
            border(tpr, 'w:tblBorders', side, sz=edge)
        for side in ('insideH', 'insideV'):
            border(tpr, 'w:tblBorders', side, sz=inner)
    else:
        for side in ('top', 'left', 'right', 'bottom', 'insideH', 'insideV'):
            border(tpr, 'w:tblBorders', side, val='nil', sz=0)
    grid = tbl.tblGrid
    for i, gc in enumerate(grid.findall(qn('w:gridCol'))):
        gc.set(qn('w:w'), str(int(widths_mm[i] * 56.7)))
    for row in t.rows:
        for i, c in enumerate(row.cells):
            c.width = Mm(widths_mm[i])
    t.alignment = WD_TABLE_ALIGNMENT.CENTER


def row_height(row, mm, exact=False):
    trpr = row._tr.get_or_add_trPr()
    h = OxmlElement('w:trHeight')
    h.set(qn('w:val'), str(int(mm * 56.7)))
    h.set(qn('w:hRule'), 'exact' if exact else 'atLeast')
    put(trpr, h)
    put(trpr, OxmlElement('w:cantSplit'))


def header_row(row):
    trpr = row._tr.get_or_add_trPr()
    put(trpr, OxmlElement('w:tblHeader'))
    for c in row.cells:
        tcpr = c._tc.get_or_add_tcPr()
        border(tcpr, 'w:tcBorders', 'bottom', val='double', sz=4)


def cell_text(c, runs, size=CELL, bold=False, align=None):
    p = c.paragraphs[0]
    fmt(p, size, after=0, align=align)
    add_runs(p, runs, size, bold)
    c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    return p


def plain(t):
    return [(t, frozenset())]


# ───────────────────────── 4. 노트 모양으로 쓰기 ─────────────────────────
def setup(doc):
    st = doc.styles['Normal']
    st.font.size = Pt(BODY)
    rpr = st.element.get_or_add_rPr()
    f = rpr.find(qn('w:rFonts'))
    if f is None:
        f = OxmlElement('w:rFonts')
        rpr.insert(0, f)
    for k, v in (('w:ascii', EN), ('w:hAnsi', EN), ('w:eastAsia', KO), ('w:cs', EN)):
        f.set(qn(k), v)
    st.paragraph_format.space_after = Pt(0)
    st.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    st.paragraph_format.line_spacing = Pt(16)

    sec = doc.sections[0]
    sec.page_width, sec.page_height = Mm(210), Mm(297)
    sec.left_margin = sec.right_margin = Mm(MARGIN)
    sec.top_margin, sec.bottom_margin = Mm(12), Mm(14)
    sec.header_distance, sec.footer_distance = Mm(6), Mm(6)
    # ⚠ 머리말은 두지 않는다(노트 2쪽처럼). 「첫 쪽만 다른 머리말」을 쓰면 한글이 「첫 쪽 감추기」로 읽어
    #   첫 쪽의 쪽 번호까지 사라진다(2026-11-11 겪음). 이름 칸은 첫 쪽 머리 상자에 있다.
    fmt(sec.header.paragraphs[0], 2, after=0, line=2)
    # 쪽 아래 「- 1 -」 — 모든 쪽
    for ft in (sec.footer,):
        p = ft.paragraphs[0]
        fmt(p, BODY, after=0, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_font(p.add_run('- '), BODY)
        r = p.add_run()
        set_font(r, BODY)
        for kind, text in (('begin', None), (None, 'PAGE'), ('separate', None), (None, '1'), ('end', None)):
            if kind:
                fc = OxmlElement('w:fldChar')
                fc.set(qn('w:fldCharType'), kind)
                r._element.append(fc)
            elif text == 'PAGE':
                it = OxmlElement('w:instrText')
                it.set(qn('xml:space'), 'preserve')
                it.text = ' PAGE '
                r._element.append(it)
            else:
                tt = OxmlElement('w:t')
                tt.text = text
                r._element.append(tt)
        set_font(p.add_run(' -'), BODY)


def title_box(doc):
    """첫 쪽 머리 상자 — 왼쪽 「티쳐무의 / 플밍 학습지 ⑦」, 오른쪽 위 「와우고등학교 …」, 아래 주제"""
    t = doc.add_table(rows=2, cols=2)
    table_frame(t, [44, TEXT_W - 44], top=6, edge=6, inner=4)
    left = t.cell(0, 0).merge(t.cell(1, 0))
    p = left.paragraphs[0]
    fmt(p, 8, after=0, align=WD_ALIGN_PARAGRAPH.CENTER, line=11)
    set_font(p.add_run('티쳐무의'), 8, True)
    p2 = left.add_paragraph()
    fmt(p2, 14, after=0, align=WD_ALIGN_PARAGRAPH.CENTER, line=19)
    set_font(p2.add_run('플밍 학습지 ' + NO), 14, True)
    left.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    cell_text(t.cell(0, 1), plain(SCHOOL), BODY, align=WD_ALIGN_PARAGRAPH.CENTER)
    cell_text(t.cell(1, 1), plain(TOPIC), BODY, True, WD_ALIGN_PARAGRAPH.CENTER)
    for r in t.rows:
        row_height(r, 6.5)
    gap(doc, 4)


def gap(doc, pt):
    p = doc.add_paragraph()
    fmt(p, 1, after=0, line=pt)
    set_font(p.add_run(' '), 1)


def col_widths(rows):
    """글자 수로 칸 너비를 나눈다. 빈 칸(학생이 쓰는 칸)은 넉넉하게"""
    n = len(rows[0])
    weights = []
    for i in range(n):
        head = len(text_of(rows[0][i]))
        body = [len(max(text_of(r[i]).split('\n'), key=len)) if i < len(r) else 0 for r in rows[1:]]
        longest = max(body) if body else 0
        weights.append(max(14, head + 2) if longest == 0 else max(6, min(48, max(head, longest))))
    total = sum(weights)
    widths = [max(16, TEXT_W * x / total) for x in weights]
    scale = TEXT_W / sum(widths)
    return [x * scale for x in widths]


def add_table(doc, rows):
    n = len(rows[0])
    t = doc.add_table(rows=len(rows), cols=n)
    table_frame(t, col_widths(rows))
    for ri, r in enumerate(rows):
        empty = any(not text_of(c).strip() for c in r)
        for ci in range(n):
            runs = r[ci] if ci < len(r) else []
            if ri == 0:
                cell_text(t.cell(ri, ci), runs, CELL, True, WD_ALIGN_PARAGRAPH.CENTER)
            else:
                cell_text(t.cell(ri, ci), runs, CELL)
        if ri == 0:
            header_row(t.rows[0])
            row_height(t.rows[0], 6)
        else:
            row_height(t.rows[ri], 7.5 if empty else 5.5)
    gap(doc, 4)
    return t


def add_code(doc, text):
    lines = text.rstrip('\n').split('\n') if text.strip() else []
    t = doc.add_table(rows=1, cols=1)
    table_frame(t, [TEXT_W], top=4, edge=4)
    c = t.cell(0, 0)
    if not lines:                    # 학생이 그리는 빈 상자 (폴더 나무 그리기 칸)
        row_height(t.rows[0], 32)
    for i, ln in enumerate(lines):
        p = c.paragraphs[0] if i == 0 else c.add_paragraph()
        fmt(p, SMALL, after=0, line=13)
        set_font(p.add_run(ln if ln else ' '), SMALL, code=True)
    gap(doc, 5)


def build(blocks):
    doc = docx.Document()
    setup(doc)
    title_box(doc)

    sec_no, sub_no = 0, 0
    counters = {}                 # (번호 매기기 id, 수준) → 몇째
    last_list = None
    i = 0
    # 「들어가며」 — 제목 줄과 학생 이름 표는 머리 상자가 대신한다. 학습 목표 · 준비는 노트 첫 쪽처럼 두 칸으로
    while i < len(blocks) and blocks[i]['k'] != 'h2':
        i += 1
    if i < len(blocks) and blocks[i]['text'] == '들어가며':
        i += 1
        intro, groups, cur = [], [], None
        while i < len(blocks) and blocks[i]['k'] != 'h2':
            b = blocks[i]
            if b['k'] == 'p' and b['runs'] and 'b' in b['runs'][0][1] and len(text_of(b['runs'])) < 12:
                cur = {'title': text_of(b['runs']).strip(), 'items': []}
                groups.append(cur)
            elif b['k'] == 'li' and cur is not None:
                cur['items'].append(b)
            elif b['k'] == 'p':
                intro.append(b)
            i += 1
        for b in intro:
            add_runs(fmt(doc.add_paragraph(), BODY, after=4), b['runs'])
        if groups:
            t = doc.add_table(rows=1, cols=len(groups))
            table_frame(t, [TEXT_W / len(groups)] * len(groups), lines=False)
            tcpr = t.cell(0, 0)._tc.get_or_add_tcPr()
            if len(groups) > 1:
                border(tcpr, 'w:tcBorders', 'right', val='dashed', sz=4, color='808080')
            for gi, g in enumerate(groups):
                c = t.cell(0, gi)
                p = c.paragraphs[0]
                fmt(p, 11, after=2, line=17)
                set_font(p.add_run('■ ' + g['title']), 11, True)
                for n, it in enumerate(g['items'], 1):
                    q = c.add_paragraph()
                    pre = f'{n}) ' if it['kind'] != 'bullet' else '• '
                    add_runs(fmt(q, BODY, after=1, hang=5), it['runs'], BODY, prefix=pre)
            gap(doc, 6)

    while i < len(blocks):
        b = blocks[i]
        k = b['k']
        if k != 'li':
            last_list = None
        if k == 'h2':
            sec_no += 1
            sub_no = 0
            m = re.match(r'^활동\s*\d+\s*·\s*(.*)$', b['text'])
            title = m.group(1) if m else b['text']
            p = fmt(doc.add_paragraph(), 12, before=10, after=4, keep=True, line=18)
            set_font(p.add_run(f'{sec_no}. {tidy(title)}'), 12, True)
        elif k == 'h3':
            sub_no += 1
            title = re.sub(r'^\d+\.\s*', '', b['text'])
            p = fmt(doc.add_paragraph(), 11, before=7, after=3, keep=True, line=16)
            add_runs(p, [(f'{sec_no}.{sub_no} ', frozenset({'b'}))] + [(re.sub(r'^\d+\.\s*', '', t) if j == 0 else t, fl | {'b'}) for j, (t, fl) in enumerate(b['runs'])], 11, True)
        elif k == 'p':
            runs = b['runs']
            lead = text_of(runs[:1]).strip()
            if runs and 'b' in runs[0][1] and len(lead) <= 12:            # 「개념 정리 — …」 같은 소제목 → ■
                p = fmt(doc.add_paragraph(), BODY, before=5, after=2, keep=True)
                add_runs(p, runs, BODY, prefix='■ ')
                p.runs[0].font.bold = True
            elif i > 0 and blocks[i - 1]['k'] == 'img':                  # 그림 설명
                p = fmt(doc.add_paragraph(), SMALL, after=4, align=WD_ALIGN_PARAGRAPH.CENTER)
                add_runs(p, runs, SMALL)
            else:
                nxt = blocks[i + 1]['k'] if i + 1 < len(blocks) else ''
                p = fmt(doc.add_paragraph(), BODY, after=3, keep=nxt in ('tbl', 'code'))
                add_runs(p, runs)
        elif k == 'li':
            # 번호는 이어진 목록 안에서 수준마다 센다. 워드로 내보낸 원본은 질문과 보기의 번호 매기기 id 가
            # 서로 달라서 id 로 세면 질문이 모두 1) 이 된다(2026-11-11 겪음)
            lvl = b['lvl']
            if last_list is None:
                counters = {}
            if counters.get(('kind', lvl)) != b['kind']:
                counters.pop(lvl, None)
            for kk in [x for x in counters if isinstance(x, int) and x > lvl]:   # 위 수준이 넘어가면 아래 수준을 새로
                del counters[kk]
            counters[lvl] = counters.get(lvl, 0) + 1
            counters[('kind', lvl)] = b['kind']
            last_list = b['num']
            n = counters[lvl]
            txt = text_of(b['runs'])
            if txt.lstrip().startswith(('☐', '□')):
                pre = ''                                                 # 할 일 칸 □ 은 그대로
            elif b['kind'] == 'bullet':
                pre = '• ' if b['lvl'] == 0 else '- '
            elif b['lvl'] == 0:
                pre = f'{n}) '
            else:
                pre = '①②③④⑤⑥⑦⑧⑨⑩'[n - 1] + ' '
            p = fmt(doc.add_paragraph(), BODY, after=2, left=4 + 6 * b['lvl'], hang=5 if pre else 0)
            add_runs(p, b['runs'], prefix=pre)
        elif k == 'tbl':
            add_table(doc, b['rows'])
        elif k == 'code':
            add_code(doc, b['text'])
        elif k == 'img':
            import io
            p = fmt(doc.add_paragraph(), BODY, before=2, after=0, align=WD_ALIGN_PARAGRAPH.CENTER, line=None, keep=True)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE   # 그림은 고정 줄 간격이면 잘린다
            p.add_run().add_picture(io.BytesIO(b['blob']), width=Mm(105))
        i += 1

    # 맨 끝 저작권 한 줄
    p = fmt(doc.add_paragraph(), 8, before=8, after=0, align=WD_ALIGN_PARAGRAPH.RIGHT)
    set_font(p.add_run('© 2026 티쳐무 · 학교 수업 목적으로만 이용해 주세요'), 8)
    return doc


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else OUT
    blocks = read_blocks(src)
    doc = build(blocks)
    doc.core_properties.title = f'플밍 학습지 {NO} — {TOPIC}'
    doc.core_properties.author = '티쳐무'
    doc.save(str(out))
    print(f'{out.name} — 블록 {len(blocks)}개')


if __name__ == '__main__':
    main()
