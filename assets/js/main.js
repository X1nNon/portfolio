// Общее для страницы: контакты, шапка, картинки крупно, появление блоков.

(() => {
  // Контакты: впишите ссылки — кнопки «Написать» и «Позвонить» сразу заработают.
  // Пока ссылки нет, кнопка просто ведёт к блоку «Контакты».
  const CONTACTS = {
    telegram: '', // например: https://t.me/ваш_ник
    max: '', // ссылка на ваш профиль в MAX
    phone: '', // например: +79001234567
  };

  document.querySelectorAll('[data-contact]').forEach((link) => {
    const value = CONTACTS[link.dataset.contact];
    if (!value) return;
    link.href = link.dataset.contact === 'phone' ? `tel:${value.replace(/[^\d+]/g, '')}` : value;
    if (link.dataset.contact !== 'phone') {
      link.target = '_blank';
      link.rel = 'noopener';
    }
  });

  // Шапка получает границу, когда страницу прокрутили.
  const top = document.querySelector('.top');
  const onScroll = () => top.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Картинки работ — крупно по нажатию.
  const viewer = document.getElementById('viewer');
  const viewerImg = viewer.querySelector('img');
  document.querySelectorAll('.shot button').forEach((button) =>
    button.addEventListener('click', () => {
      const img = button.querySelector('img');
      viewerImg.src = img.currentSrc || img.src;
      viewerImg.alt = img.alt;
      viewer.showModal();
    }),
  );
  viewer.addEventListener('click', (e) => {
    if (e.target === viewer || e.target.closest('.viewer__close')) viewer.close();
  });

  // Короткие слова не остаются в конце строки.
  const SHORT = /(?<=^|[\s(«"])(а|в|во|и|к|о|об|от|с|со|у|до|из|за|на|не|по|для|без|при|про|но|или|что|как)\s+(?=\S)/giu;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('script, style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const fixed = n.nodeValue.replace(SHORT, '$1 ').replace(/ (—)/g, ' $1');
    if (fixed !== n.nodeValue) n.nodeValue = fixed;
  }

  // Нижняя панель на телефоне прячется, пока на экране демо бота: иначе она закрывает поле ввода.
  const cta = document.querySelector('.mobile-cta');
  const botSection = document.getElementById('bot');
  if (cta && botSection && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => cta.classList.toggle('is-hidden', entry.isIntersecting), { threshold: 0.15 }).observe(botSection);
  }

  // Блоки появляются при прокрутке.
  const items = document.querySelectorAll('.reveal');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }),
      { rootMargin: '0px 0px -8% 0px' },
    );
    items.forEach((el) => io.observe(el));
  }
})();
