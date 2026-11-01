/* AulaFinder • JavaScript vanilla.
 * Tutti gli orari sono integrati nel sito tramite data.js, senza link esterni.
 * Giorni: lunedì-venerdì. Ore: 1-6. Nessuna presenza è rilevata in tempo reale.
 */
(() => {
  'use strict';
  const DATA = window.AULAFINDER_DATA;
  if (!DATA) { console.error('AulaFinder: data.js mancante'); return; }

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const daySelect = $('#daySelect');
  const hourSelect = $('#hourSelect');
  const searchInput = $('#searchInput');
  const names = {classes:'Orari classi',rooms:'Orari aule',teachers:'Orari professori',freeRooms:'Orari aule libere'};
  // Icone SVG coerenti con il mockup: aula, gruppo classe e tocco accademico.
  const entityIcons = {
    rooms: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"entity-icon\" fill=\"currentColor\"><path d=\"M12 2a8 8 0 0 0-8 8c0 5.3 8 12 8 12s8-6.7 8-12a8 8 0 0 0-8-8Zm0 11.1a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Z\"/></svg>",
    classes: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"entity-icon\" fill=\"currentColor\"><circle cx=\"12\" cy=\"6\" r=\"3.5\"/><circle cx=\"4.5\" cy=\"9\" r=\"2.7\"/><circle cx=\"19.5\" cy=\"9\" r=\"2.7\"/><path d=\"M5 21v-3c0-3.6 2.7-6 7-6s7 2.4 7 6v3H5Zm-5-1v-3.2c0-2.5 1.5-4.4 4-4.7 1 .1 1.9.5 2.5 1.2A7.7 7.7 0 0 0 3 19.2v.8H0Zm24 0h-3v-.8a7.7 7.7 0 0 0-3.5-5.9c.7-.7 1.5-1.1 2.5-1.2 2.5.3 4 2.2 4 4.7V20Z\"/></svg>",
    teachers: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"entity-icon\" fill=\"currentColor\"><path d=\"M12 2 0 8.5 12 15l9-4.9v6.3h2V8.5L12 2Zm-6 11v4.8C7.4 19.3 9.7 20 12 20s4.6-.7 6-2.2V13l-6 3.3L6 13Z\"/></svg>"
  };
  // Un'unica famiglia di icone SVG in TUTTE le sezioni e risultati.
  const clockIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" class="entity-icon" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>';
  const searchIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" class="entity-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 5 5"/></svg>';
  const planIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" class="plan-link-icon" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15m6-12v15"/></svg>';
  const scheduleIcons = {...entityIcons,freeRooms:entityIcons.rooms,clock:clockIcon,search:searchIcon};
  document.querySelectorAll('[data-icon]').forEach(el=>{
    el.innerHTML=scheduleIcons[el.dataset.icon]||clockIcon;
  });
  const TEACHER_NAMES = window.AULAFINDER_DOCENTI?.names || {};
  // Formato aule: sempre con il punto e lo zero davanti (T.02, P.04, S.01...).
  const renRoom = (r) => { const m=String(r).match(/^(Informatica\s+)?([PST])\.?(\d+)$/i); return m ? (m[1]||'')+m[2].toUpperCase()+'.'+m[3].padStart(2,'0') : r; };
  const canon = (s) => norm(renRoom(norm(s).replace(/^AULA\s+/,''))).replace(/[.\s]/g,'');
  const state = {page:'home',schedule:'classes',selection:'',result:null,history:[],scheduleReturn:'orari'};
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
  const date = () => daySelect.value;
  const hour = () => Number(hourSelect.value);
  const lesson = (item, day=date(), index=hour()-1) => item?.days?.[day]?.[index] || null;
  // Subject always appears after teacher name/alias in every view.
  function teacherKey(code,subject=''){
    if(code==='BA AN' && subject) return /inglese/i.test(subject)?'BA AN (INGLESE)':'BA AN (SCIENZE)';
    return code;
  }
  function teachingSubject(id){
    const teacher=DATA.teachers[id];
    if(!teacher) return 'Materia non specificata';
    let arr=[...new Set(Object.values(teacher.days).flat().filter(Boolean).map(x=>x.subject))];
    if(arr.includes('Matematica e Fisica')) arr=arr.filter(x=>!['Matematica','Fisica'].includes(x));
    if(arr.includes('Italiano e Latino')) arr=arr.filter(x=>!['Italiano','Latino'].includes(x));
    if(arr.includes('Storia e Filosofia')) arr=arr.filter(x=>!['Filosofia','Storia'].includes(x));
    return arr.join(' / ');
  }
  function teacherBase(code,subject=''){
    const key=teacherKey(code,subject);
    return TEACHER_NAMES[key] || TEACHER_NAMES[code] || code.replace(/ \(.*?\)$/,'');
  }
  function prof(code,subject=''){
    const key=teacherKey(code,subject);
    const subj=subject || teachingSubject(key);
    return `Prof. ${teacherBase(code,subject)} (${subj})`;
  }
  const label = (kind,id) => kind === 'classes' ? `Classe ${id}` : kind === 'rooms' ? (id==='Palestra'?'Palestra':`Aula ${id}`) : prof(id);
  // Ordine richiesto per TUTTE le liste: S, P, Palestra, T, 1, 2, 3.
  // L'etichetta 'Informatica X' usa il piano/codice X, senza perdere il nome.
  function roomSortKey(id){
    const original=String(id);
    const upper=original.toUpperCase();
    const base=upper.replace(/^INFORMATICA\s+/, '');
    const isLab=upper!==base ? 1 : 0;
    if(/^S(?:\d|\.)/.test(base)) return [0,parseFloat(base.slice(1).replace('.',''))||0,isLab,original];
    if(/^P\.\d/.test(base)) return [1,parseFloat(base.slice(2))||0,isLab,original];
    if(base==='PALESTRA') return [2,0,0,original];
    if(/^T(?:\d|\.)/.test(base)) return [3,parseFloat(base.slice(1).replace('.',''))||0,isLab,original];
    const match=base.match(/^([123])\.(\d+)$/);
    if(match) return [3+Number(match[1]),Number(match[2]),isLab,original];
    return [7,999,0,original];
  }
  function sortRooms(a,b){const aa=roomSortKey(a),bb=roomSortKey(b);for(let i=0;i<Math.max(aa.length,bb.length);i++){if(aa[i]===undefined)return-1;if(bb[i]===undefined)return 1;const cmp=typeof aa[i]==='number'&&typeof bb[i]==='number'?aa[i]-bb[i]:String(aa[i]).localeCompare(String(bb[i]),'it',{numeric:true});if(cmp)return cmp;}return 0;}


  try { const saved = JSON.parse(localStorage.getItem('aulafinder.history') || '[]'); if(Array.isArray(saved)) state.history=saved.slice(0,8).map(h=>h&&h.kind==='rooms'?{...h,id:renRoom(h.id)}:h).filter(h=>h&&DATA[h.kind]?.[h.id]); } catch (_) {}
  const currentDay = new Intl.DateTimeFormat('it-IT',{weekday:'long',timeZone:'Europe/Rome'}).format(new Date());
  const today = DATA.days.find(d => norm(d) === norm(currentDay));
  daySelect.value = today || 'Lunedì';
  hourSelect.value = '1'; // Gli orari reali delle campanelle non sono specificati nei PDF.

  function addHistory(kind, id) {
    state.history=[{kind,id},...state.history.filter(e=>!(e.kind===kind&&e.id===id))].slice(0,8);
    try {localStorage.setItem('aulafinder.history',JSON.stringify(state.history));}catch(_){}
    renderHistory();
  }
  function renderHistory(){
    $('#historyList').innerHTML = state.history.length ? state.history.map((h,i)=>
      `<button class="history-item" type="button" data-history="${i}"><span class="icon-inline">${entityIcons[h.kind]}</span>${escapeHtml(label(h.kind,h.id))}</button>`).join(''):
      '<p class="small-muted">Nessuna ricerca recente.</p>';
    $('#clearHistoryButton').disabled = state.history.length === 0;
  }
  function clearHistory(){
    if (!state.history.length) return;
    if (!window.confirm('Vuoi cancellare tutta la cronologia delle ricerche?')) return;
    state.history = [];
    try { localStorage.removeItem('aulafinder.history'); } catch (_) {}
    renderHistory();
  }
  function closeMenu(){
    $('#sidebar').classList.remove('is-open');
    $('#sidebarBackdrop').hidden=true;
    $('#menuButton').setAttribute('aria-expanded','false');
    $('#menuButton').setAttribute('aria-label','Apri menu');
    document.body.classList.remove('mobile-menu-open');
  }
  function openMenu(){
    $('#sidebar').classList.add('is-open');
    $('#sidebarBackdrop').hidden=false;
    $('#menuButton').setAttribute('aria-expanded','true');
    $('#menuButton').setAttribute('aria-label','Chiudi menu');
    if(window.matchMedia('(max-width:680px)').matches) document.body.classList.add('mobile-menu-open');
  }
  function go(page){
    state.page=page;
    if(page!=='piantina' && page!=='results') state.planFromResult=false;
    const planBack=$('#planBackButton'); if(planBack) planBack.hidden=!(page==='piantina' && state.planFromResult);
    $$('.page').forEach(p=>p.hidden=p.id!==`${page}Page`);
    if(page==='orari'||page==='schedule') $('#scheduleSubnav').hidden=false;
    $$('.side-link').forEach(b => b.classList.toggle('is-active',b.dataset.page === (page==='schedule'?'orari':page)));
    closeMenu();
    $('#searchSuggestions').hidden=true;
    if(page==='results') renderResults();
    if(page==='schedule') renderSchedule();
    $('#mainContent').focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'auto'});
  }

  const allEntries = ['rooms','classes','teachers'].flatMap(kind=>Object.keys(DATA[kind]).sort(kind==='rooms'?sortRooms:(a,b)=>a.localeCompare(b,'it',{numeric:true})).map(id=>({kind,id})));
  function searchTerms(entry){
    let terms=[entry.id];
    if(entry.kind==='teachers'){
      const full=TEACHER_NAMES[entry.id];
      if(full){terms.push(full); const parts=full.split(' '); terms.push(parts.at(-1)+' '+parts.slice(0,-1).join(' '));}
      terms.push(entry.id.replace(/ \(.*?\)$/,''));
    }
    return [...terms.map(norm),...terms.map(canon)];
  }
  function matchQuery(raw){
    const q=norm(raw).replace(/^(AULA|CLASSE|PROFESSORE|PROFESSORESSA|PROF\.)\s*/,'').trim();
    if(!q)return [];
    const qc=canon(q);
    const exact=allEntries.filter(e=>searchTerms(e).some(t=>t===q||t===qc));
    if(exact.length)return exact;
    const prefix=allEntries.filter(e=>searchTerms(e).some(t=>t.startsWith(q)||t.startsWith(qc)));
    if(prefix.length)return prefix;
    if(q.length>=3)return allEntries.filter(e=>searchTerms(e).some(t=>t.includes(q)||t.includes(qc)));
    return [];
  }
  function previewSuggestions(){
    const matches = matchQuery(searchInput.value);
    const box = $('#searchSuggestions');
    if(!searchInput.value.trim() || !matches.length) {box.hidden=true;box.innerHTML='';return;}
    box.innerHTML=matches.map((e,i)=>
      `<button type="button" data-suggest="${i}"><span class="icon-inline">${entityIcons[e.kind]}</span>${escapeHtml(label(e.kind,e.id))}</button>`).join('');
    box.hidden=false;
    box.scrollTop=0;
    fitSuggestions(box);
  }
  // Mostra subito i primi 4 risultati; gli altri si raggiungono scorrendo con la barra laterale.
  function fitSuggestions(box){
    box.style.maxHeight='';
    const rows=box.children;
    if(rows.length<=4) return;
    const last=rows[3];
    box.style.maxHeight=(last.offsetTop+last.offsetHeight+box.offsetHeight-box.clientHeight)+'px';
  }
  function openResult(kind,id,remember=true){
    const item=DATA[kind]?.[id];
    if(!item) return;
    state.result={kind,id};
    if(remember) addHistory(kind,id);
    go('results');
  }
  function submitSearch(){
    const matches=matchQuery(searchInput.value);
    $('#searchSuggestions').hidden=true;
    if(matches.length===1){openResult(matches[0].kind,matches[0].id);return;}
    state.result={matches,query:searchInput.value.trim()};
    go('results');
  }
  function roomName(room){return room==='Palestra'?'Palestra':room ? `Aula ${room}` : 'Aula non indicata';}
  function cardsFor(item,kind){
    const day=date();
    const selected=hour()-1;
    const v=lesson(item);
    let heading='',line='',extra='',badge='',headline='';
    if(kind==='rooms'){
      headline=item.id==='Palestra'?'Palestra':`Aula ${item.id}`;
      badge=v?'Occupata':'Libera';
      heading=v?(v.lessons?`${v.subject} · ${v.lessons.length} classi`: `${v.class} · ${v.subject}`):'Aula libera';
      line=v?(v.lessons?v.lessons.map(e=>`${e.class}: ${prof(e.teacher,e.subject)}`).join(' · '):prof(v.teacher,v.subject)):'Nessuna lezione prevista';
      extra=`${day} · ${hour()}ª ora`;
    } else if(kind==='classes'){
      headline=`Classe ${item.id}`;
      badge=v?'Lezione':'Nessuna lezione';
      heading=v?v.subject:'Nessuna lezione prevista';
      line=v?`${prof(v.teacher,v.subject)} · ${roomName(v.room)}`:'Nessuna aula assegnata';
      extra=`${day} · ${hour()}ª ora`;
    } else {
      headline=`${prof(item.id)}`;
      badge=v?'Lezione':'Ora libera';
      heading=v?`${v.subject} · ${v.class}`:'Nessuna lezione prevista';
      line=v?roomName(v.room):'Nessuna aula assegnata';
      extra=`${day} · ${hour()}ª ora`;
    }
    const typeClass=kind==='rooms'?'room':kind==='classes'?'class':'teacher';
    const icon=entityIcons[kind];
    // Aula da mostrare in piantina: l'aula cercata, oppure quella in cui si trovano classe/prof nell'ora selezionata.
    const planRoom=kind==='rooms'?item.id:(v?.room||'');
    const planButton=`<button type="button" class="plan-link-button" ${planRoom?`data-plan-room="${escapeHtml(planRoom)}"`:'disabled title="Nessuna aula in questo orario"'}>${planIcon}Vedi piantina</button>`;
    return `<article class="result-card type-${typeClass}">
      <div class="result-banner"><span class="banner-icon" aria-hidden="true">${icon}</span><h2>${escapeHtml(headline)}</h2></div>
      <div class="result-body">
        <div class="result-header">${planButton}<span class="status-pill ${v?'':'free'}">${escapeHtml(badge)}</span></div>
        <section class="current-lesson"><p class="eyebrow">${escapeHtml(extra)}</p><h3>${escapeHtml(heading)}</h3><p>${escapeHtml(line)}</p></section>
        <div class="daily-heading"><h3><span class="icon-inline">${clockIcon}</span>Orario</h3><span>${escapeHtml(day)}</span></div>
        <div class="hours-list">${item.days[day].map((slot,i)=>hourRow(kind,slot,i,selected)).join('')}</div>
        <button class="complete-schedule-button" type="button" data-full-schedule="${escapeHtml(kind)}" data-entity="${escapeHtml(item.id)}">Apri l’orario completo →</button>
      </div>
    </article>`;
  }
  function hourRow(kind,v,i,selected){
    let title='Nessuna lezione prevista',small='',location='';
    if(!v && kind==='rooms')title='Aula libera';
    if(!v && kind==='teachers')title='Ora libera';
    if(v){
      if(kind==='rooms'){
        title=v.lessons?`${v.subject} · ${v.lessons.map(e=>e.class).join(', ')}`:`${v.class} · ${v.subject}`;
        small=v.lessons?v.lessons.map(e=>`${e.class}: ${prof(e.teacher,e.subject)}`).join(' · '):prof(v.teacher,v.subject);
        location='';
      }
      if(kind==='classes'){title=v.subject;small=`${prof(v.teacher,v.subject)}`;location=roomName(v.room);}
      if(kind==='teachers'){title=`${v.subject} · ${v.class}`;location=roomName(v.room);}
    }
    return `<div class="hour-row ${i===selected?'is-selected':''}">
      <span class="hour-number">${i+1}</span>
      <div class="hour-data"><strong>${escapeHtml(title)}</strong>${small?`<small>${escapeHtml(small)}</small>`:''}</div>
      ${location?`<span class="hour-location">${escapeHtml(location)}</span>`:''}
    </div>`;
  }
  function renderResults(){
    const area=$('#searchResults'); const r=state.result;
    if(!r) {area.innerHTML='';return;}
    if(r.matches){
      $('#resultsTitle').textContent=`Risultati per “${r.query || 'ricerca'}”`;
      if(!r.matches.length){
        area.innerHTML=`<div class="no-results"><h2>Nessun risultato trovato</h2><p>Controlla il codice della classe, dell’aula o il docente. Sono ricercabili le sigle dei professori.</p></div>`;
      }else{
        area.innerHTML=`<div class="result-choices">${r.matches.map((e,i)=>`<button type="button" class="choice-button" data-choice="${i}"><span class="icon-inline">${entityIcons[e.kind]}</span>${escapeHtml(label(e.kind,e.id))} →</button>`).join('')}</div>`;
      }
    }else{
      const item=DATA[r.kind]?.[r.id];
      $('#resultsTitle').textContent=label(r.kind,r.id);
      area.innerHTML=item?cardsFor(item,r.kind):'<p>Nessun dato disponibile.</p>';
    }
  }
  function openSchedule(kind, requestedId=''){
    // Tornando indietro da un orario aperto nella ricerca si torna al risultato.
    state.scheduleReturn = requestedId && state.page === 'results' ? 'results' : 'orari';
    $('#scheduleBackButton').dataset.page = state.scheduleReturn;
    $('#scheduleBackButton').textContent = state.scheduleReturn === 'results' ? '← Risultato' : '← Orari';
    state.schedule=kind;
    if(requestedId) state.selection=requestedId;
    $('#scheduleTitle').textContent=names[kind];
    $('#scheduleSubnav').hidden=false;
    $$('#scheduleSubnav button').forEach(b=>b.classList.toggle('is-active',b.dataset.schedule===kind));
    const select=$('#scheduleEntity');
    if(kind!=='freeRooms'){
      const entries=Object.keys(DATA[kind]).sort(kind==='rooms'?sortRooms:(a,b)=>a.localeCompare(b,'it',{numeric:true}));
      select.innerHTML=entries.map(id=>`<option value="${escapeHtml(id)}">${escapeHtml(label(kind,id))}</option>`).join('');
      if(!entries.includes(state.selection))state.selection=entries[0];
      select.value=state.selection;
      $('#scheduleControls label').hidden=false;
    }else{
      $('#scheduleControls label').hidden=true;
      state.selection='';
    }
    go('schedule');
  }
  function weeklyCell(kind, slot, day, index){
    const active=day===date() && index===hour()-1;
    let subject='—', detail='', location='';
    if(slot){
      subject=slot.subject;
      if(kind==='rooms')detail=slot.lessons?slot.lessons.map(e=>`${e.class} · ${prof(e.teacher,e.subject)}`).join(' | '):`${slot.class} · ${prof(slot.teacher,slot.subject)}`;
      if(kind==='classes'){ detail=prof(slot.teacher,slot.subject);location=slot.room||''; }
      if(kind==='teachers'){ detail=`Classe ${slot.class}`;location=slot.room||''; }
    }
    return `<div class="weekly-cell ${active?'is-current':''} ${slot?'':'is-empty'}">
      <strong>${escapeHtml(subject)}</strong>
      ${detail?`<small>${escapeHtml(detail)}</small>`:''}
      ${location?`<small class="weekly-location">${escapeHtml(location)}</small>`:''}
    </div>`;
  }
  function renderFullWeek(item,kind){
    const weekdays=DATA.days;
    const columns=weekdays.map(day=>`<div class="weekly-day">${escapeHtml(day)}</div>`).join('');
    const rows=Array.from({length:6},(_,i)=>
      `<div class="weekly-number">${i+1}</div>`+
      weekdays.map(day=>weeklyCell(kind,item.days[day][i],day,i)).join('')
    ).join('');
    const tag=kind==='rooms'?'room':kind==='classes'?'class':'teacher';
    return `<article class="result-card type-${tag} full-schedule">
      <div class="result-banner"><span class="banner-icon" aria-hidden="true">${entityIcons[kind]}</span><h2>${escapeHtml(label(kind,item.id))}</h2></div>
      <div class="result-body">
        <h3 class="weekly-title">Orario completo · dal lunedì al venerdì</h3>
        <div class="weekly-scroll" role="region" aria-label="Orario settimanale di ${escapeHtml(label(kind,item.id))}" tabindex="0">
          <div class="weekly-grid"><div class="weekly-corner">Ora</div>${columns}${rows}</div>
        </div>
      </div>
    </article>`;
  }

  function renderSchedule(){
    const kind=state.schedule, box=$('#scheduleContents');
    if(kind==='freeRooms'){
      const all=DATA.freeRooms[date()]||[];
      const days=DATA.days;
      const columns=days.map(d=>`<div class="weekly-day">${escapeHtml(d)}</div>`).join('');
      const rows=Array.from({length:6},(_,i)=>`<div class="weekly-number">${i+1}</div>`+
        days.map(day=>{
          const available=DATA.freeRooms[day]?.[i]||[];
          const active=day===date()&&i===hour()-1;
          return `<div class="weekly-cell free-weekly-cell ${active?'is-current':''}"><strong>${available.length} aule libere</strong>
            <span class="room-names">${[...available].sort(sortRooms).map(x=>escapeHtml(x)).join(' · ')||'Nessuna aula'}</span></div>`;
        }).join('')).join('');
      box.innerHTML=`<article class="result-card type-free full-schedule">
        <div class="result-banner"><span class="banner-icon" aria-hidden="true">${scheduleIcons.freeRooms}</span><h2>Aule libere</h2></div>
        <div class="result-body">
          <section class="current-lesson"><p class="eyebrow">${hour()}ª ora · ${escapeHtml(date())}</p><h3>${all[hour()-1]?.length||0} aule libere</h3>
          <div class="free-room-list">${[...(all[hour()-1]||[])].sort(sortRooms).map(name=>`<button class="room-chip" type="button" data-room="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')||'<p>Nessuna aula disponibile.</p>'}</div></section>
          <h3 class="weekly-title">Orario completo · dal lunedì al venerdì</h3>
          <div class="weekly-scroll" role="region" aria-label="Disponibilità aule della settimana" tabindex="0"><div class="weekly-grid"><div class="weekly-corner">Ora</div>${columns}${rows}</div></div>
        </div></article>`;
      return;
    }
    const item=DATA[kind]?.[state.selection];
    box.innerHTML=item?renderFullWeek(item,kind):'<p>Seleziona una voce.</p>';
  }
  function updateTimeDependent(){
    if(state.page==='results') renderResults();
    if(state.page==='schedule') renderSchedule();
  }

  $('#searchForm').addEventListener('submit', e=>{e.preventDefault();submitSearch();});
  searchInput.addEventListener('input',previewSuggestions);
  daySelect.addEventListener('change',updateTimeDependent);
  hourSelect.addEventListener('change',updateTimeDependent);
  $('#scheduleEntity').addEventListener('change',e=>{state.selection=e.target.value;renderSchedule();});
  $('#menuButton').addEventListener('click',()=>$('#sidebar').classList.contains('is-open')?closeMenu():openMenu());
  $('#sidebarBackdrop').addEventListener('click',()=>{closeMenu();$('#menuButton').focus();});
  window.addEventListener('resize',()=>{if(window.innerWidth>680 && document.body.classList.contains('mobile-menu-open'))closeMenu();});
  window.addEventListener('resize',()=>{const box=$('#searchSuggestions');if(!box.hidden)fitSuggestions(box);});
  $('#logoButton').addEventListener('click',()=>$('#logoDialog').showModal());
  $('#closeLogo').addEventListener('click',()=>$('#logoDialog').close());
  $('#logoDialog').addEventListener('click',e=>{if(e.target===$('#logoDialog'))e.target.close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  document.addEventListener('click',e=>{
    if (!e.target.closest('#searchForm, #searchSuggestions')) $('#searchSuggestions').hidden=true;
    const btn=e.target.closest('button'); if(!btn)return;
    if(btn.id === 'clearHistoryButton') { clearHistory(); return; }
    if(btn.hasAttribute('data-plan-room')){
      state.planFromResult=true; go('piantina');
      requestAnimationFrame(()=>window.AFPiantina?.show(btn.dataset.planRoom));
      return;
    }
    if(btn.hasAttribute('data-full-schedule')){
      openSchedule(btn.dataset.fullSchedule,btn.dataset.entity);
      return;
    }
    if(btn.hasAttribute('data-page')){
      go(btn.dataset.page);return;
    }
    if(btn.hasAttribute('data-schedule')){
      openSchedule(btn.dataset.schedule);return;
    }
    if(btn.hasAttribute('data-history')){
      const item=state.history[Number(btn.dataset.history)];if(item)openResult(item.kind,item.id);return;
    }
    if(btn.hasAttribute('data-suggest')){
      const item=matchQuery(searchInput.value)[Number(btn.dataset.suggest)];
      if(item){searchInput.value=item.id;openResult(item.kind,item.id);}return;
    }
    if(btn.hasAttribute('data-choice')){
      const item=state.result?.matches?.[Number(btn.dataset.choice)];
      if(item)openResult(item.kind,item.id);return;
    }
    if(btn.hasAttribute('data-room')){
      const id=btn.dataset.room;
      if(DATA.rooms[id])openResult('rooms',id);
      else {
        state.result={matches:[],query:id};go('results');
        $('#searchResults').innerHTML=`<div class="no-results"><h2>${escapeHtml(id)}</h2><p>L'aula compare nell'elenco delle aule libere, ma non ha una scheda nell'orario aule fornito.</p></div>`;
      }
    }
  });
  renderHistory();
  go('home');
})();
