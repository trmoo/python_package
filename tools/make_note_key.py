# © 2026 티쳐무 · 모든 권리 보유
"""프로그래밍 노트(한글) 13·14쪽 — 플밍 학습지 ⑦ 「모듈 · 패키지 · 라이브러리」 첫 두 쪽 — 의 교사용 답안지를 만든다.

    python tools/make_note_key.py <노트.hwpx> <결과.hwpx>

한글 변환(hwp → hwpx → hwp·pdf)은 tools/make_note_key.ps1 이 한다. 이 파일은 그 사이의 HWPX(XML)만 고친다.
  1) 노트에서 ⑦ 학습지 머리 상자부터 「2. 불러오기」 쪽 나눔 앞까지(= 13·14쪽)만 남긴다.
     구역 정의(secPr)는 그 첫 문단으로 옮기고, 쪽 번호를 13 부터 매긴다.
  2) 빈칸 ( 　 ) 안 · 빈 표 칸에 빨간 굵은 정답을 넣는다 — 「플밍학습지⑥_예외처리_교사용」 과 같은 꼴.
  3) 「동그라미하기」 칸은 정답을 빨간 실선 상자로, 함께 받는 답은 빨간 점선 상자로 두른다.
정답은 앱 자료(src/data/blanks.js · concept.js)와 정답판 문서를 따른다 — 앱을 고치면 여기도 고칠 것.
"""
import copy
import os
import re
import shutil
import sys
import tempfile
import zipfile

from lxml import etree

NS = {
    'hp': 'http://www.hancom.co.kr/hwpml/2011/paragraph',
    'hh': 'http://www.hancom.co.kr/hwpml/2011/head',
    'opf': 'http://www.idpf.org/2007/opf/',
}
HP = '{%s}' % NS['hp']
HH = '{%s}' % NS['hh']
RED = '#E60000'
BLANK = re.compile(r'\([　 ]*　[　 ]*\)')   # ( 　　 ) — 전각 빈칸이 하나라도 든 괄호


def text(e):
    return ''.join(e.itertext())


# ── 머리(header.xml) — 빨간 글자 모양과 빨간 글자 테두리 ─────────────────────────
class Head:
    def __init__(self, path):
        self.path = path
        self.tree = etree.parse(path)
        r = self.tree.getroot()
        self.chars = r.find('.//' + HH + 'charProperties')
        self.borders = r.find('.//' + HH + 'borderFills')
        self.cache = {}

    def _add(self, box, el):
        # ⚠ 번호는 「개수」가 아니라 「가장 큰 번호 + 1」 — borderFill 은 1 부터 매겨져 개수로 매기면 마지막 것과 겹친다
        el.set('id', str(max(int(c.get('id')) for c in box) + 1))
        box.append(el)
        box.set('itemCnt', str(len(box)))
        return el.get('id')

    def border(self, kind):
        """글자 테두리 — solid(정답) · dash(함께 받는 답)"""
        key = ('b', kind)
        if key not in self.cache:
            base = self.borders.find(HH + 'borderFill[@id="4"]')        # 네 변이 실선인 테두리
            b = copy.deepcopy(base)
            for side in ('leftBorder', 'rightBorder', 'topBorder', 'bottomBorder'):
                s = b.find(HH + side)
                s.set('type', 'SOLID' if kind == 'solid' else 'DASH')
                s.set('width', '0.4 mm' if kind == 'solid' else '0.2 mm')
                s.set('color', RED)
            self.cache[key] = self._add(self.borders, b)
        return self.cache[key]

    def red(self, base, bold=True, box=None):
        """base 글자 모양을 빨갛게(필요하면 굵게·테두리) 바꾼 새 글자 모양 번호"""
        key = ('c', base, bold, box)
        if key not in self.cache:
            c = copy.deepcopy(self.chars.find(HH + 'charPr[@id="%s"]' % base))
            c.set('textColor', RED)
            had = c.find(HH + 'bold')
            if bold and had is None:
                c.find(HH + 'underline').addprevious(etree.Element(HH + 'bold'))
            if not bold and had is not None:
                c.remove(had)
            if box:
                c.set('borderFillIDRef', self.border(box))
            self.cache[key] = self._add(self.chars, c)
        return self.cache[key]

    def save(self):
        r = self.tree.getroot()
        r.set('secCnt', '1')
        self.tree.write(self.path, xml_declaration=True, encoding='UTF-8', standalone=True)


# ── 본문 고치기 도구 ─────────────────────────────────────────────────────────────
def run(cid, s):
    r = etree.Element(HP + 'run', charPrIDRef=str(cid))
    etree.SubElement(r, HP + 't').text = s
    return r


