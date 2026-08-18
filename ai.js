const AI_URL=URL+'/functions/v1/my-brain-ai';
let lastSources=[];
function aiTopicOptions(){
  const sel=document.querySelector('#askTopic');
  if(!sel)return;
  const current=sel.value;
  const html='<option value="">כל הידע</option>'+topics.map(t=>`<option value="${t.id}">${esc(topicPath(t.id))}</option>`).join('');
  if(sel.innerHTML!==html) sel.innerHTML=html;
  if(current && [...sel.options].some(o=>o.value===current)) sel.value=current;
}
function renderAiSources(src){
  lastSources=src||[];
  const box=document.querySelector('#aiSources');
  if(!box)return;
  box.innerHTML=lastSources.length?lastSources.map(s=>`<button class="sourcecard" onclick="openItem('${s.id}')"><b>[${s.n}] ${esc(s.title)}</b><span class="small muted">${esc(s.item_type||'')}${s.original_filename?' · '+esc(s.original_filename):''}</span><span class="small">${esc((s.excerpt||'').slice(0,220))}</span></button>`).join(''):'<div class="empty">אין מקורות לתשובה.</div>';
}
async function askMyBrain(){
  const q=document.querySelector('#askQ').value.trim();
  if(!q)return;
  aiTopicOptions();
  const btn=document.querySelector('#askBtn'),ans=document.querySelector('#aiAnswer'),src=document.querySelector('#aiSources');
  btn.disabled=true;
  ans.textContent='חושב ומחפש בתוך הידע שלך…';
  src.innerHTML='<div class="empty">מחפש מקורות…</div>';
  try{
    const r=await authFetch(AI_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,topic_id:document.querySelector('#askTopic').value||null})});
    const j=await parse(r);
    ans.textContent=j.answer||'לא התקבלה תשובה.';
    renderAiSources(j.sources||[]);
  }catch(e){
    ans.textContent='שגיאה: '+e.message;
    src.innerHTML='<div class="empty">לא נטענו מקורות.</div>';
  }finally{btn.disabled=false}
}
function initAI(){
  const btn=document.querySelector('#askBtn'),q=document.querySelector('#askQ');
  if(btn)btn.onclick=askMyBrain;
  if(q)q.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();askMyBrain()}};
  aiTopicOptions();
  setTimeout(aiTopicOptions,600);
  setTimeout(aiTopicOptions,1800);
}
document.addEventListener('DOMContentLoaded',initAI);
