/* =========================================================
   Jeju stay · 공지사항 데이터 모듈
   - 기본: Firebase Firestore (클라우드 공유 + 관리자 인증)
   - 폴백: Firebase 설정이 없으면 localStorage(로컬 테스트)
   - 모든 데이터 메서드는 Promise 반환 (비동기)
   ========================================================= */
(function (global) {
  "use strict";

  /* ----- 공통 상수 ----- */
  var CATEGORY_CLASS = {
    "공지": "c-notice",
    "이벤트": "c-news",
    "뉴스": "c-info",
    "이용안내": "c-event"
  };
  var CATEGORIES = ["공지", "이벤트", "뉴스", "이용안내"];

  var SEED = [
    { category: "공지", title: "홈페이지 리뉴얼 오픈",
      content: "안녕하세요, 제주스테이입니다.\n\n보다 편리한 예약과 다양한 정보 제공을 위해 홈페이지를 새롭게 단장하였습니다.\n앞으로도 자연 속 프라이빗한 휴식 공간을 위해 최선을 다하겠습니다.\n많은 이용 부탁드립니다.",
      date: "2025-04-25", views: 152 },
    { category: "이용안내", title: "바베큐 이용 안내",
      content: "바베큐 시설 이용 시 아래 사항을 확인해주세요.\n\n- 이용 시간: 18:00 ~ 22:00\n- 바베큐 세트는 예약 시 신청 가능합니다.\n- 사용 후 뒷정리는 깨끗하게 부탁드립니다.\n- 우천 시 실내 공간으로 변경될 수 있습니다.",
      date: "2025-05-01", views: 98 },
    { category: "뉴스", title: "펜션 주변 여행지 추천",
      content: "제주스테이 주변에서 즐길 수 있는 여행지를 소개합니다.\n\n1. 한라산 - 차로 20분\n2. 우도 - 성산항까지 20분\n3. 중문 관광단지 - 차로 30분\n\n자연을 만끽할 수 있는 코스로 특별한 추억을 만들어보세요.",
      date: "2025-05-20", views: 76 },
    { category: "이벤트", title: "6월 제주 감성 패키지 이벤트",
      content: "6월 한 달간 진행되는 감성 패키지 이벤트!\n\n- 2박 이상 예약 시 조식 서비스 무료 제공\n- 웰컴 드링크 & 제주 굿즈 증정\n- 기간: 2025년 6월 1일 ~ 6월 30일\n\n자세한 내용은 고객센터로 문의해주세요.",
      date: "2025-05-20", views: 214 },
    { category: "공지", title: "여름 성수기 예약 안내",
      content: "여름 성수기 예약 관련 안내드립니다.\n\n- 성수기 기간: 2025년 7월 15일 ~ 8월 20일\n- 성수기 요금이 적용됩니다.\n- 예약이 조기 마감될 수 있으니 서둘러 예약해주세요.\n- 취소 및 환불 규정을 반드시 확인해주세요.",
      date: "2025-05-20", views: 187 }
  ];

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function categoryClass(c) { return CATEGORY_CLASS[c] || "c-info"; }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  /* Firebase 설정이 실제로 채워졌는지 확인 */
  function firebaseConfigured() {
    var c = global.FIREBASE_CONFIG;
    return !!(typeof firebase !== "undefined" && c && c.apiKey &&
      c.apiKey.indexOf("여기에") === -1 && c.projectId &&
      c.projectId.indexOf("여기에") === -1);
  }

  /* =====================================================
     A. Firebase (Firestore + Auth) 구현
     ===================================================== */
  function createFirebaseBackend() {
    firebase.initializeApp(global.FIREBASE_CONFIG);
    var db = firebase.firestore();
    var auth = firebase.auth();
    var COL = db.collection("notices");
    var INC = firebase.firestore.FieldValue.increment(1);
    var adminEmails = (global.ADMIN_EMAILS || []).map(function (e) { return e.toLowerCase(); });

    var currentUser = null;
    var authListeners = [];
    auth.onAuthStateChanged(function (u) {
      currentUser = u;
      authListeners.forEach(function (cb) { try { cb(u); } catch (e) {} });
    });

    function docToItem(doc) {
      var d = doc.data() || {};
      return {
        id: doc.id,
        category: d.category, title: d.title, content: d.content,
        date: d.date, views: d.views || 0, createdAt: d.createdAt || 0
      };
    }

    return {
      mode: "firebase",
      CATEGORIES: CATEGORIES,
      categoryClass: categoryClass,
      escapeHtml: escapeHtml,

      getAll: function () {
        return COL.orderBy("createdAt", "desc").get().then(function (snap) {
          var arr = [];
          snap.forEach(function (doc) { arr.push(docToItem(doc)); });
          return arr;
        });
      },
      get: function (id) {
        return COL.doc(String(id)).get().then(function (doc) {
          return doc.exists ? docToItem(doc) : null;
        });
      },
      add: function (data) {
        var item = {
          category: data.category || "공지",
          title: (data.title || "").trim(),
          content: (data.content || "").trim(),
          date: data.date || todayStr(),
          views: 0,
          createdAt: Date.now()
        };
        return COL.add(item).then(function (ref) {
          item.id = ref.id;
          return item;
        });
      },
      update: function (id, data) {
        var patch = {};
        if (data.category != null) patch.category = data.category;
        if (data.title != null) patch.title = data.title.trim();
        if (data.content != null) patch.content = data.content.trim();
        return COL.doc(String(id)).update(patch).then(function () {
          return this.get(id);
        }.bind(this));
      },
      remove: function (id) {
        return COL.doc(String(id)).delete();
      },
      incrementViews: function (id) {
        return COL.doc(String(id)).update({ views: INC }).catch(function () {});
      },

      /* 컬렉션이 비어 있으면 시드 데이터 삽입 (관리자 로그인 시) */
      seedIfEmpty: function () {
        return COL.limit(1).get().then(function (snap) {
          if (!snap.empty) return false;
          var batch = db.batch();
          SEED.forEach(function (s) {
            var ref = COL.doc();
            batch.set(ref, {
              category: s.category, title: s.title, content: s.content,
              date: s.date, views: s.views || 0,
              createdAt: Date.parse(s.date) || Date.now()
            });
          });
          return batch.commit().then(function () { return true; });
        });
      },

      auth: {
        signIn: function (email, pw) {
          return auth.signInWithEmailAndPassword(email, pw);
        },
        signOut: function () { return auth.signOut(); },
        onChange: function (cb) {
          authListeners.push(cb);
          cb(currentUser); // 현재 상태 즉시 전달
        },
        currentUser: function () { return currentUser; },
        isAdmin: function () {
          if (!currentUser || !currentUser.email) return false;
          if (!adminEmails.length) return true; // 관리자 목록 미설정 시 로그인만으로 허용
          return adminEmails.indexOf(currentUser.email.toLowerCase()) > -1;
        },
        enabled: true
      }
    };
  }

  /* =====================================================
     B. localStorage 폴백 구현 (로컬 테스트용)
     ===================================================== */
  function createLocalBackend() {
    var KEY = "jejustay_notices";

    function load() {
      var raw = null;
      try { raw = global.localStorage.getItem(KEY); } catch (e) {}
      if (!raw) {
        var seeded = SEED.map(function (s, i) {
          return {
            id: i + 1, category: s.category, title: s.title, content: s.content,
            date: s.date, views: s.views || 0, createdAt: Date.parse(s.date) || (i + 1)
          };
        });
        persist(seeded);
        return seeded;
      }
      try { var d = JSON.parse(raw); if (Array.isArray(d)) return d; } catch (e) {}
      return [];
    }
    function persist(list) {
      try { global.localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    }
    function sortLatest(list) {
      return list.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    }

    return {
      mode: "local",
      CATEGORIES: CATEGORIES,
      categoryClass: categoryClass,
      escapeHtml: escapeHtml,

      getAll: function () { return Promise.resolve(sortLatest(load())); },
      get: function (id) {
        id = parseInt(id, 10);
        var found = load().filter(function (n) { return n.id === id; })[0] || null;
        return Promise.resolve(found);
      },
      add: function (data) {
        var list = load(), maxId = 0;
        list.forEach(function (n) { if (n.id > maxId) maxId = n.id; });
        var item = {
          id: maxId + 1, category: data.category || "공지",
          title: (data.title || "").trim(), content: (data.content || "").trim(),
          date: data.date || todayStr(), views: 0, createdAt: Date.now()
        };
        list.push(item); persist(list);
        return Promise.resolve(item);
      },
      update: function (id, data) {
        id = parseInt(id, 10);
        var list = load();
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) {
            if (data.category != null) list[i].category = data.category;
            if (data.title != null) list[i].title = data.title.trim();
            if (data.content != null) list[i].content = data.content.trim();
            persist(list);
            return Promise.resolve(list[i]);
          }
        }
        return Promise.resolve(null);
      },
      remove: function (id) {
        id = parseInt(id, 10);
        persist(load().filter(function (n) { return n.id !== id; }));
        return Promise.resolve();
      },
      incrementViews: function (id) {
        id = parseInt(id, 10);
        var list = load();
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) { list[i].views = (list[i].views || 0) + 1; persist(list); break; }
        }
        return Promise.resolve();
      },
      seedIfEmpty: function () { load(); return Promise.resolve(false); },

      /* 로컬 모드: 인증 없이 항상 관리자 허용(테스트용) */
      auth: {
        signIn: function () { return Promise.resolve(); },
        signOut: function () { return Promise.resolve(); },
        onChange: function (cb) { cb({ email: "local-admin", local: true }); },
        currentUser: function () { return { email: "local-admin", local: true }; },
        isAdmin: function () { return true; },
        enabled: false
      }
    };
  }

  /* =====================================================
     백엔드 선택
     ===================================================== */
  var Notice;
  if (firebaseConfigured()) {
    try {
      Notice = createFirebaseBackend();
    } catch (e) {
      console.error("[Notice] Firebase 초기화 실패, 로컬 모드로 전환합니다.", e);
      Notice = createLocalBackend();
    }
  } else {
    console.warn("[Notice] Firebase 설정이 없어 localStorage(로컬 테스트) 모드로 동작합니다. script/firebase-config.js 를 설정하세요.");
    Notice = createLocalBackend();
  }
  global.Notice = Notice;

  /* =====================================================
     메인페이지 최신 공지 렌더 (#mainNoticeList)
     ===================================================== */
  function renderMain() {
    var ul = document.getElementById("mainNoticeList");
    if (!ul) return;
    Notice.getAll().then(function (list) {
      list = list.slice(0, 5);
      if (!list.length) {
        ul.innerHTML = '<li class="empty"><span class="tit">등록된 공지사항이 없습니다.</span></li>';
        return;
      }
      ul.innerHTML = list.map(function (n) {
        return '<li data-id="' + escapeHtml(n.id) + '">' +
          '<span class="cat ' + categoryClass(n.category) + '">' + escapeHtml(n.category) + '</span>' +
          '<span class="tit">' + escapeHtml(n.title) + '</span>' +
          '<span class="date">' + escapeHtml(n.date) + '</span>' +
          '</li>';
      }).join("");
    }).catch(function (e) {
      console.error("[Notice] 메인 공지 로드 실패", e);
      ul.innerHTML = '<li class="empty"><span class="tit">공지사항을 불러오지 못했습니다.</span></li>';
    });

    ul.addEventListener("click", function (e) {
      var li = e.target.closest("li[data-id]");
      if (!li) return;
      global.location.href = "notice.html?id=" + encodeURIComponent(li.getAttribute("data-id"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderMain);
  } else {
    renderMain();
  }
})(window);