def relayout(p):
    """줄 배치 기억(linesegarray)을 지워 한글이 다시 배치하게 한다"""
    for ls in p.findall(HP + 'linesegarray'):
        p.remove(ls)


def fill(head, p, *answers, pad=' '):
    """문단 p 의 빈칸 ( 　 ) 을 앞에서부터 차례로 빨간 정답으로 채운다"""
    for ans in answers:
        for r in p.findall(HP + 'run'):
            t = r.find(HP + 't')
            if t is None or len(t) or not t.text:
                continue
            m = BLANK.search(t.text)
            if not m:
                continue
            before, after = t.text[:m.start() + 1], t.text[m.end() - 1:]
            t.text = before
            red = run(head.red(r.get('charPrIDRef')), pad + ans + pad)
            r.addnext(red)
            red.addnext(run(r.get('charPrIDRef'), after))
            break
        else:
            raise SystemExit('빈칸을 못 찾음: %r · %s' % (ans, text(p)[:60]))
    relayout(p)


def cells(tbl):
    out = {}
    for tc in tbl.iter(HP + 'tc'):
        a = tc.find(HP + 'cellAddr')
        out[(int(a.get('rowAddr')), int(a.get('colAddr')))] = tc
    return out


def cell_p(tc):
    return tc.find(HP + 'subList').find(HP + 'p')


def put(head, tc, s, base='124'):
    """빈 표 칸에 빨간 굵은 글자를 넣는다"""
    p = cell_p(tc)
    assert not text(p).strip(), '빈 칸이 아님: ' + text(p)
    first = p.find(HP + 'run')
    first.addprevious(run(head.red(base), s))
    relayout(p)


def circle(head, tc, sep, ans, also=()):
    """「동그라미하기」 칸 — 정답은 실선 상자, 함께 받는 답은 점선 상자"""
    p = cell_p(tc)
    runs = p.findall(HP + 'run')
    assert len(runs) == 1, text(p)
    base = runs[0].get('charPrIDRef')
    opts = text(runs[0]).split(sep)
    assert ans in opts and all(a in opts for a in also), (ans, opts)
    new = []
    for i, o in enumerate(opts):
        if i:
            new.append(run(base, sep))
        if o == ans:
            new.append(run(head.red(base, True, 'solid'), o))
        elif o in also:
            new.append(run(head.red(base, False, 'dash'), o))
        else:
            new.append(run(base, o))
    runs[0].addprevious(new[0])
    for a, b in zip(new, new[1:]):
        a.addnext(b)
    p.remove(runs[0])
    relayout(p)


def note(head, p, s):
    """빈 문단(또는 제목 끝)에 빨간 작은 글씨를 붙인다"""
    p.append(run(head.red('130', bold=False), s))
    lsa = p.find(HP + 'linesegarray')
    if lsa is not None:
        p.remove(lsa)
        p.append(lsa)
    relayout(p)


# ── 정답 ──────────────────────────────────────────────────────────────────────
SORT = [  # 1.3 분류해 보기 (항목, 정답, 함께 받는 답) — concept.js 의 SORT_CARDS
    ('calc.py', '모듈', ()), ('mypackage/', '패키지', ()), ('pandas', '라이브러리', ('패키지',)),
    ('pyplot', '모듈', ()), ('module1.py', '모듈', ()), ('add', '모듈 안의 이름', ()),
    ('randint', '모듈 안의 이름', ()), ('random', '모듈', ('라이브러리',)), ('io/', '패키지', ()),
    ('pi', '모듈 안의 이름', ()),
]
ANATOMY = [  # 1.4 import 문 읽기 (물어보는 이름, 정답, 함께 받는 답) — concept.js 의 ANATOMY
    ('math', '모듈', ('라이브러리',)), ('matplotlib', '라이브러리', ('패키지',)), ('pyplot', '모듈', ()),
    ('randint', '함수·클래스', ()), ('tk', '별명', ()), ('plotting', '패키지', ()),
    ('hello', '함수·클래스', ()), ('module2', '모듈', ()),
]


