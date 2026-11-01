// Космедиа, макет «С головы до стоп». Без библиотек и без обработчиков scroll: всё на IntersectionObserver.
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Шапка: линия снизу появляется, когда страница уехала вверх
  const header = $('.site-header');
  new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting)).observe($('.top-sentinel'));

  // Меню на телефоне
  const menuBtn = $('.menu-btn');
  const menu = $('#mobile-menu');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
  });

  // Фигура: номер на теле, строка легенды, подсветка зоны и выноска живут вместе
  const plate = $('.figure-plate');
  const items = $$('.lg-item');
  const select = (zone, { fromPin = false } = {}) => {
    items.forEach((item) => {
      const on = item.dataset.zone === zone;
      item.classList.toggle('is-open', on);
      $('.lg-btn', item).setAttribute('aria-expanded', String(on));
    });
    $$('[data-zone]', plate).forEach((el) => el.classList.toggle('is-on', el.dataset.zone === zone));
    if (fromPin) {
      // на узком экране легенда ниже фигуры: показываем ответ, если его не видно
      const item = items.find((i) => i.dataset.zone === zone);
      const r = item.getBoundingClientRect();
      if (r.top > innerHeight - 140 || r.bottom < 80) item.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };
  const touch = () => plate.classList.add('is-touched');
  items.forEach((item) => {
    const btn = $('.lg-btn', item);
    const pin = () => $(`.pin[data-zone="${item.dataset.zone}"]`, plate);
    btn.addEventListener('click', () => { touch(); select(item.dataset.zone); });
    btn.addEventListener('mouseenter', () => pin().classList.add('is-peek'));
    btn.addEventListener('mouseleave', () => pin().classList.remove('is-peek'));
  });
  $$('.pin', plate).forEach((pin) => {
    const row = () => items.find((i) => i.dataset.zone === pin.dataset.zone);
    pin.addEventListener('click', () => { touch(); select(pin.dataset.zone, { fromPin: true }); });
    pin.addEventListener('mouseenter', () => row().classList.add('is-peek'));
    pin.addEventListener('mouseleave', () => row().classList.remove('is-peek'));
  });
  select('hair');

  // Фигура рисуется, когда до неё долистали
  const atlas = $('.atlas');
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    atlas.classList.add('is-live');
    o.disconnect();
  }, { threshold: 0.3 }).observe($('.figure', atlas));

  // Фото до и после открывается в окне, закрывается по Escape и клику мимо
  const dialog = $('#photo-dialog');
  if (dialog && typeof dialog.showModal === 'function') {
    const img = $('img', dialog);
    const cap = $('figcaption', dialog);
    $$('.photo-link').forEach((link) => link.addEventListener('click', (e) => {
      e.preventDefault();
      img.src = link.getAttribute('href');
      img.alt = link.dataset.alt || '';
      cap.textContent = link.dataset.caption || '';
      dialog.showModal();
    }));
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  }

  // Вкладки цен: мышь, стрелки, Home и End
  const tabs = $$('[role="tab"]');
  const openTab = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => openTab(tab));
    tab.addEventListener('keydown', (e) => {
      const n = tabs.length;
      const to = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      openTab(tabs[to], true);
    });
  });

  // Появление блоков при прокрутке
  const reveal = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el) => reveal.observe(el));

  // Плашка «Записаться» на телефоне: видна, когда кнопки первого экрана ушли вверх, и прячется у контактов
  const bar = $('.mbar');
  const seen = new Map();
  const watch = [$('.hero-actions'), $('#contacts'), $('.site-footer')];
  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => seen.set(e.target, e.isIntersecting));
    const show = !watch.some((el) => seen.get(el));
    bar.classList.toggle('on', show);
    bar.inert = !show;
  });
  watch.forEach((el) => barObserver.observe(el));
})();
