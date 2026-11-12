let photoTarget='',lbId='',db=null,dls=null,items=[],moves=[],tab='stock',q='',mvType='',mvItem='',pending=null,ym=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=n=>Number(n||0).toLocaleString('en-US');
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
function toast(t){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',3200)}
const err=e=>toast(e&&e.code==='invalid_argument'?'No permission to edit data (only the owner or contributors can).':'Something went wrong, please try again.');

function calc(){
  const t={};
  items.forEach(i=>t[i.id]={in:0,out:0,bal:0});
  moves.forEach(m=>{const x=t[m.itemId];if(!x)return;if(m.type==='in')x.in+=Number(m.qty)||0;else x.out+=Number(m.qty)||0});
  items.forEach(i=>{const x=t[i.id];x.bal=(Number(i.opening)||0)+x.in-x.out});
  return t;
}
function monthly(){
  const start=ym+'-01';
  return items.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(i=>{
    let open=Number(i.opening)||0,inn=0,out=0;
    moves.forEach(m=>{
      if(m.itemId!==i.id)return;
      const qn=Number(m.qty)||0;
      if(m.date<start)open+=m.type==='in'?qn:-qn;
      else if(m.date.slice(0,7)===ym){if(m.type==='in')inn+=qn;else out+=qn}
    });
    return{i,open,inn,out,close:open+inn-out};
  });
}
const card=(l,v,c)=>`<div class="card ${c||''}"><small>${l}</small><b>${v}</b></div>`;

function render(){
  const t=calc(),ql=q.trim().toLowerCase();
  const low=items.filter(i=>i.min>0&&t[i.id].bal<=i.min).length;
  $('#st').innerHTML=card('Total items',f(items.length))+card('Low stock',f(low),low?'w':'')+card('Total transactions',f(moves.length));
  $('#tabs').innerHTML=[['stock','Stock Balance'],['log','In / Out Log'],['rep','Monthly Report']].map(x=>`<button data-tab="${x[0]}" class="${tab===x[0]?'on':''}">${x[1]}</button>`).join('');
  const byId={};items.forEach(i=>byId[i.id]=i);
  const match=i=>!ql||(i.name+' '+(i.code||'')).toLowerCase().includes(ql);
  let h='';
  if(tab==='stock'){
    const rows=items.filter(match).sort((a,b)=>a.name.localeCompare(b.name));
    if(!rows.length)h=`<div class="tw"><div class="empty">${items.length?'No items found':'No items yet — click “+ New Item”'}</div></div>`;
    else h=`<div class="tw"><table><tr><th>Item</th><th>Unit</th><th>Opening</th><th>In</th><th>Out</th><th>Current balance</th><th></th></tr>`+rows.map(i=>{
      const x=t[i.id],lw=i.min>0&&x.bal<=i.min;
      return `<tr><td><div class="it">${thumb(i)}<div><b>${esc(i.name)}</b>${lw?'<span class="tag">Low</span>':''}<div class="mu">${esc(i.code||'')}</div></div></div></td><td>${esc(i.unit)}</td><td>${f(i.opening)}</td><td class="gc">+${f(x.in)}</td><td class="rc">−${f(x.out)}</td><td><b class="bal ${lw?'low':''}">${f(x.bal)}</b></td><td class="ac"><button data-a="in" data-id="${i.id}">+ In</button><button data-a="out" data-id="${i.id}">− Out</button><button class="gh" data-a="pick" data-id="${i.id}" title="Add / change photo">📷</button><button class="gh" data-a="del" data-id="${i.id}" title="Delete">🗑</button></td></tr>`}).join('')+`</table></div>`;
  }else if(tab==='log'){
    const rows=moves.filter(m=>byId[m.itemId]&&match(byId[m.itemId])).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.ts||0)-(a.ts||0));
    if(!rows.length)h=`<div class="tw"><div class="empty">No transactions yet</div></div>`;
    else h=`<div class="tw"><table><tr><th>Date</th><th>Item</th><th>Type</th><th>Quantity</th><th>Note</th><th></th></tr>`+rows.map(m=>{
      const i=byId[m.itemId],inn=m.type==='in';
      return `<tr><td>${esc(m.date)}</td><td>${esc(i.name)}</td><td class="${inn?'gc':'rc'}">${inn?'IN':'OUT'}</td><td class="${inn?'gc':'rc'}"><b>${inn?'+':'−'}${f(m.qty)}</b> ${esc(i.unit)}</td><td>${esc(m.note||'')}</td><td><button class="gh" data-a="delm" data-id="${m.id}" title="Delete">🗑</button></td></tr>`}).join('')+`</table></div>`;
  }else{
    const rows=monthly().filter(r=>match(r.i));
    h=`<div id="bm" style="margin-bottom:12px"></div><div class="rp"><label>Month<input id="ym" type="month" value="${ym}" placeholder="YYYY-MM"></label>`
     +`<button class="pr" data-a="dlsum">⬇ Download monthly summary (CSV)</button><button data-a="dltx">⬇ Download transactions (CSV)</button>`+`</div>`;
    h+=!rows.length?`<div class="tw"><div class="empty">No items yet</div></div>`
     :`<div class="tw"><table><tr><th>Item</th><th>Unit</th><th>Opening (start of month)</th><th>Total In</th><th>Total Out</th><th>Closing balance</th></tr>`+rows.map(r=>`<tr><td><b>${esc(r.i.name)}</b><div class="mu">${esc(r.i.code||'')}</div></td><td>${esc(r.i.unit)}</td><td>${f(r.open)}</td><td class="gc">+${f(r.inn)}</td><td class="rc">−${f(r.out)}</td><td><b class="bal">${f(r.close)}</b></td></tr>`).join('')+`</table></div>`;
  }
  $('#list').innerHTML=h;
  if(tab==='rep')backupStatus();
}

