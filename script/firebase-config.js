/* =========================================================
   Firebase 설정 파일
   ---------------------------------------------------------
   ▶ 아래 firebaseConfig 값을 Firebase 콘솔에서 복사해 붙여넣으세요.
     (콘솔 → 프로젝트 설정 → 일반 → "내 앱" → SDK 설정 및 구성 → 구성)

   ▶ ADMIN_EMAILS 에는 글쓰기 권한을 줄 관리자 이메일을 넣으세요.
     (Firebase 콘솔 → Authentication 에서 이 이메일로 계정을 만들어야 함)

   ▶ 값을 채우기 전까지는 자동으로 브라우저 localStorage(로컬 테스트) 모드로 동작합니다.
   ========================================================= */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCpdEFyWCAyuSPOJhV4N4vKOGO8tWgaqR4",
  authDomain: "jejustay-5b019.firebaseapp.com",
  projectId: "jejustay-5b019",
  storageBucket: "jejustay-5b019.firebasestorage.app",
  messagingSenderId: "906768034718",
  appId: "1:906768034718:web:9415cb2bab146c9136048f",
  measurementId: "G-Q484Y88CFS"
};

/* 관리자 이메일 목록 (이 계정으로 로그인해야 작성/수정/삭제 가능) */
window.ADMIN_EMAILS = [
  "ujin2019@gmail.com"
];
