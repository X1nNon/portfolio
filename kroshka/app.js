const dishes = globalThis.kroshkaMenu;
const categories = { breakfast: 'Завтраки', bakery: 'Выпечка', coffee: 'Кофе', drinks: 'Напитки' };

const nav = document.querySelector('#navigation');
const navToggle = document.querySelector('.nav-toggle');
function closeNav() { nav.classList.remove('is-open'); navToggle.setAttribute('aria-expanded', 'false'); navToggle.querySelector('span').textContent = '+'; }
navToggle.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); navToggle.setAttribute('aria-expanded', String(open)); navToggle.querySelector('span').textContent = open ? '−' : '+'; });
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('is-open')) { closeNav(); navToggle.focus(); } });
window.matchMedia('(min-width: 768px)').addEventListener('change', event => { if (event.matches) closeNav(); });

const filters = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.dish')];
const moreButton = document.querySelector('#show-more');
let activeFilter = 'all';
let expanded = false;
function renderMenu() {
  const matching = cards.filter(card => activeFilter === 'all' || card.dataset.category === activeFilter);
  cards.forEach(card => { card.hidden = !matching.includes(card) || (!expanded && activeFilter === 'all' && matching.indexOf(card) >= 6); });
  moreButton.hidden = activeFilter !== 'all' || expanded;
  moreButton.setAttribute('aria-expanded', String(expanded));
  const count = cards.filter(card => !card.hidden).length;
  document.querySelector('#menu-status').textContent = `Показано ${count} из ${matching.length} позиций. Раздел: ${categories[activeFilter] || 'Всё меню'}.`;
}
filters.forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter; expanded = false;
  filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderMenu();
}));
moreButton.addEventListener('click', () => { expanded = true; renderMenu(); cards[6].querySelector('button').focus({preventScroll:true}); });
renderMenu();

const dishDialog = document.querySelector('#dish-dialog');
document.querySelectorAll('[data-dish]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.dish;
  const item = dishes[key];
  document.querySelector('#dialog-title').textContent = item.title;
  document.querySelector('#dialog-price').textContent = item.price;
  document.querySelector('#dialog-meta').textContent = `${categories[item.category]} / ${item.portion}`;
  document.querySelector('#dialog-description').textContent = item.description;
  document.querySelector('#dialog-ingredients').textContent = item.ingredients;
  document.querySelector('#dialog-allergens').textContent = item.allergens;
  document.querySelector('#dialog-image').src = `assets/${key}.webp`;
  document.querySelector('#dialog-image').alt = button.querySelector('img').alt;
  document.querySelector('#dialog-add').dataset.add = key;
  dishDialog.showModal(); dishDialog.scrollTop = 0; document.body.classList.add('modal-open');
}));

document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => document.body.classList.toggle('modal-open', Boolean(document.querySelector('dialog[open]'))));
  dialog.addEventListener('click', event => { const r = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close(); });
});
// The basket and prototype profile stay on this device. No order or payment is sent.
const cartDialog = document.querySelector('#cart-dialog');
const profileDialog = document.querySelector('#profile-dialog');
const cartItems = document.querySelector('#cart-items');
const toast = document.querySelector('#cart-toast');
const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
const priceOf = key => Number(dishes[key].price.replace(/[^0-9]/g, ''));
const cart = Object.create(null);
let toastTimer;
try {
  const saved = JSON.parse(localStorage.getItem('kroshka-cart') || '{}');
  for (const [key, quantity] of Object.entries(saved || {})) {
    if (Object.hasOwn(dishes, key) && Number.isInteger(quantity) && quantity > 0 && quantity <= 99) cart[key] = quantity;
  }
} catch { /* A fresh basket works without browser storage. */ }
function saveCart() {
  try { localStorage.setItem('kroshka-cart', JSON.stringify(cart)); } catch { /* Keep the current basket in memory. */ }
}
function announce(text) {
  clearTimeout(toastTimer);
  toast.textContent = text;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}