def answer(head, ps):
    """ps — 13·14쪽의 최상위 문단들(차례대로)"""
    def find(s, start=0):
        for i in range(start, len(ps)):
            if s in text(ps[i]):
                return ps[i]
        raise SystemExit('문단을 못 찾음: ' + s)

    def table_after(s):
        i = ps.index(find(s))
        for p in ps[i:]:
            t = p.find('.//' + HP + 'tbl')
            if t is not None:
                return cells(t)
        raise SystemExit('표를 못 찾음: ' + s)

    # 머리 상자 — 왼쪽 칸 맨 아래에 「교사용 · 학생 배부 금지」
    hc = cells(ps[0].find('.//' + HP + 'tbl'))[(0, 0)]
    last = hc.find(HP + 'subList').findall(HP + 'p')[-1]
    tag = copy.deepcopy(last)
    for r in tag.findall(HP + 'run'):
        tag.remove(r)
    tag.insert(0, run(head.red(last.find(HP + 'run').get('charPrIDRef')), '교사용 · 학생 배부 금지'))
    relayout(tag)
    last.addnext(tag)

    # 1.1 모듈
    fill(head, find('모듈이란 변수·함수를'), '.py', 'import')
    good = table_after('모듈로 나누면 좋은 점')
    for row, s in ((1, '재사용'), (2, '관리 (유지 보수)'), (3, '협업 (분업)')):
        put(head, good[(row, 0)], s)

    # 1.2 모듈 ⊂ 패키지 ⊂ 라이브러리
    lay = table_after('번호 ①~④ 가 각각')
    fill(head, cell_p(lay[(1, 1)]), '.py')
    fill(head, cell_p(lay[(2, 1)]), '폴더')
    fill(head, cell_p(lay[(3, 1)]), '꾸러미')
    for row, s in ((1, '③ (frame.py)'), (2, '② (core/)'), (3, '① (pandas/)'), (4, '④ (DataFrame)')):
        put(head, lay[(row, 2)], s)
    fill(head, find('__init__.py 의 역할'), '「이 폴더는 패키지」 표지판 · import 하면 먼저 한 번 실행')
    fill(head, find('pd.read_csv( ) 는 사실'), 'pandas/io/parsers/readers.py')

    # 1.3 분류해 보기 — 표가 13쪽에서 14쪽으로 이어진다(같은 표)
    note(head, find('1.3 분류해 보기'), '　　※ 실선 상자 = 정답 · 점선 상자 = 함께 받는 답(둘 다 맞음)')
    srt = table_after('1.3 분류해 보기')
    for row, (name, ans, also) in enumerate(SORT, 1):
        assert text(srt[(row, 0)]).strip() == name, (name, text(srt[(row, 0)]))
        circle(head, srt[(row, 2)], ' · ', ans, also)

    # 1.4 import 문 읽기
    note(head, find('1.4 import 문 읽기'), '　　※ 실선 상자 = 정답 · 점선 상자 = 함께 받는 답')
    ana = table_after('1.4 import 문 읽기')
    for row, (name, ans, also) in enumerate(ANATOMY, 1):
        assert text(ana[(row, 1)]).strip() == name, (name, text(ana[(row, 1)]))
        circle(head, ana[(row, 2)], ' / ', ans, also)
    fill(head, find('import 문의 점( . )은'), '폴더')
    fill(head, find('처럼 뒤에 괄호를 붙여'), '함수')
    fill(head, find('as 뒤의 이름은'), '별명')

    # 1.5 모듈은 어디서 올까?
    fill(head, find('라이브러리는 pip install 로 먼저'), '외부')
    fill(head, find('VS Code 는'), '터미널')
    fill(head, find('VS Code 는'), '!', pad='')
    where = table_after('VS Code 는')
    for row, s in ((1, '파일만 만들면 된다 (같은 폴더)'), (2, '없음 — 설치 없이 바로 import'), (3, '터미널에서 pip install')):
        put(head, where[(row, 2)], s)
    fill(head, find('1) ▶ 를 눌러 실행한다'), 'ModuleNotFoundError')
    fill(head, find('4) main.py 첫 줄에'), 'SyntaxError 가 난다')

    # 14쪽 아래의 빈 문단 두 개 — 함께 받는 답과 오류 풀이
    tail = [p for p in ps[ps.index(find('4) main.py 첫 줄에')) + 1:] if not text(p).strip()]
    assert len(tail) >= 2, '14쪽 끝의 빈 문단이 모자람'
    note(head, tail[0], '※ 함께 받는 답 — 꾸러미: 묶음·모음 · 폴더: 디렉터리 · 점(.): 패키지 · 함수: 클래스·메서드 · '
                        '별명: 별칭 · 터미널: 명령 창(cmd)')
    note(head, tail[1], "※ 1) No module named 'gtts' · 4) pip 는 파이썬 코드가 아니라 터미널 명령이라 "
                        'SyntaxError: invalid syntax')


