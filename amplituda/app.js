const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const themeButton=$('.theme-switch');
const syncTheme=()=>{if(themeButton){themeButton.textContent=document.documentElement.dataset.theme==='dark'?'Светлая тема':'Тёмная тема';themeButton.setAttribute('aria-label',themeButton.textContent+': переключить оформление');}};
syncTheme();
themeButton?.addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('amplituda-theme',theme);}catch{}syncTheme();});
const menuButton=$('.menu-toggle'),nav=$('#main-nav');
function closeMenu(){menuButton?.setAttribute('aria-expanded','false');nav?.classList.remove('is-open');}
menuButton?.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menuButton?.getAttribute('aria-expanded')==='true'){closeMenu();menuButton.focus();}});
document.addEventListener('click',event=>{if(menuButton?.getAttribute('aria-expanded')==='true'&&!event.target.closest('header'))closeMenu();});
matchMedia('(min-width: 1024px)').addEventListener('change',event=>{if(event.matches)closeMenu();});

const search=$('#service-search');
if(search){let active='all';const cards=$$('.catalog .service-card'),filterButtons=$$('[data-filter]');
 const update=()=>{const query=search.value.trim().toLocaleLowerCase('ru-RU').replaceAll('ё','е');let count=0;
 cards.forEach(card=>{const match=(active==='all'||card.dataset.group===active)&&card.dataset.search.replaceAll('ё','е').includes(query);card.hidden=!match;if(match)count++;});
 $('.result-count').textContent=`Найдено: ${count} из ${cards.length}`;$('.empty-state').hidden=count>0;
 };
 filterButtons.forEach(button=>button.addEventListener('click',()=>{active=button.dataset.filter;filterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));update();}));
 search.addEventListener('input',update);
 $('#reset-filters')?.addEventListener('click',()=>{search.value='';active='all';filterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter==='all')));update();search.focus();});
}

