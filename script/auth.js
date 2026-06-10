/* =========================================================
   Jeju stay · 사용자 로그인(구글) 공통 모듈
   - 헤더의 로그인 아이콘(.login_box)을 자동으로 구글 로그인 버튼으로 연결
   - 로그인 시: 프로필(사진/이름) 표시 + 드롭다운(내 예약 / 로그아웃)
   - window.Auth 로 다른 스크립트에서 사용 가능
   ========================================================= */
(function (global) {
  "use strict";

  function configured() {
    var c = global.FIREBASE_CONFIG;
    return !!(typeof firebase !== "undefined" && c && c.apiKey &&
      c.apiKey.indexOf("여기에") === -1 && c.projectId &&
      c.projectId.indexOf("여기에") === -1);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var Auth = {
    configured: configured(),
    _user: null,
    _listeners: [],
    onChange: function (cb) { this._listeners.push(cb); cb(this._user); },
    currentUser: function () { return this._user; },
    uid: function () { return this._user ? this._user.uid : null; },
    isAdmin: function () {
      if (!this._user || !this._user.email) return false;
      var admins = (global.ADMIN_EMAILS || []).map(function (e) { return e.toLowerCase(); });
      if (!admins.length) return true;
      return admins.indexOf(this._user.email.toLowerCase()) > -1;
    },
    signInWithGoogle: function () {
      if (!this.configured) {
        alert("로그인은 Firebase 설정 후 사용할 수 있습니다.");
        return Promise.reject(new Error("not-configured"));
      }
      var provider = new firebase.auth.GoogleAuthProvider();
      return firebase.auth().signInWithPopup(provider).catch(function (err) {
        // 팝업이 차단되거나 지원되지 않으면 리디렉션 방식으로 자동 전환
        if (err && (err.code === "auth/popup-blocked" ||
                    err.code === "auth/cancelled-popup-request" ||
                    err.code === "auth/operation-not-supported-in-this-environment")) {
          return firebase.auth().signInWithRedirect(provider);
        }
        throw err;
      });
    },
    signOut: function () {
      if (!this.configured) return Promise.resolve();
      return firebase.auth().signOut();
    }
  };
  global.Auth = Auth;

  if (Auth.configured) {
    if (!firebase.apps.length) firebase.initializeApp(global.FIREBASE_CONFIG);
    firebase.auth().onAuthStateChanged(function (u) {
      Auth._user = u;
      Auth._listeners.forEach(function (cb) { try { cb(u); } catch (e) {} });
    });
    // 리디렉션 로그인 후 돌아왔을 때의 오류 표시
    firebase.auth().getRedirectResult().catch(function (err) {
      if (err && err.code) {
        console.error("[Auth] redirect 로그인 오류", err.code, err.message);
        if (err.code === "auth/unauthorized-domain") {
          alert("이 주소는 로그인 허용 목록에 없습니다. (Firebase 승인된 도메인 확인)");
        }
      }
    });
  }

  /* ---------- 헤더 UI 자동 연결 ---------- */
  function initHeader() {
    var box = document.querySelector(".site-header .login_box");
    if (!box) return;
    var loginLink = box.querySelector('a[aria-label="로그인"]') || box.querySelector("a");
    if (!loginLink) return;

    var originalHtml = loginLink.innerHTML;        // 기본 사람 아이콘
    box.style.position = "relative";

    // 드롭다운 생성
    var dropdown = document.createElement("div");
    dropdown.className = "user-dropdown";
    dropdown.hidden = true;
    box.appendChild(dropdown);

    function closeDropdown() { dropdown.hidden = true; }
    document.addEventListener("click", function (e) {
      if (!box.contains(e.target)) closeDropdown();
    });

    function renderLoggedOut() {
      loginLink.innerHTML = originalHtml;
      loginLink.setAttribute("aria-label", "로그인");
      loginLink.title = "구글로 로그인";
      dropdown.hidden = true;
      dropdown.innerHTML = "";
      loginLink.onclick = function (e) {
        e.preventDefault();
        Auth.signInWithGoogle().catch(function (err) {
          if (err && err.code === "auth/popup-closed-by-user") return;
          if (err && err.code === "auth/cancelled-popup-request") return;
          console.error("[Auth] 로그인 실패", err);
          if (err && err.code === "auth/unauthorized-domain") {
            alert("이 주소는 로그인 허용 목록에 없습니다.\nFirebase 승인된 도메인에 현재 주소를 추가하거나, localhost 로 접속해 테스트하세요.");
          } else if (err && err.code === "auth/operation-not-allowed") {
            alert("구글 로그인이 아직 켜져 있지 않습니다.\nFirebase 콘솔 → Authentication → 로그인 방법 → Google 사용 설정을 확인하세요.");
          } else if (err && err.code !== "not-configured") {
            alert("로그인에 실패했습니다.\n오류 코드: " + (err.code || err.message || "알 수 없음"));
          }
        });
      };
    }

    function renderLoggedIn(u) {
      var name = u.displayName || (u.email ? u.email.split("@")[0] : "사용자");
      var photo = u.photoURL;
      if (photo) {
        loginLink.innerHTML = '<img class="user-avatar" src="' + escapeHtml(photo) + '" alt="' + escapeHtml(name) + '" referrerpolicy="no-referrer">';
      } else {
        loginLink.innerHTML = '<span class="user-avatar user-avatar--initial">' + escapeHtml(name.charAt(0).toUpperCase()) + '</span>';
      }
      loginLink.setAttribute("aria-label", "내 계정");
      loginLink.title = name;

      dropdown.innerHTML =
        '<div class="user-info">' +
          '<strong>' + escapeHtml(name) + '</strong>' +
          (u.email ? '<span>' + escapeHtml(u.email) + '</span>' : '') +
        '</div>' +
        '<a class="user-menu-item" href="my-reservations.html">내 예약 내역</a>' +
        '<button type="button" class="user-menu-item user-logout">로그아웃</button>';

      loginLink.onclick = function (e) {
        e.preventDefault();
        dropdown.hidden = !dropdown.hidden;
      };
      dropdown.querySelector(".user-logout").addEventListener("click", function () {
        Auth.signOut();
        closeDropdown();
      });
    }

    Auth.onChange(function (u) {
      if (u) renderLoggedIn(u);
      else renderLoggedOut();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeader);
  } else {
    initHeader();
  }
})(window);
