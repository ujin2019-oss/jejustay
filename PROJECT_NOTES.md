# 제주스테이(Jeju stay) 백엔드 작업 기록

> 정적 웹사이트(`ujin2019-oss/jejustay`)에 공지사항 → 예약 → 사용자 로그인 순으로
> **Firebase** 백엔드를 붙인 전체 작업 흐름 정리.

---

## 작업 순서 (시간순)

### 1단계 · 공지사항 게시판 만들기 (정적, localStorage)
- 메인페이지 하단 "공지사항 & 뉴스" 섹션을 참고해 서브페이지 게시판을 신규 제작
- 백엔드가 없던 단계라 우선 브라우저 **localStorage**에 글을 저장하는 방식으로 구현
- 만든 것:
  - `notice.html` — 게시판 (목록 / 상세 / 글쓰기 / 수정 / 삭제 + 검색 + 페이지네이션)
  - `script/notice.js` — 공지 데이터 저장 + 메인페이지 최신순 자동 표시
  - 메인페이지(`index.html`) 하단 공지 영역을 저장소 연동으로 교체
  - 전 페이지 상단/모바일 메뉴의 "공지사항" 링크 → `notice.html` 연결

### 2단계 · 백엔드 도입 결정 → Firebase 선택
- "여러 사용자가 공지를 공유"하려면 백엔드가 필요 → **Firebase(Firestore)** 선택
- 이유: 정적 사이트라 **별도 서버 없이** 브라우저에서 바로 연동 가능, 무료 요금제로 충분
- 정책: **공지 작성은 관리자만**, 방문자는 읽기만

### 3단계 · Firebase 콘솔 설정 (최초 1회)
1. Firebase 프로젝트 생성 → ID: `jejustay-5b019` (Spark 무료 요금제)
2. **Firestore Database** 생성 (NoSQL / 서울 리전)
3. **Authentication → 이메일/비밀번호** 활성화 → 관리자 계정 등록 (`ujin2019@gmail.com`)
4. **보안 규칙** 게시 (`firestore.rules` 내용)
5. **웹 앱 등록** → 설정값을 `script/firebase-config.js` 에 입력

### 4단계 · 공지사항 Firebase 연동 완료 → 1차 커밋
- `script/notice.js` 를 Firestore 우선 + localStorage 폴백 구조로 재작성 (비동기)
- 관리자 로그인 모달 추가 → 로그인해야만 글쓰기/수정/삭제 노출
- `firestore.rules`, `FIREBASE_SETUP.md` 추가
- ✅ 커밋 `공지사항 게시판 추가 및 Firebase 백엔드 연동`

### 5단계 · 예약공간 백엔드 → 2차 커밋
- 기존 `reservation.html` 은 "예약하기" 누르면 알림만 떴음 → 실제 저장되도록 연동
- 만든/바꾼 것:
  - `script/reservation-store.js` — 예약 저장, 관리자 조회·확정·취소·삭제, 날짜 잠금
  - `reservation.html` — 예약 저장 + 달력에 **예약마감 자동표시** + 지난날짜 비활성
  - `admin-reservations.html` — **관리자 예약 관리 페이지** 신규 (상태 필터, 확정/취소/삭제)
  - `firestore.rules` — 예약/날짜 규칙 추가 (콘솔에 재게시)
- 중복 예약 방지: `availability` 문서 ID를 `객실타입__날짜` 로 고정 → 같은 날짜 재생성 거부
- ✅ 커밋 `예약공간 백엔드 연동 (예약 저장/관리자 관리/날짜 중복방지)`

### 6단계 · 사용자 구글 로그인 → 3차 커밋
- 헤더 로그인 아이콘(👤)에 **구글 로그인** 연결
- 만든/바꾼 것:
  - `script/auth.js` — 구글 로그인 공통 모듈 + 헤더 프로필/드롭다운 (팝업 차단 시 리디렉션 폴백)
  - `my-reservations.html` — **내 예약 내역** 페이지 신규 (본인 예약만 조회)
  - `reservation.html` — 로그인 시 이름/이메일 **자동입력**, 예약에 `userId` 기록
  - `firestore.rules` — 본인 예약 조회(isOwner) 허용 (콘솔에 재게시)
  - 전 페이지 헤더에 구글 로그인 연동 + 아바타/드롭다운 스타일
