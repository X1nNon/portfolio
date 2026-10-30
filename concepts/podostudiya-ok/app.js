// ПодоСтудия OK, макет v2. Без библиотек и без обработчиков scroll: всё на IntersectionObserver.
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

  // Атлас: номер на стопе, строка легенды, подсветка зоны и выноски живут вместе
  const plate = $('.atlas-plate');
  const items = $$('.lg-item');
  const select = (zone, { fromPin = false } = {}) => {
    items.forEach((item) => {
      const on = item.dataset.zone === zone;
      item.classList.toggle('is-open', on);
      $('.lg-btn', item).setAttribute('aria-expanded', String(on));
    });
    $$('[data-zone]', plate).forEach((el) => el.classList.toggle('is-on', el.dataset.zone === zone));
    if (fromPin) {
      // на узком экране легенда ниже рисунка: показываем ответ, если его не видно
      const item = items.find((i) => i.dataset.zone === zone);
      const r = item.getBoundingClientRect();
      if (r.top > innerHeight - 120 || r.bottom < 0) item.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };
  const touch = () => plate.classList.add('is-touched');
  items.forEach((item) => {
    const btn = $('.lg-btn', item);
    btn.addEventListener('click', () => { touch(); select(item.dataset.zone); });
    btn.addEventListener('mouseenter', () => $(`.pin[data-zone="${item.dataset.zone}"]`, plate).classList.add('is-peek'));
    btn.addEventListener('mouseleave', () => $(`.pin[data-zone="${item.dataset.zone}"]`, plate).classList.remove('is-peek'));
  });
  $$('.pin', plate).forEach((pin) => {
    pin.addEventListener('click', () => { touch(); select(pin.dataset.zone, { fromPin: true }); });
    const row = () => items.find((i) => i.dataset.zone === pin.dataset.zone);
    pin.addEventListener('mouseenter', () => row().classList.add('is-peek'));
    pin.addEventListener('mouseleave', () => row().classList.remove('is-peek'));
  });
  select('ingrown');

  // Стопа рисуется, когда до неё долистали: на первом экране теперь фото студии
  const where = $('.where');
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    where.classList.add('is-live');
    o.disconnect();
  }, { threshold: 0.35 }).observe($('.atlas', where));

  // Окно с фото: до и после из атласа открываются по одному, работы мастеров листаются стрелками
  const dialog = $('#photo-dialog');
  if (dialog && typeof dialog.showModal === 'function') {
    const img = $('img', dialog);
    const cap = $('figcaption', dialog);
    const nav = $('.dialog-nav', dialog);
    const works = $$('.work-link');
    let current = -1;
    const open = (src, alt, caption, index = -1) => {
      current = index;
      nav.hidden = index < 0;
      img.src = src;
      img.alt = alt;
      cap.textContent = caption;
      if (!dialog.open) dialog.showModal();
    };
    const showWork = (i) => {
      const n = (i + works.length) % works.length;
      const link = works[n];
      open(link.getAttribute('href'), $('img', link).alt, link.dataset.caption || '', n);
    };
    $$('.photo-link').forEach((link) => link.addEventListener('click', (e) => {
      e.preventDefault();
      open(link.getAttribute('href'), link.dataset.alt || '', link.dataset.caption || '');
    }));
    works.forEach((link, i) => link.addEventListener('click', (e) => { e.preventDefault(); showWork(i); }));
    $$('[data-step]', nav).forEach((btn) => btn.addEventListener('click', () => showWork(current + Number(btn.dataset.step))));
    dialog.addEventListener('keydown', (e) => {
      if (current < 0) return;
      if (e.key === 'ArrowRight') showWork(current + 1);
      if (e.key === 'ArrowLeft') showWork(current - 1);
    });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  }

  // Как проходит приём: шаг в середине экрана подсвечивается
  const steps = $$('.step');
  if (steps.length) {
    steps[0].classList.add('is-active');
    const stepObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        steps.forEach((s) => s.classList.toggle('is-active', s === e.target));
      });
    }, { rootMargin: '-42% 0px -48% 0px' });
    steps.forEach((s) => stepObserver.observe(s));
  }

  // Вкладки прайса: мышь, стрелки, Home и End
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
  if (tabs.length) openTab(tabs[0]);
  // «Все цены на маникюр и педикюр» сразу открывает нужную вкладку
  $$('a[data-tab]').forEach((a) => a.addEventListener('click', () => {
    const tab = document.getElementById(a.dataset.tab);
    if (tab) openTab(tab);
  }));

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
