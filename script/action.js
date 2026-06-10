/* 주식회사 예네 — 공통 스크립트 (placeholder)
   헤더 인터랙션 등 추가 시 이곳에 작성하세요. */
(function () {
  "use strict";
  // 헤더 메뉴 키보드 접근성: aria-expanded 토글
  document.querySelectorAll('.gnb > li > a').forEach(function (a) {
    var li = a.parentElement;
    li.addEventListener('mouseenter', function () { a.setAttribute('aria-expanded', 'true'); });
    li.addEventListener('mouseleave', function () { a.setAttribute('aria-expanded', 'false'); });
  });

  var slider = document.querySelector('#section2');
  var thumbs = [];
  var mainImage = null;
  var progress = null;
  var current = 0;
  var duration = 4200;
  var startedAt = Date.now();
  var rafId = null;
  var autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (slider) {
    thumbs = Array.prototype.slice.call(slider.querySelectorAll('.thumb'));
    mainImage = slider.querySelector('#experience-main-image');
    progress = slider.querySelector('.track i');
  }

  function setProgress(percent) {
    if (progress) progress.style.width = Math.max(0, Math.min(100, percent)) + '%';
  }

  function selectSlide(index) {
    if (!thumbs.length || !mainImage) return;
    current = (index + thumbs.length) % thumbs.length;
    startedAt = Date.now();
    setProgress(0);

    thumbs.forEach(function (thumb, i) {
      var isActive = i === current;
      thumb.classList.toggle('is-active', isActive);
      thumb.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    var nextSrc = thumbs[current].getAttribute('data-image');
    if (nextSrc && mainImage.getAttribute('src') !== nextSrc) {
      mainImage.classList.add('is-changing');
      window.setTimeout(function () {
        mainImage.setAttribute('src', nextSrc);
        mainImage.classList.remove('is-changing');
      }, 140);
    }
  }

  function tick() {
    if (!autoplay || !thumbs.length) return;
    var elapsed = Date.now() - startedAt;
    var percent = elapsed / duration * 100;

    if (percent >= 100) {
      selectSlide(current + 1);
      percent = 0;
    }

    setProgress(percent);
    rafId = window.requestAnimationFrame(tick);
  }

  if (slider) {
    thumbs.forEach(function (thumb, index) {
      thumb.addEventListener('click', function () {
        selectSlide(index);
      });
    });

    slider.addEventListener('mouseenter', function () {
      autoplay = false;
      if (rafId) window.cancelAnimationFrame(rafId);
    });

    slider.addEventListener('mouseleave', function () {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      autoplay = true;
      startedAt = Date.now();
      rafId = window.requestAnimationFrame(tick);
    });

    selectSlide(0);
    if (autoplay) rafId = window.requestAnimationFrame(tick);
  }

  var menuToggle = document.querySelector('.menu-toggle');
  var mobileMenu = document.querySelector('.mobile-menu-modal');
  var mobileMenuClose = document.querySelector('.mobile-menu-close');

  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('active');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.add('active');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', openMobileMenu);
  }

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', closeMobileMenu);
  }

  if (mobileMenu) {
    mobileMenu.addEventListener('click', function (event) {
      if (event.target === mobileMenu) {
        closeMobileMenu();
      }
    });
  }

  var roomFilterToggle = document.querySelector('.room-filter-toggle');
  var roomFilterPanel = document.querySelector('.room-filter-panel');
  var roomFilter = document.querySelector('.room-filter');

  if (roomFilterToggle && roomFilterPanel && roomFilter) {
    roomFilterToggle.addEventListener('click', function () {
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      roomFilterPanel.setAttribute('aria-hidden', String(expanded));
      roomFilter.classList.toggle('active', !expanded);
    });

    roomFilterPanel.querySelectorAll('a').forEach(function (item) {
      item.addEventListener('click', function () {
        roomFilterToggle.setAttribute('aria-expanded', 'false');
        roomFilterPanel.setAttribute('aria-hidden', 'true');
        roomFilter.classList.remove('active');
      });
    });

    document.addEventListener('click', function (event) {
      if (!roomFilter.contains(event.target) && roomFilter.classList.contains('active')) {
        roomFilterToggle.setAttribute('aria-expanded', 'false');
        roomFilterPanel.setAttribute('aria-hidden', 'true');
        roomFilter.classList.remove('active');
      }
    });
  }
})();