- Firebase 콘솔: **Google 로그인 제공업체 활성화**, 승인된 도메인에 `ujin2019-oss.github.io` 추가
- 구글 로그인은 `file://` 불가 → 테스트는 `localhost` 서버로 진행
- ✅ 커밋 `사용자 구글 로그인 추가 (프로필 표시·내 예약 내역·예약 자동입력)`

---

## 핵심 정보 (한눈에)

| 항목 | 값 |
| --- | --- |
| GitHub 저장소 | `ujin2019-oss/jejustay` |
| 구조 | 정적 사이트 + Firebase 클라우드 백엔드 (별도 서버 없음 = BaaS) |
| Firebase 프로젝트 ID | `jejustay-5b019` (Spark 무료) |
| 관리자 | `ujin2019@gmail.com` (이메일/비밀번호 로그인) |
| 사용자 로그인 | 구글 로그인 |
| 승인된 도메인 | `localhost`, `ujin2019-oss.github.io` |
| 설정 파일 | `script/firebase-config.js` |
| 보안 규칙 | `firestore.rules` (※ Firebase 콘솔에 "게시"해야 적용) |

---

## 페이지 구성

| 페이지 | 설명 | 접근 |
| --- | --- | --- |
| `index.html` | 메인 (하단 최신 공지 자동표시) | 누구나 |
| `rooms.html` / `programs.html` | 스테이/프로그램 소개 | 누구나 |
| `reservation.html` | 예약공간 (달력 + 예약폼) | 누구나 |
| `notice.html` | 공지사항 게시판 | 읽기 누구나 / 작성 관리자 |
| `my-reservations.html` | 내 예약 내역 | 로그인 사용자 |
| `admin-reservations.html` | 예약 관리 | 관리자 (메뉴에 없음 → **북마크 필요**) |

---

## Firestore 데이터 구조

| 컬렉션 | 내용 | 권한 |
| --- | --- | --- |
| `notices` | 공지글 | 읽기 누구나 / 작성·수정·삭제 관리자 / 조회수 +1 누구나 |
| `reservations` | 예약(개인정보 포함) | 작성 누구나 / 읽기·수정·삭제 관리자 (+ 본인 글 읽기) |
| `availability` | 예약된 날짜(개인정보 없음) | 읽기 누구나 / 생성 누구나(중복불가) / 삭제 관리자 |

---

## 로컬 테스트 (구글 로그인 확인용)

> 구글 로그인은 `file://` 에서 안 됨 → `localhost` 서버 필요. (Node 설치돼 있어야 함)

프로젝트 폴더에서 실행 후 `http://localhost:5500` 접속:

```
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const t={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json'};http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(root,p);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end('Not Found');return;}r.writeHead(200,{'Content-Type':t[path.extname(f).toLowerCase()]||'application/octet-stream'});r.end(d);});}).listen(5500,()=>console.log('http://localhost:5500'));"
```

---

## 개념 메모 — "서버"

- 이 프로젝트는 **내가 만든 서버가 없음**. Firebase가 DB+로그인을 대신 제공 = **BaaS** 방식.
- 별도 서버(Node 등)는 결제 비밀키·이메일 발송 등 **비밀키가 필요한 기능**에 필요.
- 서버가 없으니 보안은 **Firestore 보안 규칙**이 담당 → 그래서 규칙 게시가 중요.
- Firebase `apiKey` 는 공개돼도 되는 값 (실제 방어선은 규칙).

---

## 다음 후보
- [ ] 모바일(햄버거 메뉴)에 구글 로그인 버튼 연결
- [ ] GitHub Pages로 실제 사이트 공개
- [ ] 예약 시 이메일 알림 (EmailJS 등 별도 서비스 필요)
- [ ] Firebase API 키 사용 제한 (선택, 보안 강화)
