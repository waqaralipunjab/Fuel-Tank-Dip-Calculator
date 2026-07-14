function interp(data,v){for(let i=0;i<data.length-1;i++){let a=data[i],b=data[i+1];if(v==a[0])return a[1];if(v>=a[0]&&v<=b[0])return a[1]+(v-a[0])*(b[1]-a[1])/(b[0]-a[0]);}return null;}

function calc(id,data,res){
  const v=parseFloat(document.getElementById(id).value);
  const r=document.getElementById(res);
  const gaugeId='g'+id.slice(1);
  const pctId='p'+id.slice(1);
  const gauge=document.getElementById(gaugeId);
  const pctEl=document.getElementById(pctId);
  const maxLitres=data[data.length-1][1];

  r.classList.remove('is-error');

  if(isNaN(v)){
    r.innerText='0.00 L';
    if(gauge) gauge.style.height='0%';
    if(pctEl) pctEl.innerText='0% full';
    return;
  }

  const x=interp(data,v);

  if(x==null){
    r.innerText='Out of range';
    r.classList.add('is-error');
    if(gauge) gauge.style.height='0%';
    if(pctEl) pctEl.innerText='check reading';
    return;
  }

  r.innerText=x.toFixed(1)+' L';
  const pct=Math.max(0,Math.min(100,(x/maxLitres)*100));
  if(gauge) gauge.style.height=pct.toFixed(1)+'%';
  if(pctEl) pctEl.innerText=pct.toFixed(0)+'% full';
}

/* ---------- Clear a single tank's input ---------- */
function clearInput(inputId,data,res){
  const input=document.getElementById(inputId);
  input.value='';
  input.focus();
  calc(inputId,data,res);
}

/* ---------- Live clock ---------- */
function tickClock(){
  const el=document.getElementById('clock');
  if(!el) return;
  const now=new Date();
  const dayStr=now.toLocaleDateString(undefined,{weekday:'short'});
  const dateStr=now.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});
  const timeStr=now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  el.innerText=dayStr+', '+dateStr+'  •  '+timeStr;
}
setInterval(tickClock,1000);
tickClock();

/* ---------- Reading history (persisted in localStorage) ---------- */
const HISTORY_KEY='fuelDipHistory';
const HISTORY_LIMIT=200;

function loadHistory(){
  try{
    return JSON.parse(localStorage.getItem(HISTORY_KEY))||[];
  }catch(e){
    return [];
  }
}

function persistHistory(list){
  try{
    localStorage.setItem(HISTORY_KEY,JSON.stringify(list));
  }catch(e){ /* storage unavailable, ignore */ }
}