const form=$('#booking-form');
if(form)initBooking().catch(()=>{const message=document.createElement('p');message.className='safety-panel';message.setAttribute('role','alert');message.textContent='Не удалось загрузить расписание. Обновите страницу и попробуйте снова.';form.prepend(message);$('button[type=submit]',form).disabled=true;});
async function initBooking(){
 const response=await fetch('/portfolio/amplituda/data.json');if(!response.ok)throw new Error('Schedule data unavailable');const {services,specialists}=await response.json();
 const service=$('#service'),specialist=$('#specialist'),date=$('#date'),slots=$('#time-slots'),summary=$('#booking-summary'),selected=$('#selected-specialist'),dialog=$('#booking-result');
 const money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
 // Build scheduling limits from Samara time, independent of the visitor's timezone.
 const samaraDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Samara',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const today=samaraDate();const last=new Date(today+'T12:00:00+04:00');last.setUTCDate(last.getUTCDate()+30);const max=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Samara',year:'numeric',month:'2-digit',day:'2-digit'}).format(last);
 date.min=today;date.max=max;
 const validDate=()=>/^\d{4}-\d{2}-\d{2}$/.test(date.value)&&date.value>=samaraDate()&&date.value<=max;
 const currentService=()=>services.find(s=>s.id===service.value);
 const currentSpecialist=()=>specialists.find(p=>p.id===specialist.value);
 const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',weekday:'long',timeZone:'Europe/Samara'}).format(new Date(value+'T12:00:00+04:00'));
 const chosenTime=()=>$('input[name=time]:checked',form)?.value;
 function clearError(id){const control=$('#'+id),error=$('#'+id+'-error');control?.removeAttribute('aria-invalid');if(error)error.hidden=true;}
 function fillSpecialists(preferred){const s=currentService();specialist.replaceChildren(new Option(s?'Выберите специалиста':'Сначала выберите процедуру',''));if(s)specialists.filter(p=>p.services.includes(s.id)).forEach(p=>specialist.add(new Option(`${p.name} · ${p.years} лет практики`,p.id)));if([...specialist.options].some(o=>o.value===preferred))specialist.value=preferred;renderPortrait();}
 function renderPortrait(){const p=currentSpecialist();selected.hidden=!p;selected.replaceChildren();if(p){const photo=document.createElement('img');photo.src='/portfolio/amplituda/assets/'+p.image+'-480.webp';photo.alt=p.name;photo.className='avatar';photo.width=48;photo.height=48;const text=document.createElement('div'),name=document.createElement('b'),note=document.createElement('small');name.textContent=p.name;note.textContent=p.years+' лет практики';text.append(name,note);selected.append(photo,text);}}
 function refreshSlots(){slots.replaceChildren();clearError('time');const p=currentSpecialist();if(!p||!validDate()){const hint=document.createElement('p');hint.className='field-hint';hint.textContent='Выберите специалиста и дату, чтобы увидеть время.';slots.append(hint);renderSummary();return;}
 const day=new Date(date.value+'T12:00:00+04:00').getUTCDay();if(!p.days.includes(day)){const note=document.createElement('p');note.className='form-mode-note';note.setAttribute('role','status');note.textContent='В этот день специалист не принимает. Выберите другую дату или специалиста.';slots.append(note);renderSummary();return;}
 const times=['09:00','10:30','12:00','13:30','15:00','16:30','18:00'];const group=document.createElement('div');group.className='time-options';let available=0;
 for(const time of times){const label=document.createElement('label'),radio=document.createElement('input'),text=document.createElement('span');radio.type='radio';radio.name='time';radio.value=time;radio.required=true;radio.disabled=new Date(date.value+'T'+time+':00+04:00').getTime()<=Date.now();if(!radio.disabled)available++;text.textContent=time;label.append(radio,text);group.append(label);radio.addEventListener('change',()=>{clearError('time');renderSummary();});}
 slots.append(group);if(!available){const note=document.createElement('p');note.className='field-hint';note.textContent='На сегодня время закончилось. Выберите другой день.';slots.append(note);}renderSummary();}
 function renderSummary(){const s=currentService(),p=currentSpecialist(),time=chosenTime();summary.replaceChildren();if(!s){const hint=document.createElement('p');hint.className='muted';hint.textContent='Выберите процедуру, и здесь появятся детали.';summary.append(hint);return;}const dl=document.createElement('dl');const entries=[['Процедура',s.title],['Продолжительность',s.duration+' минут'],['Специалист',p?.name||'Пока не выбран'],['Дата и время',validDate()?formatDate(date.value)+(time?' · '+time:''): 'Пока не выбраны']];entries.forEach(([label,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);dl.append(row);});const total=document.createElement('div');total.className='total';const label=document.createElement('span'),amount=document.createElement('strong');label.textContent='Стоимость';amount.textContent=money(s.price);total.append(label,amount);summary.append(dl,total);}
 service.addEventListener('change',()=>{clearError('service');clearError('specialist');fillSpecialists(specialist.value);refreshSlots();});specialist.addEventListener('change',()=>{clearError('specialist');renderPortrait();refreshSlots();});date.addEventListener('change',()=>{clearError('date');refreshSlots();});
 const params=new URLSearchParams(location.search);const presetService=services.find(s=>s.id===params.get('service')),presetSpecialist=specialists.find(p=>p.id===params.get('specialist'));if(presetService)service.value=presetService.id;else if(presetSpecialist)service.value=presetSpecialist.services[0];fillSpecialists(presetSpecialist?.id);renderSummary();
 function showError(id){const control=$('#'+id),error=$('#'+id+'-error');if(error)error.hidden=false;control?.setAttribute('aria-invalid','true');if(control&&!control.getAttribute('aria-describedby')?.includes(id+'-error'))control.setAttribute('aria-describedby',id+'-error');}
 form.addEventListener('submit',event=>{event.preventDefault();['service','specialist','date','time'].forEach(clearError);const s=currentService(),p=currentSpecialist(),time=chosenTime();let first;
 if(!s){showError('service');first=service;}
 if(!p||!p.services.includes(service.value)){showError('specialist');first??=specialist;}
 if(!validDate()){showError('date');first??=date;}
 if(!time){showError('time');first??=$('input[name=time]:not(:disabled)',form)||date;}
 if(first){first.focus();return;}
 if(!p.days.includes(new Date(date.value+'T12:00:00+04:00').getUTCDay())||new Date(date.value+'T'+time+':00+04:00').getTime()<=Date.now()){refreshSlots();showError('time');date.focus();return;}
 const details=$('#result-details');details.replaceChildren();for(const value of [s.title,p.name,formatDate(date.value)+' в '+time,s.duration+' минут · '+money(s.price)]){const row=document.createElement('p');row.textContent=value;details.append(row);}dialog.showModal();
 });
 $('.dialog-close',dialog).addEventListener('click',()=>dialog.close());$('.dialog-done',dialog).addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
}