const cell=c=>{if(c==null)return '';if(typeof c==='string'&&/^[=+\-@]/.test(c))c="'"+c;c=String(c);return /[",\r\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c};
const csv=rows=>'﻿'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
async function dl(name,rows){
  if(!dls)return noDl();
  try{await dls.save({filename:name,data:csv(rows)})}
  catch(e){if(!e||e.code!=='declined')toast('Download failed, please try again.')}
}
function dlSummary(){
  if(!/^\d{4}-\d{2}$/.test(ym))return toast('Pick a month first');
  const rows=[['Item','Code','Unit','Opening (start of month)','Total In','Total Out','Closing balance']];
  monthly().forEach(r=>rows.push([r.i.name,r.i.code||'',r.i.unit,r.open,r.inn,r.out,r.close]));
  dl('inventory-summary-'+ym+'.csv',rows);
}
function dlTx(){
  if(!/^\d{4}-\d{2}$/.test(ym))return toast('Pick a month first');
  const byId={};items.forEach(i=>byId[i.id]=i);
  const rows=[['Date','Item','Code','Type','Quantity','Unit','Note']];
  moves.filter(m=>byId[m.itemId]&&(m.date||'').slice(0,7)===ym).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.ts||0)-(b.ts||0))
    .forEach(m=>{const i=byId[m.itemId];rows.push([m.date,i.name,i.code||'',m.type==='in'?'IN':'OUT',m.qty,i.unit,m.note||''])});
  dl('inventory-transactions-'+ym+'.csv',rows);
}

const okImg=s=>typeof s==='string'&&/^data:image\/(jpeg|png);base64,[A-Za-z0-9+\/=]+$/.test(s);
const thumb=i=>okImg(i.thumb)?`<img class="th" data-a="view" data-id="${i.id}" src="${i.thumb}" alt="" title="View photo">`:`<div class="th e" data-a="pick" data-id="${i.id}" title="Add photo">📷</div>`;
function shrink(file,max,qual){return new Promise((res,rej)=>{
  const r=new FileReader();
  r.onerror=()=>rej(new Error('read'));
  r.onload=()=>{const im=new Image();
    im.onerror=()=>rej(new Error('img'));
    im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));
      const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
      res(c.toDataURL('image/jpeg',qual))};
    im.src=r.result};
  r.readAsDataURL(file)})}