function saveReading(inputId,tankLabel){
  const input=document.getElementById(inputId);
  const resultEl=document.getElementById('r'+inputId.slice(1));
  const dip=input.value;
  const volumeText=resultEl.innerText;

  if(dip===''||isNaN(parseFloat(dip))){
    resultEl.classList.add('is-error');
    return;
  }
  if(volumeText.toLowerCase().includes('out of range')) return;

  const now=new Date();
  const entry={
    tank:tankLabel,
    dip:parseFloat(dip),
    volume:volumeText,
    day:now.toLocaleDateString(undefined,{weekday:'short'}),
    time:now.toLocaleString(undefined,{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
  };

  const list=loadHistory();
  list.unshift(entry);
  if(list.length>HISTORY_LIMIT) list.length=HISTORY_LIMIT;
  persistHistory(list);
  renderHistory();
}

function clearHistory(){
  persistHistory([]);
  renderHistory();
}

function renderHistory(){
  const container=document.getElementById('historyList');
  if(!container) return;
  const list=loadHistory();

  if(list.length===0){
    container.innerHTML='<div class="history-empty">No readings saved yet.</div>';
    return;
  }

  container.innerHTML=list.map(e=>
    '<div class="history-row">'+
      '<span class="history-tank">'+e.tank+'</span>'+
      '<span class="history-dip">'+e.dip+' mm</span>'+
      '<span class="history-vol">'+e.volume+'</span>'+
      '<span class="history-time">'+(e.day?e.day+', ':'')+e.time+'</span>'+
    '</div>'
  ).join('');
}

renderHistory();

/* ---------- Export CSV ---------- */
function csvEscape(val){
  const s=String(val==null?'':val);
  if(/[",\n]/.test(s)) return '"'+s.replace(/"/g,'""')+'"';
  return s;
}

function exportHistoryCSV(){
  const list=loadHistory();
  if(list.length===0){
    alert('No readings saved yet — nothing to export.');
    return;
  }

  const rows=[['Tank','Dip (mm)','Volume','Day','Date & Time']];
  list.forEach(e=>{
    rows.push([e.tank,e.dip,e.volume,e.day||'',e.time]);
  });

  const csvContent=rows.map(r=>r.map(csvEscape).join(',')).join('\r\n');
  const blob=new Blob(['\ufeff'+csvContent],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const stamp=new Date().toISOString().slice(0,10);
  a.href=url;
  a.download='fuel-dip-history-'+stamp+'.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- WhatsApp share ---------- */
function shareHistoryWhatsApp(){
  const list=loadHistory();
  if(list.length===0){
    alert('No readings saved yet — nothing to share.');
    return;
  }

  const recent=list.slice(0,20);
  let msg='*Al Mukhtar Petroleum — Fuel Dip Readings*\n\n';
  recent.forEach(e=>{
    const dayPart=e.day?e.day+', ':'';
    msg+='• '+e.tank+' — '+e.dip+'mm → '+e.volume+' ('+dayPart+e.time+')\n';
  });
  msg+='\nSent from Fuel Dip Calculator app.';

  const url='https://api.whatsapp.com/send?text='+encodeURIComponent(msg);
  window.open(url,'_blank','noopener');
}

/* ---------- Theme toggle ---------- */
const THEME_KEY='fuelDipTheme';

function applyTheme(theme){
  document.body.classList.toggle('light-theme',theme==='light');
  const icon=document.getElementById('themeIcon');
  if(icon) icon.innerText=theme==='light'?'☀️':'🌙';
}

function toggleTheme(){
  const isLight=document.body.classList.contains('light-theme');
  const next=isLight?'dark':'light';
  applyTheme(next);
  try{ localStorage.setItem(THEME_KEY,next); }catch(e){}
}

(function initTheme(){
  let saved='dark';
  try{ saved=localStorage.getItem(THEME_KEY)||'dark'; }catch(e){}
  applyTheme(saved);
})();

/* ---------- PIN Lock ---------- */
const PIN_ENABLED_KEY='fuelDipPinEnabled';
const PIN_VALUE_KEY='fuelDipPinValue';

function getPinEnabled(){
  try{ return localStorage.getItem(PIN_ENABLED_KEY)==='1'; }catch(e){ return false; }
}
function getPinValue(){
  try{ return localStorage.getItem(PIN_VALUE_KEY)||''; }catch(e){ return ''; }
}

function checkLockOnLoad(){
  const enabled=getPinEnabled();
  const pin=getPinValue();
  const lockScreen=document.getElementById('lockScreen');
  const appContent=document.getElementById('appContent');
  if(enabled && pin){
    lockScreen.style.display='flex';
    appContent.style.display='none';
    setTimeout(()=>{ const inp=document.getElementById('lockInput'); if(inp) inp.focus(); },100);
  }else{
    lockScreen.style.display='none';
    appContent.style.display='block';
  }
}

function attemptUnlock(){
  const input=document.getElementById('lockInput');
  const err=document.getElementById('lockError');
  const entered=input.value;
  const correct=getPinValue();
  if(entered===correct && entered!==''){
    document.getElementById('lockScreen').style.display='none';
    document.getElementById('appContent').style.display='block';
    err.innerText='';
    input.value='';
  }else{
    err.innerText='Incorrect PIN. Try again.';
    input.value='';
    input.focus();
  }
}

// allow Enter key to submit PIN
(function(){
  const lockInput=document.getElementById('lockInput');
  if(lockInput){
    lockInput.addEventListener('keydown',function(e){
      if(e.key==='Enter') attemptUnlock();
    });
  }
})();

/* ---------- Settings modal ---------- */
function openSettings(){
  const modal=document.getElementById('settingsModal');
  const toggle=document.getElementById('pinEnabledToggle');
  toggle.checked=getPinEnabled();
  updatePinSetupVisibility();
  document.getElementById('pinSetupMsg').innerText='';
  document.getElementById('newPin').value='';
  document.getElementById('confirmPin').value='';
  modal.style.display='flex';
}

function closeSettings(){
  document.getElementById('settingsModal').style.display='none';
}

function closeSettingsOnBg(e){
  if(e.target.id==='settingsModal') closeSettings();
}

function updatePinSetupVisibility(){
  const enabled=document.getElementById('pinEnabledToggle').checked;
  document.getElementById('pinSetupBlock').setAttribute('data-hidden', enabled ? 'false' : 'true');
}

function togglePinEnabled(){
  const enabled=document.getElementById('pinEnabledToggle').checked;
  const existingPin=getPinValue();

  if(enabled && !existingPin){
    // no pin set yet — force setup, don't enable until a PIN is saved
    updatePinSetupVisibility();
    document.getElementById('pinSetupMsg').innerText='Please set a PIN below to enable lock.';
    document.getElementById('pinSetupMsg').className='pin-setup-msg';
    return;
  }

  try{ localStorage.setItem(PIN_ENABLED_KEY, enabled ? '1' : '0'); }catch(e){}
  updatePinSetupVisibility();
}

function savePin(){
  const newPin=document.getElementById('newPin').value;
  const confirmPin=document.getElementById('confirmPin').value;
  const msg=document.getElementById('pinSetupMsg');

  if(newPin===''){
    msg.innerText='PIN cannot be empty.';
    msg.className='pin-setup-msg err';
    return;
  }
  if(newPin!==confirmPin){
    msg.innerText='PINs do not match.';
    msg.className='pin-setup-msg err';
    return;
  }

  try{
    localStorage.setItem(PIN_VALUE_KEY, newPin);
    localStorage.setItem(PIN_ENABLED_KEY, '1');
  }catch(e){}

  document.getElementById('pinEnabledToggle').checked=true;
  msg.innerText='PIN saved. Lock is now enabled.';
  msg.className='pin-setup-msg ok';
  document.getElementById('newPin').value='';
  document.getElementById('confirmPin').value='';
}

checkLockOnLoad();
