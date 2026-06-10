# Firebase 공지사항 백엔드 설정 가이드

이 사이트의 공지사항은 **Firebase Firestore**(클라우드 DB) + **Firebase Authentication**(관리자 로그인)으로 동작합니다.
아래 순서대로 한 번만 설정하면 됩니다. (무료 요금제 Spark 플랜으로 충분)

> 설정 전까지는 자동으로 **브라우저 localStorage(로컬 테스트 모드)** 로 동작하므로, 지금 바로 화면 확인은 가능합니다.

---

## 1. Firebase 프로젝트 만들기
1. https://console.firebase.google.com 접속 → **프로젝트 추가**
2. 프로젝트 이름 입력 (예: `jejustay`) → 생성

## 2. Firestore 데이터베이스 만들기
1. 좌측 메뉴 **빌드 → Firestore Database** → **데이터베이스 만들기**
2. 위치 선택 (예: `asia-northeast3` 서울) → **프로덕션 모드**로 시작
3. 만들어지면 상단 **규칙(Rules)** 탭으로 이동 →
   이 저장소의 `firestore.rules` 파일 내용을 복사해 붙여넣고 **게시**
   - ⚠️ 규칙 안의 `admin@jejustay.co.kr` 를 **본인 관리자 이메일**로 변경하세요.

## 3. 관리자 로그인(인증) 설정
1. 좌측 메뉴 **빌드 → Authentication** → **시작하기**
2. **로그인 방법** 탭 → **이메일/비밀번호** 사용 설정(활성화)
3. **Users** 탭 → **사용자 추가** → 관리자 이메일 + 비밀번호 등록
   - 여기서 만든 이메일이 글쓰기 권한을 가집니다.

## 4. 웹 앱 등록 & 설정값 복사
1. 좌측 상단 **프로젝트 개요 ⚙️ → 프로젝트 설정**
2. 하단 **내 앱** → **웹(</>)** 아이콘 클릭 → 앱 닉네임 입력 후 등록
3. 표시되는 `firebaseConfig` 객체 값을 복사

## 5. 설정값 붙여넣기
`script/firebase-config.js` 파일을 열어 두 곳을 수정:

```js
window.FIREBASE_CONFIG = {
  apiKey: "복사한값",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

// 3단계에서 만든 관리자 이메일과 동일하게
window.ADMIN_EMAILS = ["내관리자@이메일.com"];
```

> `firestore.rules` 의 이메일과 `firebase-config.js` 의 `ADMIN_EMAILS` 는 **같은 이메일**이어야 합니다.

## 6. 배포 도메인 허용 (GitHub Pages 사용 시)
- Authentication → **설정 → 승인된 도메인**에
  배포 주소(예: `ujin2019-oss.github.io`)와 `localhost` 가 있는지 확인/추가

---

## 사용 방법
- 공지사항 페이지(`notice.html`) 우측 상단 **관리자 로그인** 클릭 → 관리자 계정으로 로그인
- 로그인하면 **글쓰기 / 수정 / 삭제** 버튼이 나타남
- 처음 로그인 시, 비어 있으면 샘플 공지 5건이 자동으로 들어갑니다
- 작성한 글은 메인페이지 하단 **공지사항 & 뉴스** 영역에 최신순으로 자동 표시됩니다

## 참고
- `apiKey` 등은 웹 클라이언트에 노출되어도 되는 값입니다. 실제 보안은 `firestore.rules` 가 담당합니다.
- 보안 규칙을 꼭 게시해야 관리자만 글을 쓸 수 있습니다. (규칙 미설정 시 누구나 쓰기 가능해질 수 있음)
