// ПодоСтудия OK: меню, вкладки прайса, галерея работ, нижняя плашка записи, появление блоков.
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Шапка: тонкая линия снизу, когда страница прокручена
const header = $('.site-header');
new IntersectionObserver(([e]) => header.classList.toggle('scrolled', !e.isIntersecting)).observe($('#top-sentinel'));

// Мобильное меню
const menuBtn = $('.menu-btn');
const menu = $('#mobile-menu');
function setMenu(open) {
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Меню');
  $('use', menuBtn).setAttribute('href', `assets/icons.svg#i-${open ? 'x' : 'list'}`);
}
menuBtn.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
});
matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

// Вкладки прайса (стрелки, Home и End переключают)
const tabs = $$('[role="tab"]');
function selectTab(tab, focus = false) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  }
  if (focus) tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (e) => {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    selectTab(tabs[(next + tabs.length) % tabs.length], true);
  });
});
selectTab(tabs[0]);

// Галерея работ: стрелки листают на две карточки, у краёв кнопки гаснут
const gallery = $('.gallery');
const items = $$('li', gallery);
const [prevBtn, nextBtn] = $$('.gallery-nav .round-btn');
$$('.gallery-nav .round-btn').forEach((btn) => btn.addEventListener('click', () => {
  const step = items[0].getBoundingClientRect().width + 14;
  gallery.scrollBy({ left: step * 2 * Number(btn.dataset.dir), behavior: reduceMotion ? 'auto' : 'smooth' });
}));
const edges = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.target === items[0]) prevBtn.disabled = e.isIntersecting;
    if (e.target === items[items.length - 1]) nextBtn.disabled = e.isIntersecting;
  }
}, { root: gallery, threshold: 0.95 });
edges.observe(items[0]);
edges.observe(items[items.length - 1]);

// Нижняя плашка: появляется, когда кнопка записи первого экрана ушла вверх, и прячется у контактов
const bar = $('.mbar');
let pastHero = false;
let nearContacts = false;
function updateBar() {
  const on = pastHero && !nearContacts;
  bar.classList.toggle('on', on);
  bar.inert = !on;
}
new IntersectionObserver(([e]) => {
  pastHero = !e.isIntersecting && e.boundingClientRect.top < 0;
  updateBar();
}).observe($('.hero .btn-primary'));
new IntersectionObserver(([e]) => {
  nearContacts = e.isIntersecting;
  updateBar();
}, { rootMargin: '0px 0px -35% 0px' }).observe($('#contacts'));

// Появление блоков при прокрутке
const reveals = $$('.reveal');
if (reduceMotion) {
  reveals.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  reveals.forEach((el) => io.observe(el));
}