async function setPhoto(id,file){
  try{
    toast('Saving photo…');
    const small=await shrink(file,128,.7),full=await shrink(file,1280,.82);
    await db.doc('photos/'+id).set({data:full});
    await db.doc('items/'+id).update({thumb:small});
    toast('Photo saved');
  }catch(e){err(e)}
}
async function viewPhoto(id){
  const i=items.find(x=>x.id===id);if(!i)return;
  lbId=id;$('#lbn').textContent=i.name;
  const im=$('#lbi');im.src=okImg(i.thumb)?i.thumb:'';
  $('#d4').showModal();
  try{const sn=await db.doc('photos/'+id).get();const d=sn.exists&&sn.data().data;if(okImg(d)&&lbId===id)im.src=d}catch(e){}
}
async function removePhoto(id){
  try{await db.doc('items/'+id).update({thumb:''});await db.doc('photos/'+id).delete()}catch(e){err(e)}
}
async function backup(){
  if(!dls)return noDl();
  const t=calc(),byId={};items.forEach(i=>byId[i.id]=i);
  const A=[['Item','Code','Unit','Opening stock','Total In','Total Out','Current balance','Minimum stock']];
  items.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(i=>{const x=t[i.id];A.push([i.name,i.code||'',i.unit,Number(i.opening)||0,x.in,x.out,x.bal,Number(i.min)||0])});
  const B=[['Date','Item','Code','Type','Quantity','Unit','Note']];
  moves.filter(m=>byId[m.itemId]).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.ts||0)-(b.ts||0)).forEach(m=>{const i=byId[m.itemId];B.push([m.date,i.name,i.code||'',m.type==='in'?'IN':'OUT',Number(m.qty)||0,i.unit,m.note||''])});
  const base='mrtex-store-backup-'+today()+'.';
  try{
    if(window.XLSX){
      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(A),'Stock Balance');
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(B),'All Transactions');
      const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
      await dls.save({filename:base+'xlsx',data:new Uint8Array(buf)});
      await markBackup();
    }else{
      await dls.save({filename:base+'csv',data:csv([['STOCK BALANCE'],...A,[],['ALL TRANSACTIONS'],...B])});
      await markBackup();
    }
  }catch(e){if(!e||e.code!=='declined')toast('Backup failed, please try again.')}
}
function ask(m,fn){pending=fn;$('#c0').textContent=m;$('#d3').showModal()}
function openMove(type,id){
  const i=items.find(x=>x.id===id);if(!i)return;
  mvType=type;mvItem=id;
  $('#m0').textContent=type==='in'?'Stock In (add)':'Stock Out (issue)';
  $('#m1').textContent=i.name+' — current balance: '+f(calc()[id].bal)+' '+i.unit;
  $('#m2').value='';$('#m3').value=today();$('#m4').value='';
  $('#d2').showModal();
}
async function saveItem(){
  const name=$('#n1').value.trim();
  if(!name)return toast('Enter the item name');
  try{
    const id='i'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),file=$('#n6').files[0];
    const thumb=file?await shrink(file,128,.7):'';
    await db.doc('items/'+id).set({thumb,name,code:$('#n2').value.trim(),unit:$('#n3').value.trim()||'pcs',opening:Math.max(0,+$('#n4').value||0),min:Math.max(0,+$('#n5').value||0),ts:Date.now()});
    if(file)await db.doc('photos/'+id).set({data:await shrink(file,1280,.82)});
    $('#d1').close();
  }catch(e){err(e)}
}
async function saveMove(){
  const qty=+$('#m2').value,x=calc()[mvItem];
  if(!(qty>0))return toast('Enter a valid quantity');
  if(mvType==='out'&&qty>x.bal)return toast('Only '+f(x.bal)+' in stock');
  try{
    await db.collection('moves').add({itemId:mvItem,type:mvType,qty,date:$('#m3').value||today(),note:$('#m4').value.trim(),ts:Date.now()});
    $('#d2').close();
  }catch(e){err(e)}
}
async function delItem(id){
  try{
    await Promise.all(moves.filter(m=>m.itemId===id).map(m=>db.doc('moves/'+m.id).delete()));
    await db.doc('items/'+id).delete();
    await db.doc('photos/'+id).delete().catch(()=>{});
  }catch(e){err(e)}
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a],[data-tab],[data-c]');if(!b)return;
  const d=b.dataset;
  if(d.c)return $('#'+d.c).close();
  if(d.tab){tab=d.tab;return render()}
  if(d.a==='dlsum')return dlSummary();
  if(d.a==='dltx')return dlTx();
  if(d.a==='backup')return backup();
  if(d.a==='jbk')return jsonBackup();
  if(d.a==='rst')return $('#rf').click();
  if(d.a==='pickp'){const i=items.find(x=>x.id===d.id);if(i){q=i.name;$('#q').value=q;tab='stock';render();$('#sg').style.display='none';$('#qx').style.display='block'}return}
  if(d.a==='clr'){q='';$('#q').value='';$('#sg').style.display='none';$('#qx').style.display='none';return render()}
  if(!db)return toast('Data storage is not available');
  if(d.a==='new'){['n1','n2'].forEach(k=>$('#'+k).value='');$('#n3').value='pcs';$('#n4').value=0;$('#n5').value=0;$('#n6').value='';return $('#d1').showModal()}
  if(d.a==='in'||d.a==='out')return openMove(d.a,d.id);
  if(d.a==='pick'){photoTarget=d.id;return $('#pf').click()}
  if(d.a==='view')return viewPhoto(d.id);
  if(d.a==='chph'){photoTarget=lbId;$('#d4').close();return $('#pf').click()}
  if(d.a==='rmph'){const id=lbId;$('#d4').close();return ask('Remove this photo?',()=>removePhoto(id))}
  if(d.a==='saveItem')return saveItem();
  if(d.a==='saveMove')return saveMove();
  if(d.a==='del')return ask('Delete this item and all its transactions?',()=>delItem(d.id));
  if(d.a==='delm')return ask('Delete this transaction?',()=>db.doc('moves/'+d.id).delete().catch(err));
  if(d.a==='ok'){const fn=pending;pending=null;$('#d3').close();if(fn)fn()}
});
document.addEventListener('change',e=>{if(e.target.id==='ym'){ym=e.target.value;render()}});
$('#pf').addEventListener('change',e=>{const fl=e.target.files[0];e.target.value='';if(fl&&photoTarget)setPhoto(photoTarget,fl)});
function suggest(){
  const v=q.trim().toLowerCase(),box=$('#sg');
  $('#qx').style.display=q?'block':'none';
  if(!v){box.style.display='none';return}
  const t=calc();
  const hits=items.map(i=>{const n=i.name.toLowerCase(),c=(i.code||'').toLowerCase();return{i,r:(n.startsWith(v)||c.startsWith(v))?0:(n+' '+c).includes(v)?1:2}}).filter(x=>x.r<2).sort((a,b)=>a.r-b.r||a.i.name.localeCompare(b.i.name)).slice(0,6);
  box.innerHTML=hits.length?hits.map(({i})=>{const b=t[i.id].bal,lw=i.min>0&&b<=i.min;return `<div class="sgi" data-a="pickp" data-id="${i.id}">${okImg(i.thumb)?`<img class="th" src="${i.thumb}" alt="">`:'<div class="th e">📦</div>'}<div><b>${esc(i.name)}</b><div class="mu">${esc(i.code||'')}</div></div><div class="sb"><b class="bal ${lw?'low':''}">${f(b)}</b> <span class="mu">${esc(i.unit)}</span></div></div>`}).join(''):'<div class="empty">No product found</div>';
  box.style.display='block';
}
$('#q').addEventListener('input',e=>{q=e.target.value;render();suggest()});
$('#q').addEventListener('focus',suggest);
$('#q').addEventListener('keydown',e=>{
  if(e.key==='Escape')$('#sg').style.display='none';
  if(e.key==='Enter'){const first=$('#sg .sgi');if(first)first.click()}
});
document.addEventListener('click',e=>{if(!e.target.closest('.sw'))$('#sg').style.display='none'});


