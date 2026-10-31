// ====== Paste your Firebase config here. If left as is, the app runs in demo mode (admin password: 1234) ======
const firebaseConfig = {
  apiKey: "AIzaSyCBfGnkhCPzFlRRebpirZ0yxEz1NlOpUUw",
  authDomain: "ff-like-tracker.firebaseapp.com",
  projectId: "ff-like-tracker",
  storageBucket: "ff-like-tracker.firebasestorage.app",
  messagingSenderId: "237717028653",
  appId: "1:237717028653:web:98e04b83121773b6539da4"
};
// The admin email you created in Firebase Authentication (only the password is typed on the login page)
const ADMIN_EMAIL = "ashikurrahmann56@gmail.com";

const $ = id => document.getElementById(id);
const useFB = firebaseConfig.apiKey !== "YOUR_API_KEY" && typeof firebase !== 'undefined';
let col, L=[], admin=false, Q='', unsub=null, ALL=[];

function lsLoad(){try{L=JSON.parse(localStorage.getItem('ffo')||'[]')}catch(e){L=[]}}
function lsSave(){try{localStorage.setItem('ffo',JSON.stringify(L))}catch(e){}render(L)}

function route(){
  $('login').hidden = !(location.hash==='#admin' && !admin);
  $('adminForm').hidden = !admin;
}
function doLogin(){
  const p=$('pw').value;
  if(useFB){
    firebase.auth().signInWithEmailAndPassword(ADMIN_EMAIL,p).then(()=>{$('pw').value=''})
      .catch(e=>alert(e.code==='auth/invalid-credential'||e.code==='auth/wrong-password'?'Wrong password (or admin email in the code does not match Firebase)':'Login error: '+e.code));
  }else{
    if(p==='1234'){admin=true;$('pw').value='';afterAuth()} else alert('Wrong password (demo password: 1234)');
  }
}
function doLogout(){ if(useFB) firebase.auth().signOut(); else {admin=false;afterAuth();} location.hash=''; route(); }
function afterAuth(){ route(); subscribe(); }

if(useFB){
  firebase.initializeApp(firebaseConfig);
  col=firebase.firestore().collection('orders');
  firebase.auth().onAuthStateChanged(u=>{admin=!!u;afterAuth()});
}else{
  $('msg').textContent='Demo mode: data is saved only in this browser. Admin password: 1234.';
  lsLoad();
}
window.addEventListener('hashchange',route);
route();subscribe();

function doSearch(){ Q=$('q').value.trim(); subscribe(); }

function subscribe(){
  if(unsub){unsub();unsub=null}
  if(!useFB){ render(L); return; }
  const err=e=>$('msg').textContent='Error: '+e.message;
  const ok=s=>render(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.createdAt-a.createdAt));
  if(admin) unsub=col.onSnapshot(ok,err);
  else if(Q) unsub=col.where('uid','==',Q).onSnapshot(ok,err);
  else render([]);
}

function addOrder(){
  const uid=$('uid').value.trim();
  if(!uid) return alert('Enter a UID');
  const days=parseInt($('days').value), target=parseInt($('target').value);
  if(!days||!target) return alert('Enter total days and total likes');
  const o={uid,days,target,entries:[],createdAt:Date.now()};
  if(useFB) col.add(o).catch(e=>alert(e.message)); else {o.id='o'+Date.now();L.unshift(o);lsSave();}
  $('uid').value='';$('days').value='';$('target').value='';
}
function addLike(id){
  const el=$('in'+id), v=parseInt(el.value);
  if(!v||v<=0) return alert('Enter the number of likes');
  const e={likes:v,date:new Date().toLocaleDateString('en-GB'),t:Date.now()};
  if(useFB) col.doc(id).update({entries:firebase.firestore.FieldValue.arrayUnion(e)}).catch(x=>alert(x.message));
  else {L.find(x=>x.id===id).entries.push(e);lsSave();}
}
function delEntry(id,t){
  const o=ALL.find(x=>x.id===id), n=o.entries.filter(e=>e.t!==t);
  if(useFB) col.doc(id).update({entries:n}); else {o.entries=n;lsSave();}
}
function delOrder(id){
  if(!confirm('Delete this order?')) return;
  if(useFB) col.doc(id).delete(); else {L=L.filter(x=>x.id!==id);lsSave();}
}

function render(all){
  ALL=all;
  let orders=all;
  if(!useFB) orders = admin ? all.filter(o=>o.uid.includes(Q)) : (Q ? all.filter(o=>o.uid===Q) : []);
  else if(admin && Q) orders=all.filter(o=>o.uid.includes(Q));
  if(!admin && !Q){ $('list').innerHTML='<div class="empty">Enter a UID and press Search.</div>'; return; }
  if(!orders.length){ $('list').innerHTML='<div class="empty">No order found for this UID.</div>'; return; }
  $('list').innerHTML=orders.map(o=>{
    const total=o.entries.reduce((a,e)=>a+e.likes,0);
    const dDone=o.entries.length, dLeft=Math.max(0,o.days-dDone);
    const pct=Math.min(100,Math.round(total/o.target*100));
    const fin=total>=o.target, over=dLeft===0&&!fin, left=Math.max(0,o.target-total);
    const col2=fin?'#16a34a':(over?'#dc2626':'#f59e0b');
    return `<div class="card">
      <div class="top2"><div><div class="uid">UID ${o.uid}</div><div class="mu">${o.days} days &middot; ${o.target} likes package</div></div>
      ${admin?`<button class="s red" onclick="delOrder('${o.id}')">Delete</button>`:''}</div>
      <div class="mid">
        <div class="ring" style="background:conic-gradient(${col2} ${pct*3.6}deg,#e5e8ee 0deg)"><div>${pct}%</div></div>
        <div class="kv">
          <p><span>Likes sent</span><b>${total}</b></p>
          <p><span>Likes left</span><b>${Math.max(0,o.target-total)}</b></p>
          <p><span>Days left</span><b>${dLeft}</b></p>
        </div>
      </div>
      <span class="badge ${fin?'ok':(over?'late':'go')}">${fin?'Completed':(over?'Days finished - '+left+' likes still pending':'In progress - day '+dDone+' of '+o.days)}</span>
      ${admin?`<div class="row"><input id="in${o.id}" type="number" placeholder="Today's likes (800-1200)" inputmode="numeric">
      <button style="flex:0 0 90px" onclick="addLike('${o.id}')">+ Add</button></div>`:''}
      ${o.entries.length?`<div class="hist">${o.entries.map(e=>`<div class="ent"><span class="mu">${e.date}</span><span><b>+${e.likes}</b>
        ${admin?`<a href="#" onclick="delEntry('${o.id}',${e.t});return false">&#10005;</a>`:''}</span></div>`).join('')}</div>`:''}
    </div>`;
  }).join('');
}
