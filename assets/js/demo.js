// Демо бота «Точки Опоры»: те же вопросы и тексты, что у настоящего бота. Заявка никуда не уходит —
// карточка для команды и лид в CRM рисуются здесь же, на странице.

(() => {
  const chat = document.getElementById('chat');
  if (!chat) return;
  const phoneEl = document.querySelector('.phone');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const sendButton = form.querySelector('button');
  const status = document.getElementById('chat-status');
  const flow = document.getElementById('flow');
  const crmCard = document.getElementById('crm-card');
  const teamCard = document.getElementById('team-card');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canFocus = matchMedia('(hover: hover)').matches;

  const PLATFORMS = {
    max: { name: 'MAX', source: 'MAX-бот', contactButton: true },
    telegram: { name: 'Telegram', source: 'Telegram-бот', contactButton: true },
    vk: { name: 'ВКонтакте', source: 'ВК-бот', contactButton: false }, // у ботов ВКонтакте нет кнопки «Отправить номер»
  };

  const city = (text, kaliningradIf) => ({
    id: 'city', short: 'Город', text, columns: 1,
    choices: [['spb', 'Санкт‑Петербург'], ['vologda', 'Вологда'], ...(kaliningradIf ? [['kaliningrad', 'Калининград', kaliningradIf]] : [])],
  });

  const BRANCHES = [
    { id: 'buy', label: '🏠 Купить', crm: 'Покупка', questions: [
      { id: 'type', short: 'Ищет', text: 'Что ищете?', columns: 1, choices: [['new', 'Квартиру в новостройке'], ['second', 'Квартиру на вторичке'], ['house', 'Дом или участок'], ['commerce', 'Коммерческую недвижимость']] },
      city('Где ищете?', { type: 'new' }),
      { id: 'budget', short: 'Бюджет', text: 'Какой бюджет?', columns: 2, choices: [['b1', 'До 7 млн ₽'], ['b2', '7–10 млн ₽'], ['b3', '10–15 млн ₽'], ['b4', 'Больше 15 млн ₽'], ['unknown', 'Пока не знаю']] },
      { id: 'payment', short: 'Оплата', text: 'Как планируете оплачивать?', columns: 2, choices: [['mortgage', 'Ипотека'], ['cash', 'Свои средства'], ['matcap', 'С маткапиталом'], ['unknown', 'Пока не знаю']] },
    ] },
    { id: 'sell', label: '💰 Продать', crm: 'Продажа', questions: [
      { id: 'object', short: 'Объект', text: 'Что продаёте?', columns: 2, choices: [['flat', 'Квартиру'], ['house', 'Дом или дачу'], ['land', 'Участок'], ['commerce', 'Коммерческую']] },
      city('Где находится объект?'),
      { id: 'address', short: 'Адрес', text: 'Напишите адрес объекта: район или посёлок и улицу.', input: 'Например: Купчино, ул. Белы Куна' },
      { id: 'timing', short: 'Срок', text: 'Как срочно нужно продать?', columns: 1, choices: [['urgent', 'Срочно, в течение месяца'], ['soon', 'В ближайшие 3 месяца'], ['price', 'Пока хочу узнать цену']] },
    ] },
    { id: 'rent', label: '🔑 Снять', crm: 'Аренда', questions: [
      { id: 'type', short: 'Снимает', text: 'Что хотите снять?', columns: 2, choices: [['flat', 'Квартиру'], ['room', 'Комнату'], ['house', 'Дом'], ['commerce', 'Коммерческое помещение']] },
      city('Где хотите снять?'),
      { id: 'budget', short: 'Бюджет в месяц', text: 'Какой бюджет в месяц?', columns: 2, choices: [['r1', 'До 30 тыс. ₽'], ['r2', '30–50 тыс. ₽'], ['r3', '50–80 тыс. ₽'], ['r4', 'Больше 80 тыс. ₽'], ['unknown', 'Пока не знаю']] },
      { id: 'movein', short: 'Заезд', text: 'Когда нужно заехать?', columns: 1, choices: [['asap', 'Как можно скорее'], ['month', 'В течение месяца'], ['later', 'Позже, пока присматриваюсь']] },
    ] },
    { id: 'rentout', label: '📋 Сдать', crm: 'Сдача в аренду', questions: [
      { id: 'object', short: 'Сдаёт', text: 'Что сдаёте?', columns: 2, choices: [['flat', 'Квартиру'], ['room', 'Комнату'], ['house', 'Дом'], ['commerce', 'Коммерческое помещение']] },
      city('Где находится объект?'),
      { id: 'address', short: 'Адрес', text: 'Напишите адрес объекта: район или посёлок и улицу.', input: 'Например: Девяткино, ул. Озёрная' },
      { id: 'available', short: 'Свободен', text: 'С какого времени можно заселяться?', columns: 1, choices: [['now', 'Уже сейчас'], ['month', 'В течение месяца'], ['later', 'Позже']] },
    ] },
    { id: 'mortgage', label: '🏦 Ипотека', crm: 'Ипотека', questions: [
      { id: 'target', short: 'Покупка', text: 'Что планируете купить?', columns: 2, choices: [['new', 'Новостройку'], ['second', 'Вторичку'], ['house', 'Дом'], ['choosing', 'Пока выбираю']] },
      city('Где планируете покупать?', { target: 'new' }),
      { id: 'downpayment', short: 'Взнос', text: 'Какой первоначальный взнос?', columns: 2, choices: [['none', 'Нет взноса'], ['lt20', 'До 20%'], ['20to50', '20–50%'], ['gt50', 'Больше 50%']] },
      { id: 'benefits', short: 'Льготы', text: 'Есть маткапитал или право на семейную ипотеку?', columns: 1, choices: [['matcap', 'Есть маткапитал'], ['family', 'Подходим под семейную ипотеку'], ['no', 'Нет'], ['unknown', 'Не знаю']] },
    ] },
    { id: 'legal', label: '⚖️ Юридическое сопровождение', crm: 'Юридическое сопровождение', wide: true, questions: [
      city('В каком городе нужна помощь юриста?'),
      { id: 'service', short: 'Услуга', text: 'Что нужно?', columns: 1, choices: [['deal', 'Сопровождение сделки'], ['check', 'Проверить квартиру и продавца'], ['other', 'Другой вопрос к юристу']] },
    ] },
  ];

  const TEXT = {
    welcome: 'Здравствуйте! 👋\nЯ помощник агентства недвижимости «Точка Опоры».\nОтветьте на несколько коротких вопросов — и агент свяжется с вами.\n\nЧем можем помочь?',
    menu: 'Чем можем помочь?',
    consent: 'Почти готово! Остался номер телефона, чтобы агент мог вам перезвонить.\n\nНажимая «Даю согласие», вы соглашаетесь на обработку персональных данных.',
    askPhone: 'Нажмите «📱 Отправить номер» или напишите номер сообщением, например: +7 999 123-45-67',
    askPhoneTyped: 'Напишите номер телефона сообщением, например: +7 999 123-45-67',
    phoneInvalid: 'Не получилось распознать номер 🤔 Напишите его в формате +7 999 123-45-67.',
    done: 'Спасибо! Заявка принята ✅\nАгент свяжется с вами в течение 15 минут.',
    afterDone: 'Это демо — заявка никуда не ушла. Посмотрите, что в этот момент получила бы команда.',
    useButtons: 'Пожалуйста, выберите вариант кнопкой 👇',
    tooShort: 'Напишите, пожалуйста, чуть подробнее.',
  };
  const DEMO_PHONE = '+7 900 123-45-67';
  const LEAD_NO = 27;
  const CRM_NO = 128;

  let platform = 'max';
  let state;
  let busy = false;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, reduced ? 0 : ms));
  const scrollChat = () => { chat.scrollTop = chat.scrollHeight; };
  const time = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const branch = () => BRANCHES.find((item) => item.id === state.branch);
  const question = () => branch()?.questions[state.q];
  const visible = (q) => q.choices.filter(([, , onlyIf]) => !onlyIf || Object.entries(onlyIf).every(([key, value]) => state.picked[key] === value));

  const formatPhone = (digits) => `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  const normalizePhone = (raw) => {
    const d = String(raw).replace(/\D/g, '');
    if (d.length === 11 && /^[78]/.test(d)) return formatPhone(`7${d.slice(1)}`);
    if (d.length === 10 && d[0] === '9') return formatPhone(`7${d}`);
    return null;
  };

  // ── Сообщения ──────────────────────────────────────────────
  function keys(rows) {
    const box = el('div', 'keys');
    for (const row of rows) {
      const line = el('div', 'keys__row');
      for (const key of row) {
        const button = el('button', '', key.text);
        button.type = 'button';
        button.addEventListener('click', () => {
          if (busy) return;
          if (!key.keep) box.classList.add('is-used');
          key.onClick();
        });
        line.append(button);
      }
      box.append(line);
    }
    return box;
  }

  async function bot(text, rows) {
    busy = true;
    const typing = el('div', 'typing');
    typing.innerHTML = '<i></i><i></i><i></i>';
    chat.append(typing);
    scrollChat();
    await sleep(450 + Math.min(text.length * 5, 650));
    typing.remove();
    chat.querySelectorAll('.keys:not(.is-used)').forEach((old) => old.classList.add('is-used'));
    chat.append(el('div', 'msg msg--bot', text));
    if (rows?.length) chat.append(keys(rows));
    scrollChat();
    busy = false;
  }
  const user = (text) => {
    chat.append(el('div', 'msg msg--user', text));
    scrollChat();
  };

  function setInput(placeholder) {
    input.disabled = !placeholder;
    sendButton.disabled = !placeholder;
    input.placeholder = placeholder || 'Выберите вариант кнопкой';
    if (placeholder && canFocus) input.focus({ preventScroll: true });
  }

  function setFlow(step) {
    flow.querySelectorAll('[data-step]').forEach((item) => item.classList.toggle('is-active', Number(item.dataset.step) <= step));
  }

  // ── Шаги сценария ──────────────────────────────────────────
  function menuRows() {
    const rows = [];
    let pair = [];
    for (const item of BRANCHES) {
      const key = { text: item.label, onClick: () => pick(item) };
      if (item.wide) {
        if (pair.length) rows.push(pair);
        rows.push([key]);
        pair = [];
        continue;
      }
      pair.push(key);
      if (pair.length === 2) {
        rows.push(pair);
        pair = [];
      }
    }
    if (pair.length) rows.push(pair);
    return rows;
  }

  const back = () => [{ text: '⬅️ Назад', onClick: goBack }];

  async function start() {
    state = { step: 'menu', branch: null, q: 0, answers: [], picked: {}, phone: '', taken: null };
    chat.replaceChildren();
    crmCard.hidden = true;
    teamCard.hidden = true;
    setFlow(0);
    setInput('');
    await bot(TEXT.welcome, menuRows());
  }

  async function pick(item) {
    user(item.label);
    Object.assign(state, { step: 'question', branch: item.id, q: 0, answers: [], picked: {} });
    setFlow(1);
    await ask();
  }

  async function ask(prefix) {
    const q = question();
    const total = branch().questions.length;
    const text = `${prefix ? `${prefix}\n\n` : ''}Вопрос ${state.q + 1} из ${total}\n${q.text}`;
    if (q.input) {
      setInput(q.input);
      await bot(text, [back()]);
      return;
    }
    setInput('');
    const choices = visible(q).map(([id, label]) => ({ text: label, onClick: () => choose(q, id, label) }));
    const rows = [];
    for (let i = 0; i < choices.length; i += q.columns) rows.push(choices.slice(i, i + q.columns));
    await bot(text, [...rows, back()]);
  }

  function record(q, answer) {
    state.answers = state.answers.filter((item) => item.id !== q.id);
    state.answers.push({ id: q.id, short: q.short, answer });
  }

  async function choose(q, id, label) {
    user(label);
    state.picked[q.id] = id;
    record(q, label);
    await next();
  }

  async function next() {
    state.q += 1;
    if (state.q < branch().questions.length) return ask();
    return askConsent();
  }

  async function askConsent() {
    state.step = 'consent';
    setInput('');
    await bot(TEXT.consent, [[{ text: '✅ Даю согласие', onClick: consent }], back()]);
  }

  async function consent() {
    user('Даю согласие');
    await askPhone();
  }

  async function askPhone(invalid) {
    state.step = 'phone';
    const { contactButton } = PLATFORMS[platform];
    setInput('+7 900 123-45-67');
    const rows = [];
    if (contactButton) {
      rows.push([{ text: '📱 Отправить номер', onClick: () => { user(DEMO_PHONE); finish(DEMO_PHONE); } }]);
    }
    rows.push(back());
    await bot(invalid ? TEXT.phoneInvalid : contactButton ? TEXT.askPhone : TEXT.askPhoneTyped, rows);
  }

  async function goBack() {
    user('⬅️ Назад');
    if (state.step === 'phone') return askConsent();
    if (state.step === 'consent') {
      state.step = 'question';
      state.q = branch().questions.length - 1;
      return ask();
    }
    if (state.step === 'question' && state.q > 0) {
      state.q -= 1;
      return ask();
    }
    state.step = 'menu';
    setInput('');
    setFlow(0);
    return bot(TEXT.menu, menuRows());
  }

  async function finish(rawPhone) {
    state.phone = normalizePhone(rawPhone) ?? rawPhone;
    state.step = 'done';
    setInput('');
    await bot(TEXT.done);
    setFlow(2);
    renderCrm();
    await sleep(600);
    setFlow(3);
    renderTeam();
    await bot(TEXT.afterDone, [
      [{ text: '👀 Что получила команда', keep: true, onClick: showTeam }],
      [{ text: '🔄 Начать заново', onClick: start }],
    ]);
  }

  function showTeam() {
    teamCard.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    teamCard.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 600, delay: 300 });
  }

  // ── Что видит команда ──────────────────────────────────────
  function renderCrm() {
    const card = el('div', 'crm');
    const head = el('div', 'crm__top');
    head.append(el('b', '', `Лид №${CRM_NO}`), el('span', 'crm__status', 'Новый'));
    const list = el('dl');
    const row = (term, value) => list.append(el('dt', '', term), el('dd', '', value));
    row('Источник', PLATFORMS[platform].source);
    row('Запрос', `${branch().crm}: ${state.answers.map((item) => item.answer).join(', ')}`);
    row('Телефон', state.phone);
    card.append(head, list);
    if (state.taken) card.append(el('div', 'crm__took', `✋ «Беру» нажал(а): Анна Белова, ${state.taken}`));
    crmCard.replaceChildren(card);
    crmCard.hidden = false;
  }

  function renderTeam() {
    const lines = [
      `🔔 Новая заявка №${LEAD_NO} · ${PLATFORMS[platform].name}`,
      branch().label,
      ...state.answers.map((item) => `• ${item.short}: ${item.answer}`),
      `📞 ${state.phone}`,
      `✅ В CRM: лид №${CRM_NO}`,
    ];
    const card = el('div', 'team-card', lines.join('\n'));
    if (state.taken) {
      card.append(el('div', 'team-card__took', `✋ Взял(а): Анна, ${state.taken}`));
    } else {
      const take = el('button', 'team-card__take', '✋ Беру');
      take.type = 'button';
      take.addEventListener('click', () => {
        state.taken = time();
        setFlow(4);
        renderTeam();
        renderCrm();
      });
      card.append(take);
    }
    teamCard.replaceChildren(card);
    teamCard.hidden = false;
  }

  // ── Ввод текста ────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    user(text);
    const q = question();
    if (state.step === 'question' && q?.input) {
      if (text.length < 2) return ask(TEXT.tooShort);
      record(q, text.slice(0, 200));
      return next();
    }
    if (state.step === 'phone') {
      return normalizePhone(text) ? finish(text) : askPhone(true);
    }
    return bot(TEXT.useButtons);
  });

  // ── Мессенджеры: один бот — три оформления ─────────────────
  document.querySelectorAll('[data-platform]').forEach((tab) =>
    tab.addEventListener('click', () => {
      platform = tab.dataset.platform;
      document.querySelectorAll('[data-platform]').forEach((other) => other.setAttribute('aria-selected', String(other === tab)));
      phoneEl.dataset.theme = platform;
      status.textContent = `бот · ${PLATFORMS[platform].name}`;
      if (state?.step === 'done') {
        renderCrm();
        renderTeam();
      }
    }),
  );

  // Демо оживает, когда до него долистали: приветствие «печатается» на глазах.
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    start();
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        io.disconnect();
        go();
      }
    }, { threshold: 0.25 });
    io.observe(phoneEl);
  } else {
    go();
  }
})();
