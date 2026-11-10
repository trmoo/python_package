/*! 📦 패키지 공작소 — © 2026 티쳐무 · 모든 권리 보유
 *  📝 개념 정리 빈칸 — 자료 (2026-11-10 사용자 지시).
 *  화면 곳곳의 핵심 문장에서 중요한 낱말을 빈칸으로 비워, 학생이 스스로 채우며 개념을 정리한다.
 *
 *  문장 꼴: 보통 글자 · `코드` · {{정답|다른 정답|…}}  (맨 앞 정답이 힌트·칸 너비의 기준)
 *  lines 의 덧붙임 —
 *    icon·desc : 「왜 나눌까」 오른쪽 카드처럼 제목 자리가 빈칸일 때, 아이콘과 설명
 *    label     : 표의 왼쪽 칸(무엇)
 *    code      : 빈칸 문장 위에 함께 보여 줄 import 문
 *    story     : 미션 이야기 자리 — 빈칸을 정답으로 채우면 missions.js 의 story 와 글자까지 같아야 한다(시험이 지킨다)
 *  after: 'shown' — 예측 표를 「실행해서 확인」 한 다음에만 연다(먼저 열면 빈칸 채점이 예측의 답을 알려 준다).
 *
 *  ⚠ 빈칸의 정답이 같은 문장의 보통 글자에 그대로 보이면 안 된다(시험이 막는다).
 *  ⚠ ④ 수행평가 탭에는 넣지 않는다 — 문항의 답(import 꼴)을 알려 주게 된다.
 *  ⚠ 활동 완료(탭 잠금) 조건에는 넣지 않았다 — 이미 앞 탭을 끝낸 학생이 다시 잠기지 않게.
 *  ⚠ node 로 불러다 시험하므로 DOM 을 만들지 말 것.
 */

