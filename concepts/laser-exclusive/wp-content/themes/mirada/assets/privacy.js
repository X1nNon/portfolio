(() => {
  'use strict';
  const KEY = 'mirada-external-v1', NOTICE = 'mirada-privacy-notice-v2';
  const TTL = 12 * 60 * 60 * 1000, NOTICE_TTL = 180 * 24 * 60 * 60 * 1000;
  // Уведомление о cookies появляется через NOTICE_DELAY и держится NOTICE_SHOW (столько же идёт полоска в style.css).
  const NOTICE_DELAY = 1200, NOTICE_SHOW = 9000;
  const empty = () => ({booking: false, map: false, expires: 0});
  let prefs = empty();
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    if (saved && saved.expires > Date.now() && saved.expires <= Date.now() + TTL) {
      prefs = {booking: saved.booking === true, map: saved.map === true, expires: saved.expires};
    } else sessionStorage.removeItem(KEY);
  } catch (_) { /* Storage can be blocked; permissions then last only on this page. */ }

  const dialog = document.querySelector('.privacy-dialog');
  if (!dialog) return;
  const form = dialog.querySelector('form'), notice = document.querySelector('.privacy-notice');
  const status = document.querySelector('.privacy-status');
  const yc = document.querySelector('.yc'), frame = yc?.querySelector('iframe');
  const gate = yc?.querySelector('[data-gate="booking"]'), wait = yc?.querySelector('.yc-wait');
  const mapShell = document.querySelector('.map-shell'), mapFrame = mapShell?.querySelector('iframe');
  let bookingUrl = '', loadingTimer, expiryTimer, returnFocus;

  const allowedURL = (value, kind) => {
    try {
      const url = new URL(value);
      const hosts = kind === 'booking' ? ['yclients.ru', 'yclients.com'] : ['yandex.ru'];
      return url.protocol === 'https:' && hosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
    } catch (_) { return false; }
  };
  const clearFrame = (element) => {
    if (!element) return;
    element.hidden = true;
    element.removeAttribute('src');
    delete element.dataset.url;
    element.classList.remove('ready');
  };
  const applyRestrictions = () => {
    if (!prefs.booking && frame) {
      clearTimeout(loadingTimer); clearFrame(frame);
      gate.hidden = false; wait.hidden = true;
    }
    if (!prefs.map && mapFrame) {
      clearFrame(mapFrame); mapShell.classList.remove('loaded');
      mapShell.querySelector('[data-gate="map"]').hidden = false;
    }
  };
  const scheduleExpiry = () => {
    clearTimeout(expiryTimer);
    if (prefs.expires > Date.now()) expiryTimer = setTimeout(expire, prefs.expires - Date.now());
  };
  const expire = () => {
    if (!prefs.expires || prefs.expires > Date.now()) { scheduleExpiry(); return; }
    prefs = empty();
    try { sessionStorage.removeItem(KEY); } catch (_) {}
    applyRestrictions();
    if (dialog.open) syncControls();
  };
  const permitted = kind => { expire(); return prefs[kind] === true; };
  const update = value => {
    prefs = {booking: value.booking === true, map: value.map === true, expires: Date.now() + TTL};
    try { sessionStorage.setItem(KEY, JSON.stringify(prefs)); } catch (_) {}
    applyRestrictions(); scheduleExpiry();
  };
  // Уведомление о cookies без кнопок (30.10.2026): появляется само и само скрывается.
  // Отсчёт стоит, пока на уведомлении курсор или фокус и пока вкладка в фоне.
  let noticeTimer, noticeLeft = NOTICE_SHOW, noticeSince = 0;
  let noticeOn = false, noticeDone = false, noticeHover = false, noticeFocus = false;
  const pauseNotice = () => {
    if (!noticeSince) return;
    noticeLeft -= Date.now() - noticeSince; noticeSince = 0;
    clearTimeout(noticeTimer); notice.classList.add('paused');
  };
  const runNotice = () => {
    if (!noticeOn || noticeDone || noticeSince || noticeHover || noticeFocus || document.hidden) return;
    noticeSince = Date.now(); notice.classList.remove('paused');
    noticeTimer = setTimeout(acknowledge, Math.max(noticeLeft, 0));
  };
  const showNotice = () => {
    notice.hidden = false;
    // Класс on ставится в следующем кадре, иначе браузер не проиграет появление.
    noticeTimer = setTimeout(() => { noticeOn = true; notice.classList.add('on'); runNotice(); }, 30);
  };
  const acknowledge = () => {
    noticeDone = true; noticeOn = false; noticeSince = 0; clearTimeout(noticeTimer);
    notice.classList.remove('on');
    if (!notice.hidden) noticeTimer = setTimeout(() => { notice.hidden = true; }, 450);
    try { localStorage.setItem(NOTICE, String(Date.now())); } catch (_) {}
  };
  const syncControls = () => {
    form.elements.booking.checked = prefs.booking;
    form.elements.map.checked = prefs.map;
  };
  const closeSettings = () => { dialog.close(); returnFocus?.focus(); };
  document.querySelectorAll('[data-privacy-open]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      expire(); syncControls(); returnFocus = button; dialog.showModal();
    });
  });
  dialog.querySelector('.privacy-close').addEventListener('click', closeSettings);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeSettings(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    update({booking: form.elements.booking.checked, map: form.elements.map.checked});
    acknowledge(); closeSettings(); status.textContent = 'Настройки конфиденциальности сохранены.';
  });
  dialog.querySelector('[data-privacy-reject]').addEventListener('click', () => {
    update(empty()); acknowledge(); closeSettings();
    status.textContent = 'Внешние сервисы отключены. Позвонить в студию можно без них.';
  });
  try {
    localStorage.removeItem('mirada-privacy-notice-v1'); // отметка старого уведомления с кнопкой «Понятно»
    const shownAt = Number(localStorage.getItem(NOTICE));
    noticeDone = shownAt > 0 && shownAt <= Date.now() && Date.now() - shownAt < NOTICE_TTL;
    if (!noticeDone) localStorage.removeItem(NOTICE);
  } catch (_) { /* Без хранилища уведомление показывается при каждом открытии. */ }
  if (!noticeDone) {
    noticeTimer = setTimeout(showNotice, NOTICE_DELAY);
    notice.addEventListener('mouseenter', () => { noticeHover = true; pauseNotice(); });
    notice.addEventListener('mouseleave', () => { noticeHover = false; runNotice(); });
    notice.addEventListener('focusin', () => { noticeFocus = true; pauseNotice(); });
    notice.addEventListener('focusout', () => { noticeFocus = false; runNotice(); });
  }

  const loadBooking = () => {
    if (!frame || !permitted('booking') || !allowedURL(bookingUrl, 'booking')) return;
    gate.hidden = true; frame.hidden = false;
    if (frame.dataset.url === bookingUrl) return;
    frame.dataset.url = bookingUrl; frame.classList.remove('ready');
    wait.hidden = false; wait.textContent = 'Загружаем запись…';
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
      wait.textContent = 'Не удалось дождаться записи. Откройте её отдельно или позвоните по ссылке ниже.';
    }, 12000);
    frame.src = bookingUrl;
  };
  frame?.addEventListener('load', () => {
    if (frame.dataset.url && permitted('booking')) {
      clearTimeout(loadingTimer); frame.classList.add('ready'); wait.hidden = true;
    }
  });
  document.querySelectorAll('[data-yc]').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !yc) return;
    event.preventDefault(); bookingUrl = link.href;
    if (!yc.open) yc.showModal();
    if (permitted('booking')) loadBooking(); else applyRestrictions();
  }));
  yc?.querySelector('.yc-x').addEventListener('click', () => yc.close());
  yc?.addEventListener('click', event => { if (event.target === yc) yc.close(); });

  const loadMap = () => {
    if (!mapFrame || !permitted('map') || !allowedURL(mapFrame.dataset.src, 'map')) return;
    mapShell.querySelector('[data-gate="map"]').hidden = true;
    mapFrame.hidden = false; mapShell.classList.add('loaded');
    mapFrame.src = mapFrame.dataset.src;
  };
  document.querySelectorAll('[data-allow-service]').forEach(button => button.addEventListener('click', () => {
    expire(); const kind = button.dataset.allowService;
    if (kind !== 'booking' && kind !== 'map') return;
    update({...prefs, [kind]: true}); acknowledge();
    if (kind === 'booking') loadBooking(); else loadMap();
  }));
  // Stored permission never preloads an external service: the visitor must open it.
  document.addEventListener('visibilitychange', () => { expire(); if (document.hidden) pauseNotice(); else runNotice(); });
  scheduleExpiry(); applyRestrictions();
})();
