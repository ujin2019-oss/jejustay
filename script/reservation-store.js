/* =========================================================
   Jeju stay · 예약 데이터 모듈
   - 기본: Firebase Firestore (예약 저장 + 관리자 인증 + 날짜 중복방지)
   - 폴백: Firebase 설정이 없으면 localStorage(로컬 테스트)
   - 모든 데이터 메서드는 Promise 반환

   컬렉션 구조
   - reservations : 예약 요청(개인정보 포함) — 생성: 누구나 / 읽기·수정·삭제: 관리자
   - availability : 예약된 날짜(개인정보 없음) — 읽기: 누구나 / 생성: 누구나(중복불가) / 삭제: 관리자
     · 문서 ID = "{객실타입}__{날짜}" 로 고정 → 같은 날짜 중복 생성이 거부되어 중복예약 방지
   ========================================================= */
(function (global) {
  "use strict";

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function availId(roomType, date) { return roomType + "__" + date; }

  /* checkin(포함) ~ checkout(제외) 사이의 날짜 배열 */
  function nightsBetween(checkin, checkout) {
    var nights = [];
    var start = new Date(checkin + "T00:00:00");
    var end = new Date(checkout + "T00:00:00");
    var cur = new Date(start);
    while (cur < end) {
      nights.push(
        cur.getFullYear() + "-" +
        String(cur.getMonth() + 1).padStart(2, "0") + "-" +
        String(cur.getDate()).padStart(2, "0")
      );
      cur.setDate(cur.getDate() + 1);
    }
    return nights;
  }

  function firebaseConfigured() {
    var c = global.FIREBASE_CONFIG;
    return !!(typeof firebase !== "undefined" && c && c.apiKey &&
      c.apiKey.indexOf("여기에") === -1 && c.projectId &&
      c.projectId.indexOf("여기에") === -1);
  }

  /* =====================================================
     A. Firebase 구현
     ===================================================== */
  function createFirebaseBackend() {
    if (!firebase.apps.length) firebase.initializeApp(global.FIREBASE_CONFIG);
    var db = firebase.firestore();
    var auth = firebase.auth();
    var RES = db.collection("reservations");
    var AVAIL = db.collection("availability");
    var adminEmails = (global.ADMIN_EMAILS || []).map(function (e) { return e.toLowerCase(); });

    var currentUser = null;
    var authListeners = [];
    auth.onAuthStateChanged(function (u) {
      currentUser = u;
      authListeners.forEach(function (cb) { try { cb(u); } catch (e) {} });
    });

    function resToItem(doc) {
      var d = doc.data() || {};
      d.id = doc.id;
      return d;
    }

    return {
      mode: "firebase",
      escapeHtml: escapeHtml,
      nightsBetween: nightsBetween,

      /* 객실타입의 예약된 날짜 Set 반환 */
      getBookedDates: function (roomType) {
        return AVAIL.where("roomType", "==", roomType).get().then(function (snap) {
          var set = {};
          snap.forEach(function (doc) {
            var d = doc.data();
            if (d && d.date) set[d.date] = true;
          });
          return set;
        });
      },

      /* 예약 생성 (예약 + 날짜잠금을 batch 로 원자적 처리) */
      createReservation: function (data) {
        var roomType = data.roomType;
        var nights = data.nights || nightsBetween(data.checkin, data.checkout);
        if (!nights.length) return Promise.reject(new Error("invalid-dates"));

        // 사전 충돌 체크(친절한 메시지용) — 최종 안전장치는 batch create
        return this.getBookedDates(roomType).then(function (booked) {
          var conflict = nights.filter(function (d) { return booked[d]; });
          if (conflict.length) {
            var err = new Error("date-taken");
            err.code = "date-taken";
            err.conflict = conflict;
            throw err;
          }
          var ref = RES.doc();
          var batch = db.batch();
          var resData = {
            roomType: roomType,
            roomPrice: data.roomPrice || 0,
            checkin: data.checkin,
            checkout: data.checkout,
            nights: nights,
            adults: data.adults || 0,
            children: data.children || 0,
            options: data.options || [],
            optionTotal: data.optionTotal || 0,
            totalPrice: data.totalPrice || 0,
            name: (data.name || "").trim(),
            tel: (data.tel || "").trim(),
            email: (data.email || "").trim(),
            request: (data.request || "").trim(),
            status: "pending",
            createdAt: Date.now()
          };
          if (data.userId) {            // 로그인 사용자의 예약이면 본인 식별자 저장
            resData.userId = data.userId;
            resData.userEmail = data.userEmail || "";
          }
          batch.set(ref, resData);
          nights.forEach(function (date) {
            batch.set(AVAIL.doc(availId(roomType, date)), {
              roomType: roomType,
              date: date,
              reservationId: ref.id,
              createdAt: Date.now()
            });
          });
          return batch.commit().then(function () { return ref.id; });
        });
      },

      /* (관리자) 전체 예약 목록 — 최신순 */
      getReservations: function () {
        return RES.orderBy("createdAt", "desc").get().then(function (snap) {
          var arr = [];
          snap.forEach(function (doc) { arr.push(resToItem(doc)); });
          return arr;
        });
      },

      /* (사용자) 내 예약 목록 — 본인 것만, 최신순 (인덱스 불필요하도록 클라이언트 정렬) */
      getMyReservations: function (uid) {
        if (!uid) return Promise.resolve([]);
        return RES.where("userId", "==", uid).get().then(function (snap) {
          var arr = [];
          snap.forEach(function (doc) { arr.push(resToItem(doc)); });
          arr.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
          return arr;
        });
      },

      /* (관리자) 예약 확정 */
      confirmReservation: function (id) {
        return RES.doc(id).update({ status: "confirmed" });
      },

      /* (관리자) 예약 취소 — 날짜 잠금 해제 후 상태 변경 */
      cancelReservation: function (id) {
        return RES.doc(id).get().then(function (doc) {
          if (!doc.exists) throw new Error("not-found");
          var d = doc.data();
          var batch = db.batch();
          (d.nights || []).forEach(function (date) {
            batch.delete(AVAIL.doc(availId(d.roomType, date)));
          });
          batch.update(RES.doc(id), { status: "cancelled" });
          return batch.commit();
        });
      },

      /* (관리자) 예약 완전 삭제 — 날짜 잠금도 함께 해제 */
      deleteReservation: function (id) {
        return RES.doc(id).get().then(function (doc) {
          var batch = db.batch();
          if (doc.exists) {
            var d = doc.data();
            (d.nights || []).forEach(function (date) {
              batch.delete(AVAIL.doc(availId(d.roomType, date)));
            });
          }
          batch.delete(RES.doc(id));
          return batch.commit();
        });
      },

      auth: {
        signIn: function (email, pw) { return auth.signInWithEmailAndPassword(email, pw); },
        signOut: function () { return auth.signOut(); },
        onChange: function (cb) { authListeners.push(cb); cb(currentUser); },
        currentUser: function () { return currentUser; },
        isAdmin: function () {
          if (!currentUser || !currentUser.email) return false;
          if (!adminEmails.length) return true;
          return adminEmails.indexOf(currentUser.email.toLowerCase()) > -1;
        },
        enabled: true
      }
    };
  }

  /* =====================================================
     B. localStorage 폴백
     ===================================================== */
  function createLocalBackend() {
    var KEY = "jejustay_reservations";
    function load() {
      var raw = null;
      try { raw = global.localStorage.getItem(KEY); } catch (e) {}
      if (!raw) return [];
      try { var d = JSON.parse(raw); return Array.isArray(d) ? d : []; } catch (e) { return []; }
    }
    function persist(list) {
      try { global.localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    }

    return {
      mode: "local",
      escapeHtml: escapeHtml,
      nightsBetween: nightsBetween,

      getBookedDates: function (roomType) {
        var set = {};
        load().forEach(function (r) {
          if (r.roomType === roomType && r.status !== "cancelled") {
            (r.nights || []).forEach(function (d) { set[d] = true; });
          }
        });
        return Promise.resolve(set);
      },

      createReservation: function (data) {
        var nights = data.nights || nightsBetween(data.checkin, data.checkout);
        if (!nights.length) return Promise.reject(new Error("invalid-dates"));
        var list = load();
        var booked = {};
        list.forEach(function (r) {
          if (r.roomType === data.roomType && r.status !== "cancelled") {
            (r.nights || []).forEach(function (d) { booked[d] = true; });
          }
        });
        var conflict = nights.filter(function (d) { return booked[d]; });
        if (conflict.length) {
          var err = new Error("date-taken"); err.code = "date-taken"; err.conflict = conflict;
          return Promise.reject(err);
        }
        var maxId = 0;
        list.forEach(function (r) { var n = parseInt(r.id, 10); if (n > maxId) maxId = n; });
        var item = {
          id: String(maxId + 1),
          roomType: data.roomType, roomPrice: data.roomPrice || 0,
          checkin: data.checkin, checkout: data.checkout, nights: nights,
          adults: data.adults || 0, children: data.children || 0,
          options: data.options || [], optionTotal: data.optionTotal || 0,
          totalPrice: data.totalPrice || 0,
          name: (data.name || "").trim(), tel: (data.tel || "").trim(),
          email: (data.email || "").trim(), request: (data.request || "").trim(),
          userId: data.userId || null, userEmail: data.userEmail || "",
          status: "pending", createdAt: Date.now()
        };
        list.push(item); persist(list);
        return Promise.resolve(item.id);
      },

      getReservations: function () {
        return Promise.resolve(load().slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }));
      },
      getMyReservations: function (uid) {
        if (!uid) return Promise.resolve([]);
        return Promise.resolve(load().filter(function (r) { return r.userId === uid; })
          .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }));
      },
      confirmReservation: function (id) {
        var list = load();
        list.forEach(function (r) { if (r.id === id) r.status = "confirmed"; });
        persist(list); return Promise.resolve();
      },
      cancelReservation: function (id) {
        var list = load();
        list.forEach(function (r) { if (r.id === id) r.status = "cancelled"; });
        persist(list); return Promise.resolve();
      },
      deleteReservation: function (id) {
        persist(load().filter(function (r) { return r.id !== id; }));
        return Promise.resolve();
      },

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

  var Reservation;
  if (firebaseConfigured()) {
    try { Reservation = createFirebaseBackend(); }
    catch (e) { console.error("[Reservation] Firebase 초기화 실패, 로컬 모드로 전환합니다.", e); Reservation = createLocalBackend(); }
  } else {
    console.warn("[Reservation] Firebase 설정이 없어 localStorage(로컬 테스트) 모드로 동작합니다.");
    Reservation = createLocalBackend();
  }
  global.Reservation = Reservation;
})(window);
