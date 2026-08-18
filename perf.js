(function(){
  const originalItemHtml = typeof itemHtml==='function' ? itemHtml : null;
  const originalImageHtml = typeof imageHtml==='function' ? imageHtml : null;

  loadItems = async function(){
    items = await rest('knowledge_items?select=id,title,item_type,topic_id,created_at,storage_path,mime_type,original_filename,index_status,index_error&order=created_at.desc&limit=250');
  };

  hydrateImages = async function(){
    const imgs=[...document.querySelectorAll('img[data-path]')];
    const loadOne=async img=>{
      if(img.dataset.loaded||!img.dataset.path)return;
      img.dataset.loaded='1';
      try{img.src=await signedUrl(img.dataset.path,900)}catch{img.dataset.loaded=''}
    };
    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(entries=>{
        entries.forEach(en=>{if(en.isIntersecting){io.unobserve(en.target);loadOne(en.target)}})
      },{rootMargin:'500px'});
      imgs.forEach(img=>io.observe(img));
    }else{
      await Promise.all(imgs.slice(0,16).map(loadOne));
    }
  };

  window.openItem = async function(id){
    let i;
    try{
      const rows=await rest('knowledge_items?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');
      i=rows?.[0];
    }catch(e){alert('שגיאה בטעינת הפריט: '+e.message);return}
    if(!i)return;
    document.querySelector('#drawerTitle').textContent=i.title||'';
    document.querySelector('#drawerMeta').textContent=(i.item_type||'')+(i.topic_id?' · '+topicPath(i.topic_id):'')+' · '+new Date(i.created_at).toLocaleString('he-IL');
    const p=document.querySelector('#drawerPreview');
    const text=i.extracted_text||i.body_text||'';
    p.innerHTML=text?`<div class="panel"><b>תוכן</b><p style="white-space:pre-wrap">${esc(text)}</p></div>`:'';
    if(i.storage_path){
      try{
        const u=await signedUrl(i.storage_path,600);
        if(i.item_type==='image'||i.mime_type?.startsWith('image/'))p.innerHTML=`<img src="${u}" loading="lazy">`+p.innerHTML;
        else if(i.mime_type?.includes('pdf')||i.original_filename?.toLowerCase().endsWith('.pdf'))p.innerHTML=`<iframe src="${u}" loading="lazy"></iframe>`+p.innerHTML;
        document.querySelector('#openSource').onclick=()=>window.open(u,'_blank');
        document.querySelector('#openSource').classList.remove('hidden');
      }catch{document.querySelector('#openSource').classList.add('hidden')}
    }else document.querySelector('#openSource').classList.add('hidden');
    document.querySelector('#backdrop').classList.remove('hidden');
    document.querySelector('#drawer').classList.remove('hidden');
  };

  searchNow = async function(){
    const q=document.querySelector('#search').value.trim();
    showView('all');
    document.querySelector('#allTitle').textContent=q?'תוצאות חיפוש':'All Knowledge';
    if(!q){document.querySelector('#allItems').innerHTML=items.map(itemHtml).join('')||empty('אין עדיין פריטים');return}
    document.querySelector('#allItems').innerHTML='<div class="empty">מחפש…</div>';
    try{
      const res=await rest('rpc/search_knowledge',{method:'POST',body:JSON.stringify({search_text:q,topic_filter:null,match_count:20})});
      document.querySelector('#allItems').innerHTML=(res||[]).map(itemHtml).join('')||empty('לא נמצאו תוצאות');
    }catch(e){document.querySelector('#allItems').innerHTML=empty('שגיאה בחיפוש: '+e.message)}
  };

  runFileUpload = async function(){
    if(!bulkFiles.length)return setStatus('#bulkStatus','בחר קבצים קודם',false);
    const btn=document.querySelector('#bulkUpload');
    btn.disabled=true;
    const topic=document.querySelector('#bulkTopic').value||null;
    let next=0,ok=0,fail=0;
    const imagesForAI=[];
    const worker=async()=>{
      while(true){
        const i=next++;
        if(i>=bulkFiles.length)return;
        const f=bulkFiles[i];
        const type=(f.type||'').startsWith('image/')?'image':'document';
        const path=OWNER+'/'+crypto.randomUUID()+'-'+f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
        try{
          await uploadStorage(f,path,p=>{const bar=document.querySelector('#bar'+i),st=document.querySelector('#fst'+i);if(bar)bar.style.width=p+'%';if(st)st.textContent='מעלה… '+p+'%'});
          const row={user_id:OWNER,topic_id:topic,item_type:type,title:f.name,storage_path:path,mime_type:f.type||null,original_filename:f.name,metadata:{size:f.size,bulk_import:true},index_status:type==='image'?'processing':'ready',index_error:null};
          const created=(await rest('knowledge_items',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)}))[0];
          const st=document.querySelector('#fst'+i);if(st)st.textContent=type==='image'?'הועלה · עיבוד AI ברקע':'הועלה';
          ok++;
          if(type==='image'&&created)imagesForAI.push(created);
        }catch(e){const st=document.querySelector('#fst'+i);if(st)st.textContent='נכשל: '+e.message;fail++}
      }
    };
    await Promise.all(Array.from({length:Math.min(3,bulkFiles.length)},worker));
    btn.disabled=false;
    await reloadAll();
    setStatus('#bulkStatus',`העלאה הסתיימה: ${ok} הצליחו${fail?' · '+fail+' נכשלו':''}. עיבוד AI של תמונות ממשיך ברקע.`,fail===0);
    if(imagesForAI.length){
      let aiNext=0;
      const aiWorker=async()=>{while(true){const i=aiNext++;if(i>=imagesForAI.length)return;await analyzeImage(imagesForAI[i]).catch(()=>{})}};
      Promise.all(Array.from({length:Math.min(2,imagesForAI.length)},aiWorker)).then(()=>reloadAll()).catch(()=>{});
    }
  };

  function wirePerf(){
    const b=document.querySelector('#bulkUpload');if(b)b.onclick=runFileUpload;
    const s=document.querySelector('#searchBtn');if(s)s.onclick=searchNow;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wirePerf);else wirePerf();
})();
