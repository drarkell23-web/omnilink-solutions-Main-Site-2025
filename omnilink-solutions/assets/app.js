
// Simple hash router and shared helpers
const $ = (sel, el=document)=> el.querySelector(sel);
const $$ = (sel, el=document)=> Array.from(el.querySelectorAll(sel));

function toast(msg, ms=2200){
  let t = document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(), ms);
}

// Lead storage
const Leads = {
  all(){ return JSON.parse(localStorage.getItem('omni_leads')||'[]');},
  add(lead){ const list=this.all(); list.unshift({...lead, id:crypto.randomUUID(), ts:Date.now(), status:'New'});
    localStorage.setItem('omni_leads', JSON.stringify(list));},
  update(id, patch){ const list=this.all().map(l=> l.id===id? {...l, ...patch}:l);
    localStorage.setItem('omni_leads', JSON.stringify(list));},
};

// Render service chips from catalog
function renderServiceGrid(target){
  const wrap = document.createElement('div');
  SERVICE_CATALOG.forEach(group=>{
    const title = document.createElement('div'); title.className='section-title'; title.textContent=group.cat;
    wrap.appendChild(title);
    const grid = document.createElement('div'); grid.className='grid';
    group.items.forEach(svc=>{
      const b = document.createElement('button');
      b.className='service'; b.textContent = svc;
      b.addEventListener('click', ()=> openChat({ presetService: svc }));
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
  });
  target.innerHTML = ''; target.appendChild(wrap);
}

// Chatbot (lightweight, local-only)
let CHAT_OPEN=false;
function openChat(opts={}){
  CHAT_OPEN = true;
  const panel = document.createElement('div'); panel.className='chat-panel';
  panel.innerHTML = `
    <div class="chat-header">
      <strong>Fixmate Lead Bot</strong>
      <div class="small-note">Local demo</div>
      <button class="btn small" id="chat-close">Close</button>
    </div>
    <div class="chat-body" id="chat-body"></div>
    <div class="chat-footer">
      <input id="chat-input" class="input-rounded" placeholder="Type your message..." />
      <button class="btn primary" id="chat-send">Send</button>
    </div>`;
  document.body.appendChild(panel);
  $('#chat-close', panel).onclick=()=>{ panel.remove(); CHAT_OPEN=false; };
  $('#chat-send', panel).onclick=()=> sendMsg();
  $('#chat-input', panel).addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendMsg(); });
  const body = $('#chat-body', panel);

  function bot(t){ const m=document.createElement('div'); m.className='msg bot'; m.textContent=t; body.appendChild(m); body.scrollTop=body.scrollHeight; }
  function user(t){ const m=document.createElement('div'); m.className='msg user'; m.textContent=t; body.appendChild(m); body.scrollTop=body.scrollHeight; }
  function sendMsg(){
    const v = $('#chat-input', panel).value.trim(); if(!v) return; $('#chat-input', panel).value=''; user(v); step(v);
  }

  // Conversation state
  const state = { service: opts.presetService||'', suburb:'', name:'', phone:'', notes:'' };

  // Steps
  let idx = 0;
  const steps = [
    ()=> bot(`Hi! What service do you need${state.service? ` (I noted "${state.service}")`:''}?`),
    (msg)=> { if(!state.service){ state.service = msg; } bot('What area/suburb are you in?'); idx++; },
    (msg)=> { state.suburb = msg; bot('Your name?'); idx++; },
    (msg)=> { state.name = msg; bot('Best contact number?'); idx++; },
    (msg)=> {
      if(!/^0\d{9}$/.test(msg.replace(/\s/g,''))){ bot('Please send a valid SA number, e.g., 0821234567'); return; }
      state.phone = msg; bot('Any notes for the contractor? (or type "skip")'); idx++;
    },
    (msg)=> { if(msg.toLowerCase()!=='skip') state.notes = msg; Leads.add({ ...state, source:'chat' });
      bot('All set! A contractor will contact you shortly. You can close this window.');
      toast('Lead captured locally'); idx++; }
  ];

  // start
  steps[0]();
  function step(msg){ if(idx===0){ idx=1; steps[1](msg); } else if(idx===1){ steps[2](msg); }
    else if(idx===2){ steps[3](msg); } else if(idx===3){ steps[4](msg); }
    else if(idx===4){ steps[5](msg); }
  }
}

// Populate dashboard tables
function renderLeadTable(tbody){
  const leads = Leads.all();
  tbody.innerHTML = leads.map(l=> `
    <tr>
      <td>${new Date(l.ts).toLocaleString()}</td>
      <td>${l.name}</td>
      <td>${l.phone}</td>
      <td>${l.suburb}</td>
      <td>${l.service}</td>
      <td><span class="status ${l.status==='New'?'new':''}">${l.status}</span></td>
      <td><button class="btn small" data-id="${l.id}">Mark Contacted</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('button').forEach(b=> b.onclick = ()=>{
    Leads.update(b.dataset.id, { status:'Contacted' });
    toast('Lead marked contacted'); renderLeadTable(tbody);
  });
}

// Simple auth demo (local only)
const Auth = {
  login(email, pass){
    const ok = email && pass && pass.length>=4; // placeholder
    if(ok) localStorage.setItem('omni_user', JSON.stringify({email}));
    return ok;
  },
  user(){ return JSON.parse(localStorage.getItem('omni_user')||'null');},
  logout(){ localStorage.removeItem('omni_user'); }
};

// Confetti util (lazy minimal burst)
function confettiBurst(){
  const el = document.createElement('div');
  el.style.position='fixed'; el.style.inset='0'; el.style.pointerEvents='none';
  const n=50; for(let i=0;i<n;i++){ const p=document.createElement('div');
    p.style.position='absolute'; p.style.width='8px'; p.style.height='8px';
    p.style.background = `hsl(${Math.random()*360},90%,60%)`;
    p.style.top = '50%'; p.style.left = '50%';
    const tx = (Math.random()*2-1)*300; const ty = (Math.random()*-1)*400-60;
    p.animate([{transform:'translate(0,0)'},{transform:`translate(${tx}px, ${ty}px)`}], {duration: 800+Math.random()*900, fill:'forwards'});
    el.appendChild(p);
  }
  document.body.appendChild(el); setTimeout(()=>el.remove(), 1800);
}
