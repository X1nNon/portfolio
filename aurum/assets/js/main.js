/* ==========================================================================
   AURUM — hair atelier · скрипты лендинга
   Без зависимостей: плавный скролл, прелоадер, появление блоков, меню,
   табы прайса, слайдер отзывов, аккордеон и форма с маской телефона.
   ========================================================================== */
(() => {
  'use strict';

  // Сигнал для страховки в <head>: скрипт запустился
  window.__aurum = true;

  const doc = document.documentElement;

  // Если скрипт грузился дольше страховочного таймера, возвращаем JS-режим
  if (doc.classList.contains('no-js')) doc.classList.replace('no-js', 'js');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const media = (q) => window.matchMedia(q);

  const reduceMotion = media('(prefers-reduced-motion: reduce)');
  const finePointer = media('(hover: hover) and (pointer: fine)');

  // Ошибка в одном модуле не должна ломать остальные
  const safe = (name, fn) => {
    try {
      return fn();
    } catch (err) {
      console.error(`[AURUM] ${name}:`, err);
      return null;
    }
  };

  const debounce = (fn, wait) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  /* ------------------------------------------------------------------------
     Типограф: неразрывные пробелы после предлогов, перед тире, в числах
     ------------------------------------------------------------------------ */
  function typograph(root) {
    const skip = 'script, style, textarea, code, pre, [data-no-typo]';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest(skip) || !/\S/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    // Без lookbehind: старые Safari падают на нём ещё при разборе файла.
    // Повторяем, чтобы связать подряд идущие короткие слова («и в доме»).
    const bindShortWords = (text) => {
      let prev;
      let next = text;
      for (let i = 0; i < 3 && next !== prev; i += 1) {
        prev = next;
        next = next.replace(/(^|[\s(«„"])([а-яё]{1,2})[ \t\r\n]+/giu, '$1$2 ');
      }
      return next;
    };

    nodes.forEach((node) => {
      node.nodeValue = bindShortWords(node.nodeValue)
        .replace(/[ \t\r\n]+—/g, ' —')
        .replace(/(\d)[ \t]+(?=\d{3}(?!\d))/g, '$1 ')
        .replace(/(\d)[ \t]+(?=[^\s\d])/g, '$1 ')
        .replace(/\)[ \t]+(?=\d)/g, ') ')
        .replace(/№[ \t]+/g, '№ ')
        .replace(/(\d)([–—-])(?=\d)/g, '$1$2⁠');
    });
  }

  /* ------------------------------------------------------------------------
     Разбивка заголовков на слова для анимации появления
     ------------------------------------------------------------------------ */
  function splitWords(el) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    while (el.firstChild) visual.appendChild(el.firstChild);

    let index = 0;
    const walk = (parent) => {
      Array.from(parent.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          node.nodeValue.split(/([ \t\r\n]+)/).forEach((part) => {
            if (!part) return;
            if (/^[ \t\r\n]+$/.test(part)) {
              frag.appendChild(document.createTextNode(' '));
              return;
            }
            const outer = document.createElement('span');
            const inner = document.createElement('span');
            outer.className = 'w';
            inner.textContent = part;
            inner.style.setProperty('--i', index++);
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          parent.replaceChild(frag, node);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
          walk(node);
        }
      });
    };
    walk(visual);

    const sr = document.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = label;
    el.append(sr, visual);
    el.classList.add('is-split');
  }

  /* ------------------------------------------------------------------------
     Блокировка прокрутки (прелоадер, меню)
     ------------------------------------------------------------------------ */
  const scrollLock = (() => {
    let count = doc.classList.contains('is-locked') ? 1 : 0;
    return {
      lock() {
        if (count++ === 0) doc.classList.add('is-locked');
      },
      unlock() {
        if (count === 0) return;
        if (--count === 0) doc.classList.remove('is-locked');
      },
    };
  })();

  /* ------------------------------------------------------------------------
     Плавный скролл колесом мыши (на тачскринах — нативный)
     ------------------------------------------------------------------------ */
  function initSmoothScroll() {
    const enabled = finePointer.matches && !reduceMotion.matches;
    let current = window.scrollY;
    let target = current;
    let lastSet = current;
    let rafId = 0;
    let lastTime = 0;
    let anim = null;

    const maxScroll = () => doc.scrollHeight - window.innerHeight;
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const frame = (now) => {
      const dt = lastTime ? Math.min(now - lastTime, 50) : 16.7;
      lastTime = now;

      if (anim) {
        const t = clamp((now - anim.start) / anim.duration, 0, 1);
        current = anim.from + (anim.to - anim.from) * easeInOut(t);
        target = current;
        if (t === 1) anim = null;
      } else {
        current += (target - current) * (1 - Math.exp(-dt / 105));
        if (Math.abs(target - current) < 0.5) current = target;
      }

      window.scrollTo(0, current);
      lastSet = window.scrollY;

      if (!anim && current === target) {
        rafId = 0;
        lastTime = 0;
        return;
      }
      rafId = requestAnimationFrame(frame);
    };

    const run = () => {
      if (!rafId) {
        lastTime = 0;
        rafId = requestAnimationFrame(frame);
      }
    };

    const stop = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      anim = null;
      current = target = window.scrollY;
    };

    // Может ли вложенный элемент сам прокрутиться в этом направлении
    const canScrollInside = (el, dy) => {
      while (el && el !== document.body && el !== doc) {
        if (el.nodeType === 1) {
          const oy = getComputedStyle(el).overflowY;
          if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
            if (dy > 0 && Math.ceil(el.scrollTop + el.clientHeight) < el.scrollHeight) return true;
            if (dy < 0 && el.scrollTop > 0) return true;
          }
        }
        el = el.parentElement;
      }
      return false;
    };

    const onWheel = (e) => {
      if (e.ctrlKey || e.defaultPrevented) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (canScrollInside(e.target, e.deltaY)) return;
      e.preventDefault();
      if (doc.classList.contains('is-locked')) return;

      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 36;
      else if (e.deltaMode === 2) delta *= window.innerHeight * 0.9;

      if (!rafId) current = target = window.scrollY;
      anim = null;
      target = clamp(target + delta, 0, maxScroll());
      run();
    };

    // Прокрутка скроллбаром, клавиатурой, поиском по странице
    const onScroll = () => {
      if (!rafId) {
        current = target = window.scrollY;
      } else if (Math.abs(window.scrollY - lastSet) > 2) {
        stop();
      }
    };

    if (enabled) {
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    const to = (y, { immediate = false } = {}) => {
      y = clamp(y, 0, maxScroll());
      if (immediate || reduceMotion.matches) {
        stop();
        window.scrollTo(0, y);
        current = target = y;
        return;
      }
      if (!enabled) {
        window.scrollTo({ top: y, behavior: 'smooth' });
        return;
      }
      const from = window.scrollY;
      const dist = Math.abs(y - from);
      if (dist < 1) return;
      anim = { from, to: y, start: performance.now(), duration: clamp(600 + dist * 0.18, 800, 1700) };
      current = from;
      run();
    };

    return { to, stop };
  }

  /* ------------------------------------------------------------------------
     Прелоадер: ждёт первый экран и шрифты, но не меньше и не больше нужного
     ------------------------------------------------------------------------ */
  function runPreloader() {
    const el = $('#preloader');
    if (!el) {
      doc.classList.add('is-loaded');
      scrollLock.unlock();
      return Promise.resolve();
    }

    const bar = $('.preloader__bar', el);
    const counter = $('.preloader__count', el);

    let seen = false;
    try {
      seen = sessionStorage.getItem('aurum-visited') === '1';
      sessionStorage.setItem('aurum-visited', '1');
    } catch (err) {
      /* приватный режим — просто показываем полную версию */
    }

    const minTime = reduceMotion.matches ? 200 : seen ? 700 : 1600;
    const maxTime = 7000;
    const start = performance.now();

    const tasks = $$('img')
      .filter((img) => img.loading !== 'lazy')
      .map((img) => (img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        })));
    if (document.fonts && document.fonts.ready) tasks.push(document.fonts.ready.catch(() => {}));

    const total = Math.max(tasks.length, 1);
    let loaded = 0;
    tasks.forEach((task) => task.then(() => { loaded += 1; }));

    return new Promise((resolve) => {
      let shown = 0;
      let last = start;

      const finish = () => {
        el.classList.add('is-done');
        setTimeout(() => {
          el.classList.add('is-leaving');
          doc.classList.add('is-loaded');
          scrollLock.unlock();
          resolve();
          const remove = () => el.remove();
          el.addEventListener('transitionend', (e) => {
            if (e.target === el && e.propertyName === 'transform') remove();
          });
          setTimeout(remove, 1700);
        }, reduceMotion.matches ? 0 : 420);
      };

      const tick = (now) => {
        const elapsed = now - start;
        const dt = Math.max(0, now - last);
        last = now;
        let goal = Math.min(loaded / total, elapsed / minTime);
        if (elapsed > maxTime) goal = 1;
        // сглаживание по времени, а не по кадрам: одинаково на 30, 60 и 144 Гц
        shown += (goal - shown) * (1 - Math.exp(-dt / 110));
        if (goal >= 1 && shown > 0.994) shown = 1;

        bar.style.transform = `scaleX(${shown})`;
        counter.textContent = String(Math.round(shown * 100));

        if (shown === 1) {
          finish();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ------------------------------------------------------------------------
     Шапка: фон после прокрутки, прячется при скролле вниз
     ------------------------------------------------------------------------ */
  function initHeader() {
    const el = $('#header');
    const progress = $('.header__progress', el);
    let lastY = window.scrollY;
    let acc = 0;

    const show = () => el.classList.remove('is-hidden');
    el.addEventListener('focusin', show);

    const update = (y) => {
      el.classList.toggle('is-scrolled', y > 24);

      const max = doc.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

      const d = y - lastY;
      lastY = y;
      if (doc.classList.contains('menu-open')) return;
      if ((d > 0 && acc < 0) || (d < 0 && acc > 0)) acc = 0;
      acc += d;
      if (y < 240 || acc < -48) show();
      else if (acc > 90) el.classList.add('is-hidden');
    };

    return { update, show };
  }

  /* ------------------------------------------------------------------------
     Мобильное меню
     ------------------------------------------------------------------------ */
  function initMenu(smooth, header) {
    const menuEl = $('#menu');
    const burger = $('.burger');
    if (!menuEl || !burger) return null;

    const outside = () => [$('main'), $('footer'), $('#mobile-cta'), $('.header__cta')].filter(Boolean);
    let open = false;

    const set = (next, { focusBurger = false } = {}) => {
      if (next === open) return;
      open = next;

      if (open) {
        const r = burger.getBoundingClientRect();
        menuEl.style.setProperty('--cx', `${r.left + r.width / 2}px`);
        menuEl.style.setProperty('--cy', `${r.top + r.height / 2}px`);
      }

      menuEl.classList.toggle('is-open', open);
      menuEl.setAttribute('aria-hidden', String(!open));
      menuEl.inert = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      doc.classList.toggle('menu-open', open);
      outside().forEach((node) => { node.inert = open; });

      if (open) {
        smooth.stop();
        scrollLock.lock();
        if (header) header.show();
      } else {
        scrollLock.unlock();
        if (focusBurger) burger.focus();
      }
    };

    burger.addEventListener('click', () => set(!open));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) set(false, { focusBurger: true });
    });
    media('(min-width: 1024px)').addEventListener('change', (e) => {
      if (e.matches) set(false);
    });

    return { isOpen: () => open, close: () => set(false) };
  }

  /* ------------------------------------------------------------------------
     Появление блоков при прокрутке + счётчики
     ------------------------------------------------------------------------ */
  const numberFormat = (decimals) => new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  function prepareCounters() {
    $$('[data-count]').forEach((el) => {
      el.textContent = numberFormat(Number(el.dataset.decimals || 0)).format(0);
    });
  }

  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const fmt = numberFormat(Number(el.dataset.decimals || 0));
    if (reduceMotion.matches) {
      el.textContent = fmt.format(target);
      return;
    }
    const duration = 2200;
    const start = performance.now();
    const step = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = fmt.format(target * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function initReveal() {
    $$('[data-stagger]').forEach((group) => {
      const step = parseFloat(group.dataset.stagger) || 0.08;
      $$('[data-reveal]', group).forEach((el, i) => {
        if (!el.style.getPropertyValue('--delay')) el.style.setProperty('--delay', `${(i * step).toFixed(2)}s`);
      });
    });

    const targets = $$('[data-reveal], [data-split]:not(.hero__title), [data-count]');
    const reveal = (el) => {
      el.classList.add('is-in');
      if (el.hasAttribute('data-count')) countUp(el);
    };

    if (!('IntersectionObserver' in window)) {
      targets.forEach(reveal);
      return;
    }

    // Элементы, скрытые через clip-path, IntersectionObserver считает невидимыми
    // (обрезка учитывается при пересечении) — их проверяем по координатам.
    const clipped = new Set(targets.filter((el) => el.dataset.reveal === 'clip'));
    const checkClipped = () => {
      const edge = window.innerHeight * 0.92;
      clipped.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < edge && r.bottom > 0) {
          reveal(el);
          clipped.delete(el);
        }
      });
      if (!clipped.size) {
        window.removeEventListener('scroll', checkClipped);
        window.removeEventListener('resize', checkClipped);
      }
    };
    window.addEventListener('scroll', checkClipped, { passive: true });
    window.addEventListener('resize', checkClipped);
    checkClipped();

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    targets.filter((el) => !clipped.has(el)).forEach((el) => io.observe(el));
  }

  function initLazyImages() {
    $$('img[loading="lazy"]').forEach((img) => {
      if (img.classList.contains('process__img')) return;
      img.classList.add('lazy-fade');
      const done = () => img.classList.add('is-loaded');
      if (img.complete && img.naturalWidth) done();
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    });
  }

  /* ------------------------------------------------------------------------
     Параллакс (только мышь — на тач-устройствах он дёргается)
     ------------------------------------------------------------------------ */
  function initParallax() {
    const items = $$('[data-parallax]').map((el) => ({ el, box: el.parentElement, room: 0 }));
    const heroMedia = $('.hero__media');
    const heroContent = $('.hero__content');
    const enabled = () => finePointer.matches && !reduceMotion.matches;

    const measure = () => {
      items.forEach((it) => {
        it.room = (it.el.offsetHeight - it.box.offsetHeight) / 2;
      });
    };

    const update = (y) => {
      if (!enabled()) return;
      const vh = window.innerHeight;

      if (y <= vh * 1.2) {
        if (heroMedia) heroMedia.style.transform = `translate3d(0, ${(y * 0.32).toFixed(1)}px, 0)`;
        if (heroContent) {
          heroContent.style.opacity = String(1 - clamp(y / (vh * 0.75), 0, 1));
          heroContent.style.transform = `translate3d(0, ${(y * 0.16).toFixed(1)}px, 0)`;
        }
      }

      const rects = items.map((it) => it.box.getBoundingClientRect());
      items.forEach((it, i) => {
        const r = rects[i];
        if (r.bottom < -80 || r.top > vh + 80) return;
        const p = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
        it.el.style.transform = `translate3d(0, ${(-p * it.room).toFixed(1)}px, 0)`;
      });
    };

    measure();
    return { update, measure };
  }

  /* ------------------------------------------------------------------------
     Услуги: карточки работают как вкладки прайса
     ------------------------------------------------------------------------ */
  function initTabs(smooth) {
    const list = $('.service-grid[role="tablist"]');
    if (!list) return null;
    const tabs = $$('[role="tab"]', list);
    const prices = $('#prices');

    const select = (tab, { focus = false, reveal = false } = {}) => {
      if (!tab) return;
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      // На телефоне прайс под карточками бывает за краем экрана — подкручиваем к нему
      if (reveal && prices) {
        const r = prices.getBoundingClientRect();
        if (r.top > window.innerHeight * 0.75) smooth.to(r.top + window.scrollY - window.innerHeight * 0.3);
      }
    };

    tabs.forEach((t) => t.addEventListener('click', () => select(t, { reveal: true })));

    list.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const keys = {
        ArrowRight: i + 1,
        ArrowDown: i + 1,
        ArrowLeft: i - 1,
        ArrowUp: i - 1,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!(e.key in keys)) return;
      e.preventDefault();
      select(tabs[(keys[e.key] + tabs.length) % tabs.length], { focus: true });
    });

    return { select: (key) => select(tabs.find((t) => t.dataset.tab === key)) };
  }

  /* ------------------------------------------------------------------------
     Слайдер отзывов: нативный scroll-snap + кнопки + перетаскивание мышью
     ------------------------------------------------------------------------ */
  function initSlider(root) {
    const track = $('.slider__track', root);
    const prev = $('[data-prev]', root);
    const next = $('[data-next]', root);
    const thumb = $('.slider__thumb', root);
    const cards = $$('.review-card', track);
    if (!track || !cards.length) return;

    const stepSize = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return cards[0].getBoundingClientRect().width + gap;
    };

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const ratio = clamp(track.clientWidth / track.scrollWidth, 0.12, 1);
      const p = max > 0 ? clamp(track.scrollLeft / max, 0, 1) : 0;
      thumb.style.width = `${ratio * 100}%`;
      thumb.style.transform = `translateX(${p * (1 / ratio - 1) * 100}%)`;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max - 4;
    };

    const go = (dir) => track.scrollBy({ left: dir * stepSize(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));

    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', debounce(update, 120));
    update();

    // Перетаскивание мышью на десктопе
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    let releaseTimer = 0;

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      clearTimeout(releaseTimer);
    });

    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) {
        moved = true;
        track.classList.add('is-dragging');
      }
      if (moved) track.scrollLeft = startLeft - dx;
    });

    const end = () => {
      if (!dragging) return;
      dragging = false;
      if (!moved) return;
      const size = stepSize();
      track.scrollTo({ left: Math.round(track.scrollLeft / size) * size, behavior: 'smooth' });
      releaseTimer = setTimeout(() => track.classList.remove('is-dragging'), 600);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    track.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    }, true);
  }

  /* ------------------------------------------------------------------------
     Аккордеон FAQ
     ------------------------------------------------------------------------ */
  function initAccordion() {
    const items = $$('.acc-item');
    const setItem = (item, open) => {
      item.classList.toggle('is-open', open);
      $('.acc-btn', item).setAttribute('aria-expanded', String(open));
      $('.acc-panel', item).inert = !open;
    };

    items.forEach((item) => {
      setItem(item, item.classList.contains('is-open'));
      $('.acc-btn', item).addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach((other) => {
          if (other !== item && other.classList.contains('is-open')) setItem(other, false);
        });
        setItem(item, open);
      });
    });
  }

  /* ------------------------------------------------------------------------
     Маска телефона: +7 (___) ___-__-__
     Понимает ввод с 8 и +7, вставку из буфера, автозаполнение,
     удаление через скобки и дефисы.
     ------------------------------------------------------------------------ */
  function createPhoneMask(input) {
    const PREFIX = '+7 (';
    let digits = '';

    const format = (d) => {
      let out = PREFIX + d.slice(0, 3);
      if (d.length > 3) out += `) ${d.slice(3, 6)}`;
      if (d.length > 6) out += `-${d.slice(6, 8)}`;
      if (d.length > 8) out += `-${d.slice(8, 10)}`;
      return out;
    };

    // Позиция курсора сразу после n-й цифры номера (код страны не считаем)
    const caretFor = (value, n) => {
      if (n <= 0) return PREFIX.length;
      let seen = 0;
      for (let i = 2; i < value.length; i += 1) {
        if (/\d/.test(value[i])) {
          seen += 1;
          if (seen === n) return i + 1;
        }
      }
      return value.length;
    };

    // Сколько цифр номера стоит левее позиции pos
    const digitsBefore = (value, pos) => {
      const count = value.slice(0, pos).replace(/\D/g, '').length;
      return Math.max(0, count - (value.startsWith('+7') && pos >= 2 ? 1 : 0));
    };

    const render = (next, caretDigits) => {
      digits = next.slice(0, 10);
      const value = format(digits);
      input.value = value;
      if (document.activeElement === input) {
        const pos = caretFor(value, clamp(caretDigits, 0, digits.length));
        input.setSelectionRange(pos, pos);
      }
    };

    const parse = (raw, caret) => {
      const hasPrefix = /^\s*\+\s*7/.test(raw);
      let d = raw.replace(/\D/g, '');
      let before = raw.slice(0, caret).replace(/\D/g, '').length;
      if (hasPrefix) {
        d = d.slice(1);
        before -= 1;
      } else if (d.length === 11 && /^[78]/.test(d)) {
        d = d.slice(1);
        before -= 1;
      }
      // Первая набранная «8» или «7» — это код страны, а не номер
      if ((!digits || !hasPrefix) && d.length === 1 && /^[78]/.test(d)) {
        d = '';
        before = 0;
      }
      return { d: d.slice(0, 10), before: clamp(before, 0, 10) };
    };

    input.addEventListener('focus', () => {
      if (!input.value) render('', 0);
      requestAnimationFrame(() => {
        if (document.activeElement !== input) return;
        if ((input.selectionStart ?? 0) < PREFIX.length) {
          input.setSelectionRange(input.value.length, input.value.length);
        }
      });
    });

    input.addEventListener('blur', () => {
      if (!digits) input.value = '';
    });

    input.addEventListener('input', () => {
      const { d, before } = parse(input.value, input.selectionStart ?? input.value.length);
      render(d, before);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const { selectionStart: s, selectionEnd: end, value } = input;
      if (s == null || s !== end) return;

      if (e.key === 'Backspace') {
        if (s <= PREFIX.length) {
          if (digits) e.preventDefault();
          return;
        }
        if (/\d/.test(value[s - 1])) return;
        // Слева скобка или дефис — удаляем ближайшую цифру перед ними
        e.preventDefault();
        const idx = digitsBefore(value, s) - 1;
        if (idx >= 0) render(digits.slice(0, idx) + digits.slice(idx + 1), idx);
      } else {
        if (s >= value.length) return;
        if (s >= PREFIX.length && /\d/.test(value[s])) return;
        e.preventDefault();
        const idx = digitsBefore(value, Math.max(s, PREFIX.length));
        if (idx < digits.length) render(digits.slice(0, idx) + digits.slice(idx + 1), idx);
      }
    });

    input.addEventListener('paste', (e) => {
      const text = e.clipboardData ? e.clipboardData.getData('text') : '';
      if (!text) return;
      e.preventDefault();
      let d = text.replace(/\D/g, '');
      if (d.length === 11 && /^[78]/.test(d)) d = d.slice(1);
      const value = input.value || PREFIX;
      const a = digitsBefore(value, input.selectionStart ?? value.length);
      const b = digitsBefore(value, input.selectionEnd ?? value.length);
      if (d.length >= 10) render(d, 10);
      else render(digits.slice(0, a) + d + digits.slice(b), a + d.length);
    });

    // Браузер мог восстановить значение после перезагрузки
    if (input.value) {
      const { d } = parse(input.value, input.value.length);
      digits = d.slice(0, 10);
      input.value = digits ? format(digits) : '';
    }

    return {
      get digits() {
        return digits;
      },
      reset() {
        digits = '';
        input.value = '';
      },
    };
  }

  /* ------------------------------------------------------------------------
     Отправка заявки.
     Сейчас это заглушка без бэкенда: имитирует запрос и выводит данные
     в консоль. Для боевого режима замените тело на fetch к своему API,
     Telegram-боту или CRM и верните Promise.
     ------------------------------------------------------------------------ */
  function sendBooking(payload) {
    console.info('[AURUM] Новая заявка:', payload);
    return new Promise((resolve) => setTimeout(resolve, 1300));
  }

  /* ------------------------------------------------------------------------
     Форма записи
     ------------------------------------------------------------------------ */
  function buildDays(container) {
    const weekdays = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const weekdaysFull = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const monthsFull = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const today = new Date();
    const frag = document.createDocumentFragment();

    for (let i = 0; i < 7; i += 1) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const prefix = i === 0 ? 'сегодня, ' : i === 1 ? 'завтра, ' : '';
      const human = `${prefix}${weekdaysFull[d.getDay()]}, ${d.getDate()} ${monthsFull[d.getMonth()]}`;

      const label = document.createElement('label');
      label.className = 'day';
      if (i === 0) label.classList.add('is-today');
      if (d.getDay() === 0 || d.getDay() === 6) label.classList.add('is-weekend');
      if (i === 0) label.title = 'Сегодня';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'date';
      input.value = iso;
      input.dataset.human = human;
      input.setAttribute('aria-label', human);

      const box = document.createElement('span');
      box.className = 'day__box';
      box.setAttribute('aria-hidden', 'true');
      box.innerHTML = `<span class="day__wd">${weekdays[d.getDay()]}</span><span class="day__num">${d.getDate()}</span><span class="day__m">${months[d.getMonth()]}</span>`;

      label.append(input, box);
      frag.appendChild(label);
    }
    container.replaceChildren(frag);
  }

  /* ------------------------------------------------------------------------
     Выпадающий список в стиле сайта вместо системного <select>.
     Нативный select остаётся в форме (и работает без JS), скрипт лишь
     рисует поверх него список с аватарками и держит значения в синхроне.
     ------------------------------------------------------------------------ */
  function enhanceSelect(field) {
    const select = $('select', field);
    const label = $('.field__label', field);
    if (!select || !label) return null;
    const options = Array.from(select.options);
    const id = select.id;
    let open = false;
    let active = select.selectedIndex;

    const makeAvatar = (option, extraClass = '') => {
      if (option.dataset.avatar) {
        const img = document.createElement('img');
        img.className = `select__avatar ${extraClass}`.trim();
        img.src = option.dataset.avatar;
        img.alt = '';
        img.width = 40;
        img.height = 40;
        img.decoding = 'async';
        return img;
      }
      const span = document.createElement('span');
      span.className = `select__avatar select__avatar--any ${extraClass}`.trim();
      span.innerHTML = '<svg aria-hidden="true"><use href="#i-spark"/></svg>';
      return span;
    };

    const wrap = document.createElement('div');
    wrap.className = 'select';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'select__button';
    button.id = `${id}-button`;
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `${id}-list`);

    const value = document.createElement('span');
    value.className = 'select__value';
    value.id = `${id}-value`;
    button.setAttribute('aria-labelledby', `${label.id} ${value.id}`);
    button.append(value);
    button.insertAdjacentHTML('beforeend', '<svg class="select__chevron" aria-hidden="true"><use href="#i-chevron"/></svg>');

    const list = document.createElement('ul');
    list.className = 'select__list';
    list.id = `${id}-list`;
    list.tabIndex = -1;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-labelledby', label.id);

    const items = options.map((option, i) => {
      const li = document.createElement('li');
      li.className = 'select__option';
      li.id = `${id}-option-${i}`;
      li.dataset.index = String(i);
      li.setAttribute('role', 'option');
      const text = document.createElement('span');
      text.className = 'select__option-text';
      const name = document.createElement('span');
      name.className = 'select__name';
      name.textContent = option.textContent;
      text.append(name);
      if (option.dataset.note) {
        const note = document.createElement('span');
        note.className = 'select__note';
        note.textContent = option.dataset.note;
        text.append(note);
      }
      li.append(makeAvatar(option), text);
      li.insertAdjacentHTML('beforeend', '<svg class="select__check" aria-hidden="true"><use href="#i-check"/></svg>');
      list.append(li);
      return li;
    });

    wrap.append(button, list);
    select.after(wrap);
    label.htmlFor = button.id;
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    field.classList.add('is-enhanced');

    const render = () => {
      const option = options[select.selectedIndex] || options[0];
      const text = document.createElement('span');
      text.className = 'select__value-text';
      text.textContent = option.textContent;
      value.replaceChildren(makeAvatar(option, 'select__avatar--sm'), text);
      items.forEach((li, i) => li.setAttribute('aria-selected', String(i === select.selectedIndex)));
    };

    const setActive = (i) => {
      active = clamp(i, 0, items.length - 1);
      items.forEach((li, k) => li.classList.toggle('is-active', k === active));
      list.setAttribute('aria-activedescendant', items[active].id);
      // держим активный пункт в поле зрения, не трогая прокрутку страницы
      const li = items[active];
      if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop;
      else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) {
        list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight;
      }
    };

    const onOutside = (e) => {
      if (!wrap.contains(e.target) && e.target !== label) close(false);
    };

    function openList() {
      if (open) return;
      open = true;
      const r = button.getBoundingClientRect();
      const need = Math.min(list.scrollHeight, 340) + 20;
      wrap.classList.toggle('is-up', window.innerHeight - r.bottom < need && r.top > need);
      field.classList.add('is-open');
      wrap.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      setActive(select.selectedIndex);
      list.focus({ preventScroll: true });
      document.addEventListener('pointerdown', onOutside, true);
    }

    function close(focusButton = true) {
      if (!open) return;
      open = false;
      field.classList.remove('is-open');
      wrap.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      list.removeAttribute('aria-activedescendant');
      document.removeEventListener('pointerdown', onOutside, true);
      if (focusButton) button.focus({ preventScroll: true });
    }

    const choose = (i) => {
      if (select.selectedIndex !== i) {
        select.selectedIndex = i;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      render();
    };

    button.addEventListener('click', () => (open ? close() : openList()));
    button.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openList();
      }
    });

    list.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); setActive(active + 1); break;
        case 'ArrowUp': e.preventDefault(); setActive(active - 1); break;
        case 'Home': e.preventDefault(); setActive(0); break;
        case 'End': e.preventDefault(); setActive(items.length - 1); break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          choose(active);
          close();
          break;
        case 'Escape': e.preventDefault(); close(); break;
        case 'Tab': close(false); break;
        default: break;
      }
    });

    list.addEventListener('click', (e) => {
      const li = e.target.closest('.select__option');
      if (!li) return;
      choose(Number(li.dataset.index));
      close();
    });

    list.addEventListener('pointermove', (e) => {
      const li = e.target.closest('.select__option');
      if (li && Number(li.dataset.index) !== active) setActive(Number(li.dataset.index));
    });

    list.addEventListener('focusout', (e) => {
      if (open && !wrap.contains(e.relatedTarget)) close(false);
    });

    // Значение может поменяться снаружи: «Записаться к Артёму», сброс формы
    select.addEventListener('change', render);
    render();

    return { render, close: () => close(false) };
  }

  function initForm(smooth) {
    const formEl = $('#booking-form');
    if (!formEl) return null;

    const card = formEl.closest('.booking__card');
    const successEl = $('#form-success');
    const submitBtn = $('.form__submit', formEl);
    const note = $('.form__note', formEl);
    const noteText = note ? note.textContent : '';
    const nameInput = $('#f-name');
    const phoneInput = $('#f-phone');
    const consentInput = $('#f-consent');
    const masterSelect = $('#f-master');
    const comment = $('#f-comment');
    const days = $('#days');

    if (days) buildDays(days);
    const phone = createPhoneMask(phoneInput);
    const masterField = masterSelect ? masterSelect.closest('[data-select]') : null;
    if (masterField) safe('master select', () => enhanceSelect(masterField));

    const autosize = () => {
      comment.style.height = 'auto';
      comment.style.height = `${comment.scrollHeight + 1}px`;
    };
    comment.addEventListener('input', autosize);

    const fields = {
      name: { input: nameInput, box: nameInput.closest('.field'), error: $('#err-name') },
      phone: { input: phoneInput, box: phoneInput.closest('.field'), error: $('#err-phone') },
      consent: { input: consentInput, box: consentInput.closest('.consent'), error: $('#err-consent') },
    };

    const rules = {
      name() {
        const v = nameInput.value.trim();
        if (!v) return 'Как к вам обращаться?';
        if (v.length < 2) return 'Имя слишком короткое';
        if (!/^[a-zа-яё\s'’-]+$/i.test(v)) return 'Используйте, пожалуйста, только буквы';
        return '';
      },
      phone() {
        const d = phone.digits;
        if (!d) return 'Укажите телефон, чтобы мы могли перезвонить';
        if (d.length < 10) return 'Номер неполный — нужно 10 цифр после +7';
        if (!/^[3489]/.test(d)) return 'Проверьте код оператора или города';
        return '';
      },
      consent() {
        return consentInput.checked ? '' : 'Нужно ваше согласие на обработку данных';
      },
    };

    const check = (name) => {
      const f = fields[name];
      const message = rules[name]();
      if (message) f.error.textContent = message;
      f.box.classList.toggle('is-invalid', Boolean(message));
      if (name !== 'consent') f.box.classList.toggle('is-valid', !message);
      f.input.setAttribute('aria-invalid', String(Boolean(message)));
      return !message;
    };

    const isInvalid = (name) => fields[name].box.classList.contains('is-invalid');

    nameInput.addEventListener('blur', () => { if (nameInput.value.trim()) check('name'); });
    nameInput.addEventListener('input', () => { if (isInvalid('name')) check('name'); });
    phoneInput.addEventListener('blur', () => { if (phone.digits) check('phone'); });
    phoneInput.addEventListener('input', () => {
      if (isInvalid('phone') || phone.digits.length === 10) check('phone');
    });
    consentInput.addEventListener('change', () => { if (isInvalid('consent')) check('consent'); });

    const pulse = (el) => {
      if (!el) return;
      el.classList.remove('is-pulse');
      void el.offsetWidth;
      el.classList.add('is-pulse');
      setTimeout(() => el.classList.remove('is-pulse'), 1000);
    };

    const setLoading = (on) => {
      submitBtn.classList.toggle('is-loading', on);
      submitBtn.setAttribute('aria-busy', String(on));
    };

    const scrollIntoViewIfNeeded = (el, offset = 140) => {
      const r = el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 40) smooth.to(r.top + window.scrollY - offset);
    };

    const collect = () => {
      const data = new FormData(formEl);
      const date = $('input[name="date"]:checked', formEl);
      return {
        name: nameInput.value.trim(),
        phone: phoneInput.value,
        service: data.get('service') || 'не выбрана',
        master: data.get('master') || 'любой свободный',
        date: date ? date.dataset.human : 'не выбрана',
        time: data.get('time') || 'не выбрано',
        comment: String(data.get('comment') || '').trim(),
        createdAt: new Date().toISOString(),
      };
    };

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const results = ['name', 'phone', 'consent'].map(check);
      if (results.includes(false)) {
        const first = ['name', 'phone', 'consent'].find(isInvalid);
        scrollIntoViewIfNeeded(fields[first].box);
        fields[first].input.focus({ preventScroll: true });
        submitBtn.classList.remove('is-shake');
        void submitBtn.offsetWidth;
        submitBtn.classList.add('is-shake');
        return;
      }

      const payload = collect();
      setLoading(true);
      if (note) {
        note.textContent = noteText;
        note.classList.remove('is-error');
      }
      try {
        await sendBooking(payload);
        $('[data-success-name]', successEl).textContent = payload.name.split(/\s+/)[0];
        $('[data-success-phone]', successEl).textContent = payload.phone;
        formEl.hidden = true;
        successEl.hidden = false;
        successEl.focus({ preventScroll: true });
        scrollIntoViewIfNeeded(card, 120);
      } catch (err) {
        console.error(err);
        if (note) {
          note.textContent = 'Не удалось отправить заявку. Позвоните нам: +7 (495) 120-45-45';
          note.classList.add('is-error');
        }
      } finally {
        setLoading(false);
      }
    });

    $('[data-form-again]', successEl).addEventListener('click', () => {
      formEl.reset();
      phone.reset();
      autosize();
      if (masterSelect) masterSelect.dispatchEvent(new Event('change'));
      Object.values(fields).forEach((f) => {
        f.box.classList.remove('is-invalid', 'is-valid');
        f.input.removeAttribute('aria-invalid');
      });
      successEl.hidden = true;
      formEl.hidden = false;
    });

    submitBtn.addEventListener('animationend', () => submitBtn.classList.remove('is-shake'));

    return {
      // Предзаполнение из прайса, карточек мастеров и сертификата
      preset({ service, master } = {}) {
        if (service) {
          const input = $(`input[name="service"][data-key="${service}"]`, formEl);
          if (input) {
            input.checked = true;
            setTimeout(() => pulse(input.closest('.chip')), 900);
          }
        }
        if (master && masterSelect) {
          masterSelect.value = master;
          masterSelect.dispatchEvent(new Event('change'));
          setTimeout(() => pulse(masterSelect.closest('.field')), 900);
        }
      },
    };
  }

  /* ------------------------------------------------------------------------
     Подсветка карточек услуг за курсором
     ------------------------------------------------------------------------ */
  function initPointerEffects() {
    if (!finePointer.matches) return;
    $$('[data-glow]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ------------------------------------------------------------------------
     Плашка сертификата: подробности раскрываются по клику
     ------------------------------------------------------------------------ */
  function initGiftTeaser() {
    $$('.gift-teaser').forEach((box) => {
      const toggle = $('.gift-teaser__toggle', box);
      const panel = document.getElementById(toggle.getAttribute('aria-controls'));
      const set = (open) => {
        box.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        if (panel) panel.inert = !open;
      };
      set(false);
      toggle.addEventListener('click', () => set(!box.classList.contains('is-open')));
    });
  }

  /* ------------------------------------------------------------------------
     Карта грузится, только когда до неё почти доскроллили
     ------------------------------------------------------------------------ */
  function initMap() {
    const frame = $('.map__frame');
    if (!frame || !frame.dataset.src) return;
    const load = () => {
      if (frame.getAttribute('src')) return;
      frame.addEventListener('load', () => frame.classList.add('is-loaded'), { once: true });
      frame.src = frame.dataset.src;
    };
    if (!('IntersectionObserver' in window)) {
      load();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        load();
        io.disconnect();
      }
    }, { rootMargin: '600px 0px' });
    io.observe(frame.closest('.map'));
  }

  /* ------------------------------------------------------------------------
     Кнопка записи на телефоне: прячется, когда форма уже на экране
     ------------------------------------------------------------------------ */
  function initMobileCta() {
    const bar = $('#mobile-cta');
    const card = $('.booking__card');
    if (!bar || !card || !('IntersectionObserver' in window)) return;
    let formVisible = false;
    let typing = false;
    const sync = () => bar.classList.toggle('is-hidden', formVisible || typing);

    new IntersectionObserver(([entry]) => {
      formVisible = entry.isIntersecting;
      sync();
    }, { threshold: 0.15 }).observe(card);

    const isField = (el) => el && el.matches && el.matches('input, select, textarea');
    document.addEventListener('focusin', (e) => {
      if (isField(e.target)) {
        typing = true;
        sync();
      }
    });
    document.addEventListener('focusout', (e) => {
      if (isField(e.target)) {
        typing = false;
        sync();
      }
    });
  }

  /* ------------------------------------------------------------------------
     Подсветка активного пункта навигации
     ------------------------------------------------------------------------ */
  function initScrollSpy() {
    if (!('IntersectionObserver' in window)) return;
    const links = $$('.nav__link');
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-active'));
        const link = byId.get(entry.target.id);
        if (link) link.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach((section) => io.observe(section));
  }

  /* ------------------------------------------------------------------------
     Якорные ссылки
     ------------------------------------------------------------------------ */
  function initAnchors({ smooth, menu, form }) {
    const scrollToHash = (hash, opts) => {
      if (hash === '#top') {
        smooth.to(0, opts);
        return true;
      }
      const target = document.getElementById(hash.slice(1));
      if (!target) return false;
      const offset = parseFloat(target.dataset.offset || '0');
      smooth.to(target.getBoundingClientRect().top + window.scrollY - offset, opts);
      return true;
    };

    const focusTarget = (hash) => {
      const el = hash === '#booking' ? $('#f-name') : document.getElementById(hash.slice(1));
      if (!el) return;
      if (!el.matches('input, a, button') && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      setTimeout(() => el.focus({ preventScroll: true }), 60);
    };

    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute('href');

      // Ссылки-заглушки (соцсети, политика) пока никуда не ведут
      if (hash === '#') {
        e.preventDefault();
        return;
      }
      if (hash !== '#top' && !document.getElementById(hash.slice(1))) return;
      e.preventDefault();

      if (form && (link.dataset.bookService || link.dataset.bookMaster)) {
        form.preset({ service: link.dataset.bookService, master: link.dataset.bookMaster });
      }
      if (menu && menu.isOpen()) menu.close();

      scrollToHash(hash);
      if (history.replaceState) {
        history.replaceState(null, '', hash === '#top' ? location.pathname + location.search : hash);
      }
      if (e.detail === 0 && hash !== '#top') focusTarget(hash);
    });

    return { scrollToHash };
  }

  /* ------------------------------------------------------------------------
     Запуск
     ------------------------------------------------------------------------ */
  const smooth = safe('smooth scroll', initSmoothScroll) || {
    to: (y) => window.scrollTo(0, y),
    stop() {},
  };

  safe('typograph', () => typograph(document.body));
  safe('split', () => $$('[data-split]').forEach(splitWords));
  safe('counters', prepareCounters);
  safe('lazy images', initLazyImages);

  const header = safe('header', initHeader);
  const menu = safe('menu', () => initMenu(smooth, header));
  safe('tabs', () => initTabs(smooth));
  const form = safe('form', () => initForm(smooth));
  const parallax = safe('parallax', initParallax);
  const anchors = safe('anchors', () => initAnchors({ smooth, menu, form }));

  safe('slider', () => $$('[data-slider]').forEach(initSlider));
  safe('accordion', initAccordion);
  safe('pointer effects', initPointerEffects);
  safe('gift teaser', initGiftTeaser);
  safe('map', initMap);
  safe('mobile cta', initMobileCta);
  safe('scrollspy', initScrollSpy);
  safe('year', () => $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); }));

  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.update(y);
    if (parallax) parallax.update(y);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const onResize = debounce(() => {
    if (parallax) parallax.measure();
    onScroll();
  }, 150);
  window.addEventListener('resize', onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize).catch(() => {});
  onScroll();

  runPreloader().then(() => {
    safe('reveal', initReveal);
    if (location.hash && location.hash.length > 1 && anchors) {
      safe('initial hash', () => anchors.scrollToHash(location.hash, { immediate: true }));
    }
  });
})();
