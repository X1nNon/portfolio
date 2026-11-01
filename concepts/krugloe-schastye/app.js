// Круглое счастье, макет сайта. Без библиотек и без обработчиков scroll: прокрутку слушает IntersectionObserver.
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NB = ' ';
  const rub = (n) => n.toLocaleString('ru-RU').replace(/\s/g, NB) + NB + '₽';
  const kg = (w) => String(w).replace('.', ',') + NB + 'кг';
  const plural = (n, one, few, many) => {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  };

  // Шапка: линия снизу появляется, когда страница уехала вверх
  const header = $('.site-header');
  new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting)).observe($('.top-sentinel'));

  // Меню на телефоне
  const menuBtn = $('.menu-btn');
  const menu = $('#mobile-menu');
  const setMenu = (open) => { menuBtn.setAttribute('aria-expanded', String(open)); menu.hidden = !open; };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
  });

  /* ---------- Надпись на торте: строки подбираются под круг, как кондитер пишет шоколадом ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const inkGroup = $('.ink-lines');
  const heroInput = $('#ink-hero');
  const formInk = $('#f-ink');
  const measure = document.createElement('canvas').getContext('2d');
  const CX = 500, CY = 500, R = 262; // светлая середина торта в координатах рисунка 1000x1000

  const chords = (n, lh) => {
    const top = CY - (n * lh) / 2;
    return Array.from({ length: n }, (_, i) => {
      const mid = top + i * lh + lh / 2;
      const dy = Math.abs(mid - CY) + lh * 0.34;
      return dy < R ? Math.sqrt(R * R - dy * dy) * 2 * 0.93 : 0;
    });
  };
  // Разбивка на строки как у кондитера: лучше после «!» и запятой, короткое «не», «в», «с» не висит в конце строки
  const SHORT = /^(не|ни|в|во|с|со|к|ко|и|а|на|за|по|до|от|из|у|о|об|для|ты|мы|я)$/i;
  const breakCost = (word, strict) => (/[,.!?:;…]$/.test(word) ? 0 : SHORT.test(word) ? (strict ? Infinity : 0.9) : 0.3);
  const split = (words, widths, strict) => {
    const ww = words.map((w) => measure.measureText(w).width);
    const sp = measure.measureText(' ').width;
    const W = words.length, n = widths.length;
    const cost = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(Infinity));
    const from = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(-1));
    cost[0][0] = 0;
    for (let k = 1; k <= n; k++) {
      for (let i = 1; i <= W; i++) {
        let width = -sp;
        for (let j = i - 1; j >= 0; j--) {
          width += ww[j] + sp;
          if (width > widths[k - 1]) break;
          if (cost[k - 1][j] === Infinity) continue;
          const slack = (widths[k - 1] - width) / widths[k - 1];
          const c = cost[k - 1][j] + slack * slack + (i < W ? breakCost(words[i - 1], strict) : 0);
          if (c < cost[k][i]) { cost[k][i] = c; from[k][i] = j; }
        }
      }
    }
    if (cost[n][W] === Infinity) return null;
    const lines = [];
    for (let k = n, i = W; k > 0; i = from[k][i], k--) lines.unshift(words.slice(from[k][i], i).join(' '));
    return { lines, cost: cost[n][W] };
  };
  const layout = (text) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    // сначала без висячих коротких слов; если так не помещается даже мелко, разрешаем
    for (const strict of [true, false]) {
      for (let size = 124; size >= (strict ? 40 : 30); size -= 3) {
        measure.font = `${size}px "Marck Script"`;
        const lh = size * 1.04;
        let best = null;
        for (let n = 1; n <= Math.min(7, words.length) && n * lh <= R * 2 * 0.9; n++) {
          const res = split(words, chords(n, lh), strict);
          if (res && (!best || res.cost < best.cost)) best = res;
        }
        if (best) return { size, lh, lines: best.lines };
      }
    }
    return { size: 30, lh: 31, lines: [text.slice(0, 40)] };
  };
  const drawInk = (text, animate) => {
    inkGroup.replaceChildren();
    const res = layout(text);
    if (!res) return;
    const { size, lh, lines } = res;
    const top = CY - (lines.length * lh) / 2;
    lines.forEach((line, i) => {
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', CX);
      t.setAttribute('y', (top + i * lh + lh / 2 + size * 0.24).toFixed(1));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-size', size);
      t.textContent = line;
      inkGroup.append(t);
      if (animate && !reduceMotion && t.animate) {
        const len = Math.round(measure.measureText(line).width * 3);
        t.style.strokeDasharray = len;
        t.animate([
          { strokeDashoffset: len, fillOpacity: 0 },
          { strokeDashoffset: 0, fillOpacity: 0, offset: 0.7 },
          { strokeDashoffset: 0, fillOpacity: 1 },
        ], { duration: 1100, delay: 120 + i * 230, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'backwards' });
      }
    });
  };

  // Надпись в форме заказа появляется, только если человек сам её написал или выбрал
  let inkTouched = false;
  const setInk = (text, { from, animate = false } = {}) => {
    drawInk(text, animate);
    if (from !== heroInput) heroInput.value = text;
    if (from !== formInk) formInk.value = text;
    order.update('ink');
  };
  heroInput.addEventListener('input', () => { inkTouched = true; setInk(heroInput.value, { from: heroInput }); });
  formInk.addEventListener('input', () => { inkTouched = true; setInk(formInk.value, { from: formInk }); });
  $$('.ink-chips .chip').forEach((chip) => chip.addEventListener('click', () => {
    inkTouched = true;
    setInk(chip.dataset.ink, { animate: true });
  }));

  /* ---------- Витрина ---------- */
  const cakes = JSON.parse($('#cakes-data').textContent);
  const byKey = Object.fromEntries(cakes.map((c) => [c.key, c]));
  const grid = $('.cake-grid');
  const tiles = $$('.cake[data-tags]', grid);
  const own = $('.cake-own', grid);
  const status = $('#filter-status');
  let filter = 'all';

  // «Свой вариант» растягивается до конца ряда, чтобы в сетке не оставалось пустых клеток
  const fitOwn = () => {
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    let cells = 0;
    tiles.forEach((t) => {
      if (t.hidden) return;
      cells += t.classList.contains('big') && filter === 'all' ? (cols >= 4 ? 4 : cols) : 1;
    });
    const rest = cells % cols;
    const span = rest ? cols - rest : cols;
    own.style.gridColumn = `span ${span}`;
    own.classList.toggle('is-wide', span > 1);
  };
  new ResizeObserver(fitOwn).observe(grid);

  $$('.filters .chip').forEach((chip) => chip.addEventListener('click', () => {
    filter = chip.dataset.filter;
    $$('.filters .chip').forEach((c) => {
      const on = c === chip;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', String(on));
    });
    grid.classList.toggle('is-filtered', filter !== 'all');
    let n = 0;
    tiles.forEach((t) => {
      const show = filter === 'all' || t.dataset.tags.split(' ').includes(filter);
      t.hidden = !show;
      t.classList.toggle('big', show && filter === 'all' && !!t.dataset.big);
      if (show) {
        n++;
        t.classList.remove('is-in');
        if (!reduceMotion) { void t.offsetWidth; t.classList.add('is-in'); }
      }
    });
    fitOwn();
    status.textContent = `Показано ${n} ${plural(n, 'торт', 'торта', 'тортов')}`;
  }));
  tiles.forEach((t) => { if (t.classList.contains('big')) t.dataset.big = '1'; });

  // Разрез: кнопка на фото, на компьютере ещё и наведение (в CSS)
  $$('.cut-btn').forEach((btn) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const tile = btn.closest('.cake');
    const on = !tile.classList.contains('show-cut');
    tile.classList.toggle('show-cut', on);
    btn.setAttribute('aria-pressed', String(on));
  }));

  /* ---------- Окно торта: фото целиком и в разрезе, состав, «Заказать торт» ---------- */
  const dlg = $('#cake-dialog');
  let current = null;
  const kindLabel = { w: 'Целиком', c: 'В разрезе', x: 'Ещё фото' };
  const showPhoto = (c, i) => {
    const p = c.photos[i];
    const img = $('.cd-img', dlg);
    img.srcset = `assets/img/${p.src}-640.webp 640w, assets/img/${p.src}-960.webp 960w`;
    img.sizes = '(min-width: 700px) 480px, 92vw';
    img.src = `assets/img/${p.src}-640.webp`;
    img.alt = p.alt;
    $$('.cd-thumbs .chip', dlg).forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
  };
  const visibleKeys = () => tiles.filter((t) => !t.hidden).map((t) => t.dataset.key);
  const openCake = (key) => {
    const c = byKey[key];
    if (!c) return;
    current = key;
    $('#cd-title').textContent = c.name;
    $('.cd-price b', dlg).textContent = rub(c.price);
    $('.cd-price span', dlg).textContent = c.meta || '';
    $('.cd-desc', dlg).textContent = c.desc;
    const thumbs = $('.cd-thumbs', dlg);
    thumbs.replaceChildren(...(c.photos.length > 1 ? c.photos.map((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = p.label || kindLabel[p.kind];
      b.addEventListener('click', () => showPhoto(c, i));
      return b;
    }) : []));
    showPhoto(c, 0);
    if (!dlg.open) dlg.showModal();
    else if (!dlg.contains(document.activeElement)) $('#cd-title').focus();
  };
  const move = (step) => {
    const keys = visibleKeys();
    const i = keys.indexOf(current);
    openCake(keys[(i + step + keys.length) % keys.length]);
  };
  tiles.forEach((t) => $('.cake-card', t).addEventListener('click', (e) => {
    if (e.target.closest('.cut-btn')) return;
    openCake(t.dataset.key);
  }));
  $$('[data-move]', dlg).forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.move))));
  // стрелки слушаем на документе: при перелистывании кнопки фото пересоздаются и фокус уходит с них
  document.addEventListener('keydown', (e) => {
    if (!dlg.open) return;
    if (e.key === 'ArrowRight') move(1);
    if (e.key === 'ArrowLeft') move(-1);
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  const goOrder = (key) => {
    order.pick(key);
    const sec = $('#order');
    sec.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    $('#f-cake').focus({ preventScroll: true });
  };
  $('.cd-order', dlg).addEventListener('click', (e) => {
    e.preventDefault();
    dlg.close();
    goOrder(current);
  });
  $$('[data-pick]').forEach((a) => a.addEventListener('click', () => order.pick(a.dataset.pick)));

  /* ---------- Заявка: вес по числу гостей, примерная цена, чек ---------- */
  const form = $('#order-form');
  const f = {
    cake: $('#f-cake'), guests: $('#f-guests'), qty: $('#f-qty'), decor: $('#f-decor'), photo: $('#f-photo'),
    date: $('#f-date'), name: $('#f-name'), phone: $('#f-phone'),
  };
  const ticket = $('.ticket');
  const row = (name) => $(`[data-row="${name}"]`, ticket);
  let weightTouched = false;
  let qtyTouched = false;

  const invalid = (el, bad) => (bad ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid'));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() + 4);
  f.date.min = iso(minDate);
  const human = (d, year) => d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', ...(year ? { year: 'numeric' } : {}) }).replace(' г.', '');
  $('#f-date-hint').textContent = `Заказы на торты принимаем за 4 дня. Ближайшая дата: ${human(minDate)}`;
  const parseDate = (v) => { if (!v) return null; const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };

  const suggest = (g) => Math.max(1, Math.ceil((g / 8) * 2) / 2);
  const weight = () => Number(($('input[name="weight"]:checked', form) || {}).value || 1);
  const setWeight = (w) => { const r = $(`input[name="weight"][value="${w}"]`, form); if (r) r.checked = true; };
  const cake = () => byKey[f.cake.value] || null;

  const flash = (name) => {
    const el = row(name);
    if (!el || reduceMotion) return;
    el.classList.add('flash');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('flash')));
  };

  const summary = () => {
    const c = cake();
    const custom = f.cake.value === 'custom';
    const guests = Math.max(1, Number(f.guests.value) || 1);
    const qty = Math.max(1, Number(f.qty.value) || 1);
    const w = weight();
    let size = `${kg(w)} на ${guests} ${plural(guests, 'гостя', 'гостей', 'гостей')}`;
    let total = null, exact = false;
    if (c && c.unit === 'pcs') { size = `${qty} ${plural(qty, 'штука', 'штуки', 'штук')}`; total = c.price * qty; exact = true; }
    else if (c && c.unit === 'roll') { size = `${qty} ${plural(qty, 'рулет', 'рулета', 'рулетов')}`; total = c.price * qty; exact = true; }
    else if (c) {
      if (c.prices && c.prices[String(w)]) { total = c.prices[String(w)]; exact = true; }
      else total = Math.round((c.price / (c.weight || 1)) * w / 50) * 50;
    } else if (custom) size = `на ${guests} ${plural(guests, 'гостя', 'гостей', 'гостей')}`;
    return {
      cake: c ? c.name : custom ? 'Свой вариант по фото' : '',
      size, total, exact, custom,
      ink: formInk.value.trim(),
      decor: f.decor.value.trim(),
      photo: f.photo.checked,
      date: parseDate(f.date.value),
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      reply: ($('input[name="reply"]:checked', form) || {}).value || 'Telegram',
    };
  };

  const order = {
    update(changed) {
      const s = summary();
      $('dd', row('cake')).textContent = s.cake || 'не выбран';
      $('dd', row('size')).textContent = s.size;
      const inkEl = $('.ticket-ink', row('ink'));
      inkEl.textContent = s.ink ? `«${s.ink}»` : 'без надписи';
      inkEl.classList.toggle('is-empty', !s.ink);
      $('dd', row('date')).textContent = s.date ? human(s.date) : 'не выбрана';
      const tot = row('total');
      $('span', tot).textContent = s.exact ? 'По каталогу' : 'Примерно';
      $('b', tot).textContent = s.total ? rub(s.total) : '-';
      row('note').textContent = s.custom
        ? 'Цену назовём, когда увидим фото и узнаем вес.'
        : s.exact ? 'Цена из нашего каталога ВКонтакте.' : 'Считаем по цене из каталога. Точную цену назовём в ответ на заявку.';
      if (changed) flash(changed === 'weight' || changed === 'guests' || changed === 'qty' ? 'size' : changed);
      if (changed && changed !== 'ink' && changed !== 'date') flash('total');
    },
    pick(key) {
      if (!key) return;
      f.cake.value = key;
      f.cake.removeAttribute('aria-invalid');
      $('#f-cake-err').hidden = true;
      this.mode();
      this.update('cake');
    },
    mode() {
      const c = cake();
      const unit = c ? c.unit : 'kg';
      const pcs = unit === 'pcs', roll = unit === 'roll';
      $('#weight-field').hidden = pcs || roll || f.cake.value === 'custom';
      $('#qty-field').hidden = !(pcs || roll);
      f.guests.closest('.field').hidden = roll;
      if (pcs) {
        f.qty.min = c.min || 1;
        $('#qty-hint').textContent = `Капкейки заказывают от ${c.min || 1} штук, ${rub(c.price)} за штуку`;
        if (!qtyTouched) f.qty.value = Math.max(c.min || 1, Number(f.guests.value) || 1);
      } else if (roll) {
        f.qty.min = 1;
        $('#qty-hint').textContent = `${rub(c.price)} за рулет`;
        if (!qtyTouched) f.qty.value = 1;
      }
      this.guestsHint();
    },
    guestsHint() {
      const g = Math.max(1, Number(f.guests.value) || 1);
      const c = cake();
      const hint = $('#guests-hint');
      if (c && c.unit === 'pcs') { hint.textContent = 'По капкейку на гостя'; return; }
      if (g > 24) { hint.textContent = `На ${g} ${plural(g, 'гостя', 'гостей', 'гостей')} нужен торт больше 3 кг: напишите вес в пожеланиях`; return; }
      hint.textContent = `Хватит торта ${kg(suggest(g))}: в 1 кг 6-8 порций`;
    },
  };

  f.cake.addEventListener('change', () => {
    f.cake.removeAttribute('aria-invalid');
    $('#f-cake-err').hidden = true;
    order.mode();
    order.update('cake');
  });
  const onGuests = () => {
    const g = Math.max(1, Number(f.guests.value) || 1);
    if (!weightTouched) setWeight(Math.min(3, suggest(g)));
    const c = cake();
    if (c && c.unit === 'pcs' && !qtyTouched) f.qty.value = Math.max(c.min || 1, g);
    order.guestsHint();
    order.update('guests');
  };
  f.guests.addEventListener('input', onGuests);
  f.qty.addEventListener('input', () => { qtyTouched = true; order.update('qty'); });
  $$('.stepper').forEach((st) => {
    const input = $('#' + st.dataset.for);
    $$('[data-step]', st).forEach((b) => b.addEventListener('click', () => {
      const min = Number(input.min) || 1, max = Number(input.max) || 99;
      input.value = Math.min(max, Math.max(min, (Number(input.value) || 0) + Number(b.dataset.step)));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }));
  });
  $$('input[name="weight"]', form).forEach((r) => r.addEventListener('change', () => { weightTouched = true; order.update('weight'); }));
  f.date.addEventListener('change', () => {
    const d = parseDate(f.date.value);
    const bad = d && d < minDate;
    invalid(f.date, bad);
    $('#f-date-err').hidden = !bad;
    order.update('date');
  });
  f.phone.addEventListener('input', () => { f.phone.removeAttribute('aria-invalid'); $('#f-phone-err').hidden = true; });

  // Отправка: в макете показываем, какой текст придёт кафе в Telegram
  const sent = $('#sent-dialog');
  const message = (s) => [
    'Заявка на торт с сайта «Круглое счастье»',
    `Торт: ${s.cake}`,
    `${s.custom ? 'Гостей' : 'Размер'}: ${s.custom ? s.size.replace('на ', '') : s.size}`,
    `Надпись: ${s.ink ? `«${s.ink}»` : 'без надписи'}`,
    s.decor && `Оформление: ${s.decor}`,
    s.photo && 'Пришлёт фото-пример',
    `К дате: ${human(s.date, true)}`,
    s.name && `Имя: ${s.name}`,
    `Телефон: ${s.phone}`,
    `Ответить: ${s.reply}`,
    s.total && `${s.exact ? 'По каталогу' : 'Примерно'}: ${s.total.toLocaleString('ru-RU')} ₽`,
  ].filter(Boolean).join('\n');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const s = summary();
    const errors = [];
    if (!f.cake.value) errors.push([f.cake, '#f-cake-err']);
    if (!s.date || s.date < minDate) errors.push([f.date, '#f-date-err']);
    if (s.phone.replace(/\D/g, '').length < 10) errors.push([f.phone, '#f-phone-err']);
    [[f.cake, '#f-cake-err'], [f.date, '#f-date-err'], [f.phone, '#f-phone-err']].forEach(([el, err]) => {
      const bad = errors.some(([x]) => x === el);
      invalid(el, bad);
      $(err).hidden = !bad;
    });
    if (errors.length) { errors[0][0].focus(); return; }
    const text = message(s);
    $('.sent-text', sent).textContent = text;
    $('[data-wa]', sent).href = 'https://wa.me/79117893155?text=' + encodeURIComponent(text);
    $('[data-copy] span', sent).textContent = 'Скопировать текст';
    sent.showModal();
  });
  $('[data-copy]', sent).addEventListener('click', async (e) => {
    const label = $('span', e.currentTarget);
    try { await navigator.clipboard.writeText($('.sent-text', sent).textContent); label.textContent = 'Скопировано'; }
    catch { label.textContent = 'Выделите текст выше'; }
  });
  sent.addEventListener('click', (e) => { if (e.target === sent) sent.close(); });

  ['decor', 'name'].forEach((k) => f[k].addEventListener('input', () => order.update()));
  f.photo.addEventListener('change', () => order.update());

  /* ---------- Первая отрисовка ---------- */
  order.mode();
  order.update();
  const firstInk = () => drawInk(heroInput.value, true);
  if (document.fonts && document.fonts.load) {
    document.fonts.load('40px "Marck Script"', 'Пора смириться').then(firstInk, firstInk);
  } else firstInk();

  // Плашка «Заказать торт» на телефоне: видна, когда кнопки первого экрана ушли вверх; прячется у заявки и в конце
  const bar = $('.mbar');
  const seen = new Map();
  const watch = [$('.hero-actions'), $('#order'), $('#contacts'), $('.site-footer')];
  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => seen.set(e.target, e.isIntersecting));
    const on = !watch.some((el) => seen.get(el));
    bar.classList.toggle('on', on);
    bar.inert = !on;
  });
  watch.forEach((el) => el && barObserver.observe(el));
})();
