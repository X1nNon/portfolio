// Первый экран: фото сменяются сами каждые 6,5 секунды (затуханием).
// 11.11.2026: их можно листать и самому: пальцем или мышью (фото едет за пальцем), стрелками на фото, клавишами ← →.
// После ручного листания показ ждёт 10 секунд; стоит, пока на фото курсор или фокус с клавиатуры.
// Первое фото грузится сразу, остальные подгружаются заранее, перед показом (data-src из render.php).
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover)');
  const frame = document.querySelector('.hero .frame');
  const box = frame.querySelector('.slides');
  const slides = [...box.querySelectorAll('img')];
  const dots = [...frame.querySelectorAll('.dots span')];
  const pause = frame.querySelector('.slide-pause');
  const status = frame.querySelector('.slide-status');
  const n = slides.length;
  let cur = 0, paused = motion.matches, timer = 0, drag = null, glide = null;
  const at = (i) => ((i % n) + n) % n;
  const load = (i) => { const img = slides[at(i)]; if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); } };
  const go = (i) => {
    slides[cur].classList.remove('on'); dots[cur]?.classList.remove('on');
    cur = at(i); load(cur); load(cur + 1); load(cur - 1);
    slides[cur].classList.add('on'); dots[cur]?.classList.add('on');
  };
  const updatePause = () => {
    pause.textContent = paused ? 'Продолжить показ' : 'Остановить фото';
    pause.setAttribute('aria-pressed', String(paused));
  };
  pause.addEventListener('click', () => { paused = !paused; updatePause(); });
  motion.addEventListener('change', e => { paused = e.matches; updatePause(); });
  updatePause();
  const keyboardFocus = () => { try { return !!frame.querySelector(':focus-visible'); } catch (e) { return false; } };
  const held = () => paused || document.hidden || drag || glide || document.querySelector('dialog[open]') || (hover.matches && frame.matches(':hover')) || keyboardFocus();
  const schedule = (ms = 6500) => { clearTimeout(timer); timer = setTimeout(() => { if (n > 1 && !held()) go(cur + 1); schedule(); }, ms); };
  schedule();
  if (document.readyState === 'complete') { load(1); load(-1); } else addEventListener('load', () => { load(1); load(-1); }, { once: true });

  // Ручное листание. Соседнее фото ставится рядом с текущим и въезжает вместе с ним.
  const place = (img, x) => { img.style.translate = `${x}px 0`; };
  const reset = () => slides.forEach((img) => { img.style.translate = ''; img.style.opacity = ''; img.style.zIndex = ''; });
  const say = (i) => { status.textContent = `Фото ${i + 1} из ${n}${slides[i].alt ? ': ' + slides[i].alt : ''}`; };
  const settle = (to) => {
    box.classList.add('snap'); box.classList.remove('glide', 'drag');
    if (to !== cur) go(to);
    reset(); void box.offsetWidth; box.classList.remove('snap');
  };
  // Доводит начатое перелистывание до конца сразу
  const finish = () => { if (!glide) return; const { to, t } = glide; glide = null; clearTimeout(t); settle(to); };
  // dir: 1 вперёд, -1 назад; from: на сколько пикселей фото уже сдвинули пальцем
  const slide = (dir, from = 0) => {
    finish();
    const to = at(cur + dir), a = slides[cur], b = slides[to], w = box.clientWidth;
    load(to); load(to + dir); say(to); schedule(10000);
    if (motion.matches) { settle(to); return; }
    box.classList.add('drag');
    b.style.opacity = '1'; b.style.zIndex = '1'; place(a, from); place(b, from + dir * w);
    void box.offsetWidth;
    box.classList.replace('drag', 'glide');
    place(a, -dir * w); place(b, 0);
    glide = { to, t: setTimeout(finish, 450) };
  };
  const back = (dx) => {
    if (motion.matches) { settle(cur); return; }
    const dir = dx < 0 ? 1 : -1;
    box.classList.replace('drag', 'glide');
    place(slides[cur], 0); place(slides[at(cur + dir)], dir * box.clientWidth);
    glide = { to: cur, t: setTimeout(finish, 450) };
  };
  box.addEventListener('pointerdown', (e) => {
    if (n < 2 || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.pointerType === 'mouse') e.preventDefault();
    finish();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, live: false, t: performance.now() };
  });
  box.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.live) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // вертикальное движение: это прокрутка страницы
      drag.live = true; box.classList.add('drag'); load(cur + 1); load(cur - 1);
      try { box.setPointerCapture(e.pointerId); } catch (err) {}
    }
    drag.dx = dx;
    const dir = dx < 0 ? 1 : -1, b = slides[at(cur + dir)], c = slides[at(cur - dir)];
    if (c !== b && c !== slides[cur]) { c.style.translate = ''; c.style.opacity = ''; c.style.zIndex = ''; }
    b.style.opacity = '1'; b.style.zIndex = '1';
    place(slides[cur], dx); place(b, dx + dir * box.clientWidth);
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { dx, live, t } = drag; drag = null;
    if (!live) return;
    schedule(10000);
    const quick = Math.abs(dx) > 30 && Math.abs(dx) / (performance.now() - t) > 0.45;
    if (Math.abs(dx) > box.clientWidth * 0.2 || quick) slide(dx < 0 ? 1 : -1, dx); else back(dx);
  };
  box.addEventListener('pointerup', release);
  box.addEventListener('pointercancel', release);
  [frame.querySelector('.slide-prev'), frame.querySelector('.slide-next')].forEach((btn, k) => {
    btn.hidden = n < 2;
    btn.addEventListener('click', () => slide(k ? 1 : -1));
  });
  frame.addEventListener('keydown', (e) => {
    if (n > 1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); slide(e.key === 'ArrowRight' ? 1 : -1); }
  });

  // Booking and external map are controlled by privacy.js.

  // Направление в ценах раскрывается и по ссылке вида #laser
  const revealHash = () => {
    const el = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (el && el.matches('.svc')) el.open = true;
  };
  revealHash();
  window.addEventListener('hashchange', revealHash);

  // Фото открываются крупно, листаются стрелками
  const lb = document.querySelector('.lb');
  const lbImg = lb.querySelector('img'), lbCap = lb.querySelector('p');
  let group = [], idx = 0;
  const show = (i) => {
    idx = (i + group.length) % group.length;
    lbImg.src = group[idx].dataset.full;
    lbImg.alt = group[idx].dataset.cap || '';
    lbCap.textContent = group[idx].dataset.cap || '';
    const many = group.length > 1;
    lb.querySelector('.prev').hidden = !many; lb.querySelector('.next').hidden = !many;
  };
  document.querySelectorAll('.zoom').forEach((z) => z.addEventListener('click', () => {
    const g = z.dataset.group || 'studio';
    group = [...document.querySelectorAll('.zoom')].filter((x) => (x.dataset.group || 'studio') === g);
    show(group.indexOf(z));
    lb.showModal();
  }));
  lb.querySelector('.x').addEventListener('click', () => lb.close());
  lb.querySelector('.prev').addEventListener('click', () => show(idx - 1));
  lb.querySelector('.next').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb-in')) lb.close(); });
  lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });

  // Нижняя плашка записи на телефоне появляется, когда кнопки первого экрана ушли вверх
  const bar = document.querySelector('.bar');
  const heroCta = document.querySelector('.hero .cta');
  if (bar && heroCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => bar.classList.toggle('on', !e.isIntersecting && e.boundingClientRect.top < 0)).observe(heroCta);
  }
  document.querySelectorAll('.mobile-nav a').forEach(a => a.addEventListener('click', () => { document.querySelector('.mobile-nav').open = false; }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelector('.mobile-nav').open = false; });
  // Тема переключается одной кнопкой-значком (30.10.2026): луна - тёмная, солнце - светлая.
  // Смена темы идёт плавным переходом, если браузер умеет View Transitions и не просили меньше движения.
  // 11.11.2026: переключателей два, в шапке и под логотипом на телефоне; оба показывают одну тему.
  const root = document.documentElement;
  const themeBtns = [...document.querySelectorAll('.theme-toggle')];
  const setTheme = (t) => {
    root.dataset.theme = t;
    themeBtns.forEach((b) => b.setAttribute('aria-pressed', String(t === 'dark')));
  };
  themeBtns.forEach((b) => b.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    if (document.startViewTransition && !motion.matches) document.startViewTransition(() => setTheme(next));
    else setTheme(next);
    try { localStorage.setItem('mirada-theme', next); } catch (e) {}
  }));
  try { const saved = localStorage.getItem('mirada-theme'); if (saved === 'dark' || saved === 'light') setTheme(saved); } catch (e) {}

  // 11.11.2026, тема 1.2.9–1.2.11: пока светящийся логотип первого экрана виден, маленький логотип в шапке спрятан
  // (класс brand-off стоит у шапки с самого начала), после прокрутки он появляется. На телефоне спрятана вся шапка,
  // и она выезжает, когда под неё ушла строка разделов под логотипом.
  const heroLogo = document.querySelector('.hero-brand');
  const heroNav = document.querySelector('.hero-nav');
  const header = document.querySelector('header');
  const phone = matchMedia('(max-width: 760px)');
  if (heroLogo && 'IntersectionObserver' in window) {
    let io;
    const watch = () => {
      if (io) io.disconnect();
      const onPhone = phone.matches && heroNav;
      // шапка сверху: всё, что под ней, считается невидимым
      io = new IntersectionObserver(([e]) => header.classList.toggle('brand-off', onPhone ? e.isIntersecting : e.intersectionRatio >= 0.4),
        { rootMargin: `-${header.offsetHeight}px 0px 0px 0px`, threshold: [0, 0.4] });
      io.observe(onPhone ? heroNav : heroLogo);
    };
    watch();
    phone.addEventListener('change', watch);
  } else header.classList.remove('brand-off');
