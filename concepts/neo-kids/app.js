// Нео Кидс: меню, выбор возраста в неделе, фонарик для невидимых чернил, плашка записи на телефоне.

// линия под шапкой после прокрутки
const header = document.querySelector('.top');
const sensor = document.createElement('div');
sensor.style.cssText = 'position:absolute;top:0;height:1px;width:1px';
document.body.prepend(sensor);
new IntersectionObserver(([e]) => header.classList.toggle('lined', !e.isIntersecting)).observe(sensor);

// меню на узких экранах
const menuBtn = document.querySelector('.menu-btn');
const nav = document.getElementById('nav');
const narrow = matchMedia('(max-width: 900px)');
const setMenu = (open) => { nav.hidden = narrow.matches && !open; menuBtn.setAttribute('aria-expanded', String(open)); };
setMenu(false);
narrow.addEventListener('change', () => setMenu(false));
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
});

// неделя по возрасту
const ages = [...document.querySelectorAll('.ages [role="radio"]')];
const slots = [...document.querySelectorAll('.slot')];
const count = document.querySelector('.count');
const plural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
};
const pick = (btn, focus) => {
  ages.forEach((b) => { const on = b === btn; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  const lo = +btn.dataset.lo, hi = +btn.dataset.hi;
  const kinds = new Set();
  slots.forEach((s) => {
    const fit = +s.dataset.lo <= hi && +s.dataset.hi >= lo;
    s.classList.toggle('off', !fit);
    if (fit) kinds.add(s.querySelector('a').hash);
  });
  const n = kinds.size;
  document.querySelectorAll('.day').forEach((d) => {
    d.querySelector('.empty').hidden = !!d.querySelector('.slot:not(.off)');
  });
  const what = `${n} ${plural(n, 'направление', 'направления', 'направлений')} в расписании`;
  count.textContent = lo === 0 ? `Всего ${what}` : `${btn.textContent}: ${what}`;
  if (focus) btn.focus();
};
ages.forEach((b, i) => {
  b.addEventListener('click', () => pick(b));
  b.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) { e.preventDefault(); pick(ages[(i + step + ages.length) % ages.length], true); }
    if (e.key === 'Home') { e.preventDefault(); pick(ages[0], true); }
    if (e.key === 'End') { e.preventDefault(); pick(ages[ages.length - 1], true); }
  });
});
pick(ages[0]);

// невидимые чернила: текст проявляется под фонариком
const ink = document.querySelector('[data-ink]');
const paper = ink.querySelector('.ink-paper');
const text = ink.querySelector('.ink-text');
const inkBtn = ink.querySelector('.ink-btn');
const shine = (e) => {
  const r = paper.getBoundingClientRect(), t = text.getBoundingClientRect();
  paper.style.setProperty('--x', `${e.clientX - r.left}px`);
  paper.style.setProperty('--y', `${e.clientY - r.top}px`);
  text.style.setProperty('--mx', `${e.clientX - t.left}px`);
  text.style.setProperty('--my', `${e.clientY - t.top}px`);
};
paper.addEventListener('pointermove', shine);
paper.addEventListener('pointerdown', shine);
paper.addEventListener('pointerleave', () => {
  ['--x', '--y'].forEach((v) => paper.style.removeProperty(v));
  ['--mx', '--my'].forEach((v) => text.style.removeProperty(v));
});
inkBtn.addEventListener('click', () => {
  const lit = !ink.classList.contains('lit');
  ink.classList.toggle('lit', lit);
  inkBtn.setAttribute('aria-pressed', String(lit));
  inkBtn.querySelector('span').textContent = lit ? 'Выключить фонарик' : 'Посветить фонариком';
});

// плашка «Записаться» на телефоне: видна, когда кнопки первого экрана ушли вверх, и прячется у контактов
const bar = document.querySelector('.mbar');
const heroActions = document.querySelector('.hero-actions');
const contacts = document.getElementById('kontakty');
let heroGone = false, nearEnd = false;
const sync = () => {
  const on = heroGone && !nearEnd;
  bar.classList.toggle('on', on);
  bar.inert = !on;
};
new IntersectionObserver(([e]) => { heroGone = !e.isIntersecting && e.boundingClientRect.top < 0; sync(); }).observe(heroActions);
new IntersectionObserver(([e]) => { nearEnd = e.isIntersecting; sync(); }, { rootMargin: '0px 0px -30% 0px' }).observe(contacts);
