const AI_URL=URL+'/functions/v1/my-brain-ai';
let lastSources=[];

window.openAskView=function(){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  const view=document.querySelector('[data-view="ask"]');
  if(view)view.classList.add('active');
  document.querySelectorAll('[data-nav]').forEach(x=>x.classList.remove('active'));
  const nav=document.querySelector('[data-nav="ask"]');
  if(nav)nav.classList.add('active');