# ── 13·14쪽만 남기기 ─────────────────────────────────────────────────────────────
def main(src, out):
    work = tempfile.mkdtemp(prefix='notekey_')
    with zipfile.ZipFile(src) as z:
        z.extractall(work)
    hpf_path = os.path.join(work, 'Contents', 'content.hpf')
    hpf = etree.parse(hpf_path)
    items = {i.get('id'): i for i in hpf.getroot().iter('{%s}item' % NS['opf'])}
    spine = [i.get('idref') for i in hpf.getroot().iter('{%s}itemref' % NS['opf'])]
    secs = [s for s in spine if s.startswith('section')]

    def sec_path(sid):
        return os.path.join(work, items[sid].get('href'))

    target = next(s for s in secs if '플밍 학습지 ⑦' in open(sec_path(s), encoding='utf-8').read())
    tree = etree.parse(sec_path(target))
    root = tree.getroot()
    top = list(root)
    start = next(i for i, p in enumerate(top) if '플밍 학습지 ⑦' in text(p))
    end = next(i for i in range(start + 1, len(top)) if top[i].get('pageBreak') == '1')
    assert '불러오기' in text(top[end]), '15쪽 첫머리가 「2. 불러오기」 가 아님: ' + text(top[end])[:40]
    keep = top[start:end]
    assert any('4) main.py 첫 줄에' in text(p) for p in keep), '14쪽 끝 문단이 없음'

    # 구역 정의(secPr + 단 정의)를 첫 문단으로 옮기고, 쪽 번호를 13 부터
    secrun = copy.deepcopy(top[0].find(HP + 'run'))
    assert secrun.find(HP + 'secPr') is not None
    secrun.find('.//' + HP + 'startNum').set('page', '13')
    pagenum = None
    for s in secs:
        e = etree.parse(sec_path(s)).getroot().find('.//' + HP + 'pageNum')
        if e is not None:
            pagenum = copy.deepcopy(e.getparent())
            break
    if pagenum is not None:
        secrun.append(pagenum)
    for p in top:
        root.remove(p)
    for p in keep:
        root.append(p)
    keep[0].set('pageBreak', '0')
    keep[0].insert(0, secrun)

    head = Head(os.path.join(work, 'Contents', 'header.xml'))
    answer(head, keep)
    head.save()
    tree.write(sec_path(target), xml_declaration=True, encoding='UTF-8', standalone=True)

    # 다른 구역 · 쓰지 않는 그림을 꾸러미에서 빼고, 남은 구역을 section0.xml 로 바꾼다
    # (content.hpf 와 META-INF/container.rdf 두 곳이 구역 파일을 가리킨다 — 둘 다 고쳐야 한글이 연다)
    used = set(re.findall(r'binaryItemIDRef="([^"]+)"', open(sec_path(target), encoding='utf-8').read()))
    man = hpf.getroot().find('{%s}manifest' % NS['opf'])
    gone = []
    for sid, it in list(items.items()):
        drop = (sid in secs and sid != target) or (it.get('href', '').startswith('BinData/') and sid not in used)
        if drop:
            gone.append(it.get('href'))
            os.remove(os.path.join(work, it.get('href')))
            man.remove(it)
            for ref in list(hpf.getroot().iter('{%s}itemref' % NS['opf'])):
                if ref.get('idref') == sid:
                    ref.getparent().remove(ref)
    old_href = items[target].get('href')
    new_href = 'Contents/section0.xml'
    os.replace(os.path.join(work, old_href), os.path.join(work, new_href))
    items[target].set('id', 'section0')
    items[target].set('href', new_href)
    for ref in hpf.getroot().iter('{%s}itemref' % NS['opf']):
        if ref.get('idref') == target:
            ref.set('idref', 'section0')
    hpf.write(hpf_path, xml_declaration=True, encoding='UTF-8', standalone=True)
    rdf_path = os.path.join(work, 'META-INF', 'container.rdf')
    rdf = etree.parse(rdf_path)
    RDF = '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}'
    for d in list(rdf.getroot()):
        refs = [d.get(RDF + 'about')] + [c.get(RDF + 'resource') for c in d]
        if any(r in gone for r in refs):
            rdf.getroot().remove(d)
            continue
        for e in [d] + list(d):
            for k in (RDF + 'about', RDF + 'resource'):
                if e.get(k) == old_href:
                    e.set(k, new_href)
    rdf.write(rdf_path, xml_declaration=True, encoding='UTF-8', standalone=True)
    st = os.path.join(work, 'settings.xml')
    s = open(st, encoding='utf-8').read()
    open(st, 'w', encoding='utf-8').write(re.sub(r'paraIDRef="\d+" pos="\d+"', 'paraIDRef="0" pos="0"', s))

    # 다시 묶기 — mimetype 은 맨 앞에, 압축하지 않고
    if os.path.exists(out):
        os.remove(out)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(os.path.join(work, 'mimetype'), 'mimetype', compress_type=zipfile.ZIP_STORED)
        for d, _, fs in os.walk(work):
            for f in fs:
                full = os.path.join(d, f)
                rel = os.path.relpath(full, work).replace(os.sep, '/')
                if rel != 'mimetype':
                    z.write(full, rel)
    shutil.rmtree(work)
    print('만듦: %s (문단 %d개, 그림 %s)' % (out, len(keep), ', '.join(sorted(used)) or '없음'))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
