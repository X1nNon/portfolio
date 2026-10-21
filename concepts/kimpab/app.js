(() => {
  'use strict';
  const menu = window.KIMPAB_MENU;
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const panel = document.querySelector('#dish-panel');
  const dishList = document.querySelector('#dish-list');
  const moreDishes = document.querySelector('#more-dishes');
  const pageLink = document.querySelector('#menu-page-link');
  const imagePath = page => 'assets/menu-pages/page-' + String(page).padStart(2, '0') + '.webp';

  function selectTab(tab, focus = false) {
    const category = menu.find(item => item.id === tab.dataset.tab);
    if (!category) return;
    tabs.forEach(button => {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tab.id);
    panel.dataset.category = category.id;
    const cards = [], rows = [];
    category.items.forEach(([name, description, weight, price], index) => {
      const asset = category.images[index];
      const article = document.createElement('article'); article.className = 'dish ' + (asset ? 'dish-card' : 'dish-row');
      if (asset) {
        const frame = document.createElement('div'); frame.className = 'dish-photo';
        const image = document.createElement('img');
        image.src = 'assets/generated/' + asset + '.webp';
        image.srcset = 'assets/generated/' + asset + '-small.webp 500w, assets/generated/' + asset + '.webp 1000w';
        image.sizes = '(max-width: 599px) calc(100vw - 36px), (max-width: 767px) 46vw, 32vw';
        image.alt = (category.id === 'kimpab' ? 'Кимпаб ' : '') + name;
        image.width = 1024; image.height = 768; image.loading = 'lazy'; image.decoding = 'async';
        frame.append(image); article.append(frame);
      }
      const content = document.createElement('div'); content.className = 'dish-body';
      const title = document.createElement('h3'); title.textContent = name;
      const text = document.createElement('p'); text.textContent = description;
      const size = document.createElement('span'); size.className = 'dish-weight'; size.textContent = weight;
      const cost = document.createElement('strong'); cost.textContent = price.toLocaleString('ru-RU') + ' ₽';
      const bottom = document.createElement('div'); bottom.className = 'dish-bottom'; bottom.append(size, cost);
      content.append(title, text, bottom); article.append(content);
      (asset ? cards : rows).push(article);
    });
    dishList.replaceChildren(...cards);
    moreDishes.replaceChildren(...rows);
    moreDishes.parentElement.hidden = rows.length === 0;
    pageLink.href = 'assets/menu.pdf#page=' + category.page;
    pageLink.dataset.openMenu = category.page;
    if (focus) {
      tab.focus({ preventScroll: true });
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectTab(tabs[next], true); }
    });
  });

  const menuDialog = document.querySelector('#menu-dialog');
  const conceptDialog = document.querySelector('#concept-dialog');
  const pageImage = document.querySelector('#menu-page-image');
  const originalLink = document.querySelector('#page-original');
  const sectionSelect = document.querySelector('#menu-section-select');
  const prevButton = document.querySelector('#prev-page');
  const nextButton = document.querySelector('#next-page');
  const viewerBody = document.querySelector('.viewer-body');
  let currentPage = 1;
  let dialogTrigger = null;

  function showPage(page) {
    currentPage = Math.max(1, Math.min(28, Number(page) || 1));
    pageImage.src = imagePath(currentPage);
    pageImage.alt = 'Страница ' + currentPage + ' меню «Кимпаб»';
    originalLink.href = pageImage.getAttribute('src');
    document.querySelector('#page-count').textContent = currentPage + ' / 28';
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === 28;
    const section = [...sectionSelect.options].filter(option => Number(option.value) <= currentPage).at(-1);
    sectionSelect.value = section.value;
    viewerBody.scrollTop = 0;
  }

  function openDialog(dialog, trigger) {
    if (typeof dialog.showModal !== 'function') return false;
    dialogTrigger = trigger;
    dialog.showModal();
    document.body.classList.add('modal-open');
    dialog.querySelector('[data-close-dialog]').focus({ preventScroll: true });
    return true;
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-open-menu]');
    if (!trigger || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (openDialog(menuDialog, trigger)) {
      event.preventDefault();
      showPage(trigger.dataset.openMenu);
    }
  });
  document.querySelector('[data-open-concept]').addEventListener('click', event => openDialog(conceptDialog, event.currentTarget));
  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => button.closest('dialog').close());
  });
  [menuDialog, conceptDialog].forEach(dialog => {
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      dialogTrigger?.focus({ preventScroll: true });
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  prevButton.addEventListener('click', () => showPage(currentPage - 1));
  nextButton.addEventListener('click', () => showPage(currentPage + 1));
  sectionSelect.addEventListener('change', () => showPage(sectionSelect.value));
  menuDialog.addEventListener('keydown', event => {
    if (event.target.matches('select, input, textarea')) return;
    const pages = { ArrowLeft: currentPage - 1, ArrowRight: currentPage + 1, Home: 1, End: 28 };
    if (event.key in pages) { event.preventDefault(); showPage(pages[event.key]); }
  });

  const mobileBar = document.querySelector('.mobile-bar');
  document.querySelector('.copy-address').addEventListener('click', async event => {
    const status = document.querySelector('.address-status');
    try {
      await navigator.clipboard.writeText('Гатчина, Красная улица, 13. Корейский гриль-бар «Кимпаб».');
      status.textContent = 'Адрес скопирован';
    } catch {
      status.textContent = 'Гатчина, Красная улица, 13. Можно выделить и скопировать этот текст.';
    }
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      mobileBar.classList.toggle('is-hidden', entries[0].isIntersecting);
      mobileBar.inert = entries[0].isIntersecting;
    }, { threshold: 0.35 });
    observer.observe(document.querySelector('#booking'));
  }
})();