function openDialog(dialog) {
  closeNav();
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('modal-open');
}
function renderCart() {
  const entries = Object.entries(cart);
  const count = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
  const total = entries.reduce((sum, [key, quantity]) => sum + priceOf(key) * quantity, 0);
  document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = count; });
  document.querySelectorAll('[data-open-cart]').forEach(el => el.setAttribute('aria-label', `Открыть заказ. Количество: ${count}`));
  document.querySelector('#cart-empty').hidden = count > 0;
  document.querySelector('#cart-content').hidden = count === 0;
  document.querySelector('#checkout-status').hidden = true;
  document.querySelector('#cart-total').textContent = money(total);
  document.querySelector('#floating-cart').hidden = count === 0;
  document.querySelector('#floating-cart-total').textContent = money(total);
  document.querySelector('#cart-bonus').textContent = Math.floor(total * 0.05);
  cartItems.replaceChildren();
  for (const [key, quantity] of entries) {
    const item = dishes[key];
    const row = document.createElement('li');
    row.className = 'cart-item';
    row.innerHTML = `<img src="assets/${key}-720.webp" alt="" width="76" height="76"><div><h3></h3><div class="cart-controls"><div class="quantity-control"><button data-quantity="-1" data-key="${key}">−</button><span>${quantity}</span><button data-quantity="1" data-key="${key}" ${quantity >= 99 ? 'disabled' : ''}>+</button></div><button class="remove-item" data-remove="${key}">Убрать</button></div></div><span class="cart-item-price">${money(priceOf(key) * quantity)}</span>`;
    row.querySelector('h3').textContent = item.title;
    row.querySelector('[data-quantity="-1"]').setAttribute('aria-label', `Уменьшить количество: ${item.title}`);
    row.querySelector('[data-quantity="1"]').setAttribute('aria-label', `Увеличить количество: ${item.title}`);
    row.querySelector('[data-remove]').setAttribute('aria-label', `Убрать из заказа: ${item.title}`);
    cartItems.append(row);
  }
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (!button || !Object.hasOwn(dishes, button.dataset.add)) return;
  const key = button.dataset.add;
  if ((cart[key] || 0) >= 99) {
    if (dishDialog.open) dishDialog.close();
    announce('В заказе уже 99 порций этого блюда');
    return;
  }
  cart[key] = (cart[key] || 0) + 1;
  saveCart(); renderCart();
  if (dishDialog.open) dishDialog.close();
  announce(`${dishes[key].title}: добавлено в заказ`);
});
cartItems.addEventListener('click', event => {
  const button = event.target.closest('[data-quantity], [data-remove]');
  if (!button) return;
  const key = button.dataset.key || button.dataset.remove;
  const direction = button.dataset.quantity;
  if (direction) cart[key] = Math.min(99, cart[key] + Number(direction));
  else delete cart[key];
  if (cart[key] <= 0) delete cart[key];
  saveCart(); renderCart();
  const sameControl = direction && cartItems.querySelector(`[data-key="${key}"][data-quantity="${direction}"]:not(:disabled)`);
  (sameControl || cartItems.querySelector('button:not(:disabled)') || document.querySelector('#cart-to-menu')).focus();
});
document.querySelectorAll('[data-open-cart]').forEach(button => button.addEventListener('click', () => { renderCart(); openDialog(cartDialog); }));
document.querySelectorAll('[data-open-profile]').forEach(button => button.addEventListener('click', () => {
  showProfileStep(memberPhone ? 'member' : 'phone', false);
  openDialog(profileDialog);
  (memberPhone ? document.querySelector('#profile-title') : phoneInput).focus();
}));
document.querySelector('#cart-to-menu').addEventListener('click', () => {
  cartDialog.close();
  location.hash = 'menu';
  filters[0].focus({preventScroll: true});
});
document.querySelector('#checkout-button').addEventListener('click', () => {
  const status = document.querySelector('#checkout-status');
  status.hidden = false;
  status.scrollIntoView({block: 'nearest', behavior: 'smooth'});
});
// UI prototype only: there is no SMS request, server session or phone verification.
// Any four digits advance the preview. Replace this transition with server-side OTP
// verification before enabling real accounts, bonus balances or payments.
const phoneInput = document.querySelector('#guest-phone');
const codeInput = document.querySelector('#sms-code');
const profileStorageKey = 'kroshka-profile-preview';
let memberPhone = '';
let pendingPhone = '';
function normalizePhone(value) {
  if (/[^\d\s()+-]/.test(value)) return '';
  let digits = value.replace(/\D/g, '');
  if (digits.length === 10) digits = '7' + digits;
  if (digits.length === 11 && digits[0] === '8') digits = '7' + digits.slice(1);
  return /^7[349]\d{9}$/.test(digits) ? digits : '';
}
function formatPhone(phone) {
  return `+7 (${phone.slice(1,4)}) ${phone.slice(4,7)}-${phone.slice(7,9)}-${phone.slice(9,11)}`;
}
try {
  const saved = JSON.parse(localStorage.getItem(profileStorageKey) || 'null');
  if (saved?.version === 1 && typeof saved.phone === 'string') memberPhone = normalizePhone(saved.phone);
  localStorage.removeItem('kroshka-guest-name');
} catch { /* The profile also works in memory when storage is blocked or damaged. */ }
function clearAuthError(input, id) {
  input.removeAttribute('aria-invalid');
  document.querySelector(id).hidden = true;
}
function authError(input, id, message) {
  const error = document.querySelector(id);
  error.textContent = message;
  error.hidden = false;
  input.setAttribute('aria-invalid', 'true');
  input.focus();
}
function showProfileStep(step, focus = true) {
  const member = step === 'member';
  document.querySelector('#phone-form').hidden = step !== 'phone';
  document.querySelector('#code-form').hidden = step !== 'code';
  document.querySelector('#member-profile').hidden = !member;
  profileDialog.classList.toggle('auth-view', !member);
  const title = document.querySelector('#profile-title');
  title.textContent = member ? 'Карта гостя' : step === 'code' ? 'Код из СМС' : 'Вход в профиль';
  clearAuthError(phoneInput, '#phone-error');
  clearAuthError(codeInput, '#code-error');
  codeInput.value = '';
  if (member) document.querySelector('#member-phone').textContent = formatPhone(memberPhone);
  if (step === 'phone') pendingPhone = '';
  profileDialog.scrollTop = 0;
  if (focus) (member ? title : step === 'code' ? codeInput : phoneInput).focus();
}
phoneInput.addEventListener('input', () => clearAuthError(phoneInput, '#phone-error'));
codeInput.addEventListener('input', () => clearAuthError(codeInput, '#code-error'));
document.querySelector('#phone-form').addEventListener('submit', event => {
  event.preventDefault();
  const phone = normalizePhone(phoneInput.value);
  if (!phone) return authError(phoneInput, '#phone-error', 'Введите номер в формате +7 (999) 123-45-67.');
  pendingPhone = phone;
  phoneInput.value = formatPhone(phone);
  document.querySelector('#code-phone').textContent = formatPhone(phone);
  showProfileStep('code');
});
document.querySelector('#change-phone').addEventListener('click', () => showProfileStep('phone'));
document.querySelector('#code-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!pendingPhone) return showProfileStep('phone');
  if (!/^\d{4}$/.test(codeInput.value)) return authError(codeInput, '#code-error', 'Введите код из 4 цифр.');
  memberPhone = pendingPhone;
  pendingPhone = '';
  try { localStorage.setItem(profileStorageKey, JSON.stringify({version: 1, phone: memberPhone})); } catch { /* Retain this preview session in memory. */ }
  showProfileStep('member');
});
document.querySelector('#profile-logout').addEventListener('click', () => {
  memberPhone = '';
  phoneInput.value = '';
  document.querySelector('#member-phone').textContent = '';
  try { localStorage.removeItem(profileStorageKey); } catch { /* In-memory session is cleared regardless. */ }
  showProfileStep('phone');
});
renderCart();

const themeToggle = document.querySelector('#theme-toggle');
const themes = ['auto', 'light', 'dark'];
const themeLabels = { auto: 'авто', light: 'светлая', dark: 'тёмная' };
let theme = 'auto';
try { const saved = localStorage.getItem('kroshka-theme'); if (themes.includes(saved)) theme = saved; } catch { /* The site also works when storage is unavailable. */ }
function applyTheme() { if (theme === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme; themeToggle.textContent = `Тема: ${themeLabels[theme]}`; themeToggle.setAttribute('aria-label', `Цветовая тема: ${themeLabels[theme]}. Переключить`); }
applyTheme();
themeToggle.addEventListener('click', () => { theme = themes[(themes.indexOf(theme) + 1) % themes.length]; applyTheme(); try { localStorage.setItem('kroshka-theme', theme); } catch { /* Optional preference. */ } });