/* ---- Offline storage: browser IndexedDB ---- */
const fileDl={async save({filename,data}){
  const ty=/\.csv$/.test(filename)?'text/csv;charset=utf-8':/\.json$/.test(filename)?'application/json':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const b=data instanceof Blob?data:new Blob([data],{type:ty});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);return{status:'saved'}}};
let IDB=null;const subs={};
const tx=m=>IDB.transaction('docs',m).objectStore('docs');
const mt=m=>IDB.transaction('meta',m).objectStore('meta');
const req=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function notify(col){
  if(!subs[col])return;
  const rows=await req(tx('readonly').index('col').getAll(col));
  const snap={docs:rows.map(r=>({id:r.id,exists:true,data:()=>r.data}))};
  subs[col].forEach(fn=>fn(snap));
}
function openDb(){return new Promise((res,rej)=>{
  const r=indexedDB.open('mrtex-store',2);
  r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('docs'))d.createObjectStore('docs',{keyPath:'path'}).createIndex('col','col');if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta')};
  r.onerror=()=>rej(r.error);
  r.onsuccess=()=>{
    IDB=r.result;
    try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
    const parse=p=>{const k=p.indexOf('/');return{col:p.slice(0,k),id:p.slice(k+1)}};
    res({
      doc:p=>{const{col,id}=parse(p);return{
        async set(d){await req(tx('readwrite').put({path:p,col,id,data:d}));notify(col)},
        async update(d){const o=await req(tx('readonly').get(p));await req(tx('readwrite').put({path:p,col,id,data:{...(o?o.data:{}),...d}}));notify(col)},
        async delete(){await req(tx('readwrite').delete(p));notify(col)},
        async get(){const o=await req(tx('readonly').get(p));return{exists:!!o,data:()=>o&&o.data}}
      }},
      collection:col=>({
        async add(d){const id='i'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);await req(tx('readwrite').put({path:col+'/'+id,col,id,data:d}));notify(col)},
        onSnapshot(next){(subs[col]=subs[col]||new Set()).add(next);notify(col)}
      })
    });
  }})}
