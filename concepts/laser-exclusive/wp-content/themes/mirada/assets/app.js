// Первый экран: фото сменяются каждые 5 секунд
  const slides = [...document.querySelectorAll('.slides img')];
  const dots = [...document.querySelectorAll('.dots span')];
  let cur = 0;
  const go = (i) => {
    slides[cur].classList.remove('on'); dots[cur].classList.remove('on');
    cur = (i + slides.length) % slides.length;
    slides[cur].classList.add('on'); dots[cur].classList.add('on');
  };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pause = document.querySelector('.slide-pause');
  let paused = motion.matches;
  const updatePause = () => {
    pause.textContent = paused ? 'Продолжить показ' : 'Остановить фото';
    pause.setAttribute('aria-pressed', String(paused));
  };
  pause.addEventListener('click', () => { paused = !paused; updatePause(); });
  motion.addEventListener('change', e => { paused = e.matches; updatePause(); });
  updatePause();
  setInterval(() => { if (slides.length > 1 && !paused && !document.hidden && !document.querySelector('dialog[open]')) go(cur + 1); }, 6500);

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
  // Both colour themes are available to visitors.
  const root = document.documentElement;
  const setTheme = (t) => {
    root.dataset.theme = t;
    document.querySelectorAll('.theme button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.set === t));
    try { localStorage.setItem('mirada-theme', t); } catch (e) {}
  };
  document.querySelectorAll('.theme button').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.set)));
  try { const saved = localStorage.getItem('mirada-theme'); if (saved === 'dark' || saved === 'light') setTheme(saved); } catch (e) {}
