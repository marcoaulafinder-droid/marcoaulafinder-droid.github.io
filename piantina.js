/* AulaFinder V13 · focus sull'aula cercata */
(function(){
var cur=null;
var tooltip=document.getElementById('room-tooltip');
var hovered=null;
var alwaysVisible={"Archivio":true,"Caldaie":true,"Palestra":true};
function hideTip(){
  hovered=null;
  if(tooltip){tooltip.classList.remove('visible');tooltip.setAttribute('aria-hidden','true');}
}
function labelFor(g){
  var t=(g && g.dataset && g.dataset.t ? g.dataset.t : '').trim();
  if(!t || alwaysVisible[t]) return '';
  var m=t.match(/^(?:\d+\.\d+|[STP]\.\d+)\s*[·]\s*(.+)$/i);
  if(m) return m[1].trim().replace(/^\.\.\.$/,'');
  if(/^(?:\d+\.\d+|[STP]\.\d+)$/i.test(t)) return '';
  return t;
}
function positionTip(e){
  if(!tooltip || !hovered) return;
  var left=e.clientX+14, top=e.clientY+14;
  tooltip.style.left='0px'; tooltip.style.top='0px';
  var r=tooltip.getBoundingClientRect();
  left=Math.min(left, Math.max(8, window.innerWidth-r.width-8));
  top=Math.min(top, Math.max(8, window.innerHeight-r.height-8));
  tooltip.style.left=left+'px'; tooltip.style.top=top+'px';
}
function showTip(g,e){
  var label=labelFor(g);
  if(!label){hideTip();return;}
  hovered=g; tooltip.textContent=label;
  tooltip.classList.add('visible'); tooltip.setAttribute('aria-hidden','false');
  positionTip(e);
}
function clear(){
  document.querySelectorAll('.sel-clone').forEach(function(n){n.remove()});
  document.querySelectorAll('.sel-chip').forEach(function(c){c.textContent=''});
  cur=null;
}
function pick(g){
  hideTip();
  if(cur===g){clear();return;}
  clear();cur=g;mark(g);
}
function mark(g){
  var cx=+g.dataset.cx,cy=+g.dataset.cy,s=+g.dataset.s,c=g.cloneNode(true);
  function T(k){return 'translate('+cx+'px,'+cy+'px) scale('+k+') translate('+(-cx)+'px,'+(-cy)+'px)'}
  c.classList.remove('room');c.classList.add('sel-clone');c.removeAttribute('tabindex');c.style.transform=T(1);
  g.closest('svg').querySelector('.top').appendChild(c);c.getBoundingClientRect();c.style.transform=T(s);
  var t=(g.dataset.t||'').split('·')[0].trim();
  var code=/^(?:\d+\.\d+|[STP]\.\d+)$/i.test(t) ? t : '';
  g.closest('.plan-card').querySelector('.sel-chip').textContent=code;
}
// Porta la vista direttamente sull'aula: la centra nella pagina e, sugli schermi stretti, scorre anche la piantina in orizzontale.
function focusRoom(g){
  var behavior=(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth';
  var r=g.getBoundingClientRect();
  var body=g.closest('.plan-body');
  if(body && body.scrollWidth>body.clientWidth){
    var b=body.getBoundingClientRect();
    body.scrollTo({left:body.scrollLeft+(r.left+r.width/2)-(b.left+b.width/2),behavior:behavior});
  }
  window.scrollTo({top:Math.max(0,window.scrollY+r.top+r.height/2-window.innerHeight/2),behavior:behavior});
}
window.AFPiantina={show:function(room){
  // 'Informatica 1.07' -> '1.07'; la Palestra e' disegnata su due piani e viene evidenziata in entrambi.
  var code=String(room).replace(/^Informatica\s+/i,'').trim().toLowerCase();
  var gs=[].filter.call(document.querySelectorAll('#piantinaPage g.room'),function(g){return (g.dataset.t||'').split('·')[0].trim().toLowerCase()===code;});
  if(!gs.length) return false;
  var floors={};gs.forEach(function(g){floors[g.closest('.plan-card').id]=1;});
  var boxes=[].slice.call(document.querySelectorAll('.floor-option input[type="checkbox"]'));
  boxes.forEach(function(c){c.checked=!!floors[c.value];});
  boxes[0].dispatchEvent(new Event('change',{bubbles:true}));
  hideTip();clear();gs.forEach(mark);cur=gs[0];
  focusRoom(gs[0]);
  return true;
}};
document.addEventListener('mouseover',function(e){
  var g=e.target && e.target.closest ? e.target.closest('g.room') : null;
  if(!g || (e.relatedTarget && g.contains(e.relatedTarget))) return;
  showTip(g,e);
});
document.addEventListener('mousemove',function(e){
  if(hovered && hovered.contains(e.target)) positionTip(e);
});
document.addEventListener('mouseout',function(e){
  if(hovered && !hovered.contains(e.relatedTarget)) hideTip();
});
document.addEventListener('click',function(e){
  var g=e.target.closest ? e.target.closest('.room') : null;
  if(g){pick(g)}
  else if(e.target.closest && e.target.closest('.sel-clone')){hideTip();clear()}
  else if(e.target.closest && e.target.closest('svg.plan')){hideTip();clear()}
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){hideTip();clear();return;}
  if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('room')){e.preventDefault();pick(e.target)}
});
})();
(function(){
  var checks=Array.prototype.slice.call(document.querySelectorAll('.floor-option input[type="checkbox"]'));
  var cards=Array.prototype.slice.call(document.querySelectorAll('.plan-card'));
  var status=document.getElementById('filter-status');
  var allSwitch=document.getElementById('all-plans-switch');
  function setAll(value){checks.forEach(function(c){c.checked=value;});allSwitch.checked=value;update();}
  function update(){
    var selected=checks.filter(function(c){return c.checked;}).map(function(c){return c.value;});
    cards.forEach(function(card){card.hidden=selected.indexOf(card.id)===-1;});
    allSwitch.checked=selected.length===checks.length;
    status.textContent=selected.length===0?'Nessun piano selezionato.':'Visualizzati '+selected.length+' '+(selected.length===1?'piano':'piani')+' su '+checks.length+'.';
  }
  checks.forEach(function(c){c.addEventListener('change',update);});
  document.getElementById('show-all-plans').addEventListener('click',function(){setAll(true);});
  document.getElementById('hide-all-plans').addEventListener('click',function(){setAll(false);});
  allSwitch.addEventListener('change',function(){setAll(allSwitch.checked);});
  update();
})();