async function jsonBackup(){
  if(!dls)return noDl();
  try{
    const all=await req(tx('readonly').getAll());
    const b=new Blob([JSON.stringify({app:'mrtex-store',v:1,docs:all})],{type:'application/json'});
    await dls.save({filename:'mrtex-restorable-backup-'+today()+'.json',data:b});
    await markBackup();
  }catch(e){toast('Backup failed, please try again.')}
}
async function doRestore(file){
  try{
    const j=JSON.parse(await file.text());
    const ok=j&&j.app==='mrtex-store'&&Array.isArray(j.docs)&&j.docs.every(d=>d&&typeof d.path==='string'&&typeof d.col==='string'&&typeof d.id==='string'&&d.data&&typeof d.data==='object');
    if(!ok)return toast('This is not a valid backup file');
    const t=IDB.transaction('docs','readwrite'),st=t.objectStore('docs');
    st.clear();j.docs.forEach(d=>st.put(d));
    await new Promise((res,rej)=>{t.oncomplete=res;t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)});
    ['items','moves','photos'].forEach(notify);
    toast('Backup restored');
  }catch(e){toast('Restore failed — no data was changed')}
}
const noDl=()=>toast('Downloads are not available in this browser.');
const mk=d=>d.getFullYear()+'-'+(d.getMonth()+1);
async function backupStatus(){
  let t=null;
  try{t=await req(mt('readonly').get('lastBackup'))}catch(e){}
  const el=$('#bm');if(!el)return;
  const due=!t||mk(new Date(t))!==mk(new Date());
  const when=t?new Date(t).toLocaleDateString():'never';
  el.className=due?'note':'mu';
  el.innerHTML=due?'⚠ Monthly backup due — last backup: <b>'+when+'</b> <button class="pr" data-a="jbk" style="margin-left:8px">⬇ Download monthly backup</button>':'✅ This month’s backup is done ('+when+') <button data-a="jbk" style="margin-left:8px">⬇ Download again</button>';
}
async function markBackup(){try{await req(mt('readwrite').put(Date.now(),'lastBackup'))}catch(e){}backupStatus()}
async function storageMeter(){
  const el=$('#sm');
  try{
    if(!navigator.storage||!navigator.storage.estimate)throw 0;
    const e=await navigator.storage.estimate();
    const fm=n=>n>=1073741824?(n/1073741824).toFixed(2)+' GB':(n/1048576).toFixed(1)+' MB';
    const pct=e.quota?Math.min(100,e.usage/e.quota*100):0;
    el.innerHTML='💾 Storage used: <b>'+fm(e.usage||0)+'</b> of about <b>'+fm(e.quota||0)+'</b> the browser allows (approximate)<div class="mtr"><i style="width:'+Math.max(pct,0.6).toFixed(1)+'%"></i></div>';
  }catch(x){el.textContent='Storage information is not available in this browser.'}
}
$('#rf').addEventListener('change',e=>{const fl=e.target.files[0];e.target.value='';if(fl)ask('Replace ALL current data with this backup file?',()=>doRestore(fl))});

(async function init(){
  render();
  dls=fileDl;$('#bk').style.display='';
  try{db=await openDb()}catch(e){db=null}
  if(!db){$('#msg').innerHTML='<div class="note">Browser storage is not available (private/incognito window?). Please open this page in a normal browser window.</div>';return}
  storageMeter();
  const snap=s=>s.docs.map(d=>({id:d.id,...d.data()}));
  db.collection('items').onSnapshot(s=>{items=snap(s);render();storageMeter()},err);
  db.collection('moves').onSnapshot(s=>{moves=snap(s);render()},err);
})();