export const BLANKS = [
  { screen: 'concept/why', title: '📝 모듈이란?', lines: [
    { id: 'why.def', text: '변수·함수를 담아 둔 {{.py|py}} 파일 하나. 다른 파일에서 {{import|임포트}} 로 불러 쓴다.' },
    { id: 'why.reuse', icon: '♻️', text: '{{재사용|재사용성|재활용|다시 사용|다시 쓰기}}', desc: '한 번 만든 함수를 여러 프로그램이 import 해서 쓴다. 복사·붙이기가 필요 없다.' },
    { id: 'why.manage', icon: '🧹', text: '{{관리|관리하기|유지 보수|유지보수|유지 관리}}', desc: '고칠 곳이 한 군데. 기능별로 파일이 나뉘어 있어 찾기도 쉽다.' },
    { id: 'why.team', icon: '🤝', text: '{{협업|협동|분업|공동 작업|팀 작업}}', desc: '큰 프로그램을 모듈로 나눠 팀원이 하나씩 맡아 만든다. (교과서 207쪽 「모듈화」)' },
  ] },
  { screen: 'concept/layers', title: '📝 표로 정리', lines: [
    { id: 'layers.mod', label: '📄 모듈', text: '{{.py|py}} 파일 하나' },
    { id: 'layers.pkg', label: '📦 패키지', text: '{{폴더|디렉터리|디렉토리}} + {{__init__.py|__init__}}' },
    { id: 'layers.lib', label: '📚 라이브러리', text: '패키지·모듈 {{꾸러미|묶음|모음}}' },
  ] },
  { screen: 'concept/anatomy', title: '📝 import 문 읽는 법', lines: [
    { id: 'anatomy.dot', text: 'import 문의 점( . )은 「{{폴더|패키지}} 안으로 들어간다」 는 뜻 — `matplotlib.pyplot` 은 matplotlib 안의 pyplot' },
    { id: 'anatomy.call', text: '`randint( )` · `gTTS( )` 처럼 뒤에 괄호를 붙여 부르는 것은 모듈 안의 {{함수|함수·클래스|클래스|메소드|메서드}}' },
    { id: 'anatomy.as', text: '`as` 뒤의 이름은 {{별명|별칭|alias|약칭|줄임말}} — `import pandas as pd` 다음부터는 pd 로 부른다' },
  ] },
  { screen: 'concept/where', title: '📝 pip 정리 (141쪽 Tip)', lines: [
    { id: 'where.ext', text: '{{외부|외부 라이브러리}} 라이브러리는 `pip install` 로 먼저 설치한다' },
    { id: 'where.where', text: 'VS Code 는 {{터미널|terminal|명령 창|명령창|cmd}} 에서 `pip install gtts`, 코랩은 셀에 {{!|느낌표}}`pip install gtts`' },
  ] },
  { screen: 'import/forms', title: '📝 생기는 이름 정리', after: 'shown', lines: [
    { id: 'forms.r1', code: 'import calc', text: '생기는 이름 {{calc}} · 부르기 {{calc.add|calc.add(2, 3)|calc.add( )}}`(2, 3)`' },
    { id: 'forms.r2', code: 'from calc import add', text: '생기는 이름 {{add}} · 부르기 {{add|add(2, 3)|add( )}}`(2, 3)`' },
    { id: 'forms.r3', code: 'import calc as c', text: '생기는 이름 {{c}} · 부르기 {{c.add|c.add(2, 3)|c.add( )}}`(2, 3)`' },
  ] },
  { screen: 'import/pkgforms', title: '📝 hello( ) 부르기 정리', after: 'shown', lines: [
    { id: 'pkg.r1', code: 'import mypackage.module1', text: '부르기 {{mypackage.module1.hello|mypackage.module1.hello( )}}`( )`' },
    { id: 'pkg.r2', code: 'from mypackage import module1', text: '부르기 {{module1.hello|module1.hello( )}}`( )`' },
    { id: 'pkg.r3', code: 'from mypackage.module1 import hello', text: '부르기 {{hello|hello( )}}`( )`' },
    { id: 'pkg.only', text: '`import mypackage` 처럼 폴더(패키지)만 불러오면 그 안의 {{모듈|모듈 파일|파일|.py 파일}} 은 따라오지 않는다' },
  ] },
  { screen: 'build/m1', title: '📝 정리', lines: [
    { id: 'm1.story', story: true, text: '인사하는 함수를 따로 파일에 담아 두고, main.py 에서 불러 써 봐요. 이 파일 하나가 바로 「{{모듈|module}}」 이에요.' },
    { id: 'm1.call', text: '`import greet` 로 불러온 hello 함수는 {{greet.hello|greet.hello( )|greet.hello("민지")}}`("민지")` 처럼 부른다' },
    { id: 'm1.run', text: '▶ 는 지금 {{열려 있는|열린|열려있는|보고 있는|선택한|선택된|띄워 둔}} 파일을 실행한다' },
  ] },
  { screen: 'build/m2', title: '📝 정리', lines: [
    { id: 'm2.story', story: true, text: '모듈이 늘어나면 {{폴더|디렉터리|디렉토리}}에 모아 관리해요. 그 안에 {{__init__.py|__init__}} 를 넣으면 「{{패키지|package}}」 가 됩니다. greet.py 를 mytools 로 옮겨 봐요.' },
    { id: 'm2.from', text: '옮긴 뒤에는 `from` {{mytools}} `import greet` — 담아 둔 곳의 이름부터 적는다' },
  ] },
  { screen: 'build/m3', title: '📝 정리', lines: [
    { id: 'm3.from', text: '`add(2, 3)` 처럼 함수 이름만으로 부르려면 {{from}} `mytools.calc import add` 꼴로 불러온다' },
    { id: 'm3.print', text: '값을 돌려주는(return) 함수는 {{print}}`( )` 로 감싸야 결과가 화면에 보인다' },
  ] },
  { screen: 'build/m4', title: '📝 정리', lines: [
    { id: 'm4.once', text: '모듈과 `__init__.py` 는 처음 import 할 때 {{한|1|하나|딱 한}} 번만 실행된다' },
    { id: 'm4.main', text: '직접 실행한 파일의 `__name__` 은 {{__main__|"__main__"}}, 불려 간 파일은 자기 이름' },
  ] },
];
